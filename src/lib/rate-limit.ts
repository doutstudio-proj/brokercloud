/**
 * Rate Limiter Centralizado — Brokercloud
 *
 * Suporta 3 modos com prioridade automática via env vars:
 *
 *  1. UPSTASH (cloud):
 *       UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *       → Redis HTTP REST API. Ideal para Vercel, Edge, serverless.
 *
 *  2. REDIS SELF-HOSTED (seu servidor):
 *       REDIS_URL="redis://localhost:6379"
 *       → Conexão TCP padrão via ioredis. Ideal para VPS/Docker.
 *
 *  3. IN-MEMORY (dev / fallback):
 *       Sem nenhuma env var configurada.
 *       → EphemeralCache (Map em memória). Reseta ao reiniciar.
 *
 * Zero mudanças de código ao trocar de modo — só configurar o .env.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// EphemeralCache compartilhado (fallback in-memory)
// ---------------------------------------------------------------------------
const ephemeralCache = new Map();

// ---------------------------------------------------------------------------
// Adapter: converte ioredis para a interface esperada pelo @upstash/ratelimit
//
// O @upstash/ratelimit usa internamente:
//   - redis.eval(script, { keys, arguments })   ← sliding window (Lua)
//   - redis.get / redis.set                      ← fixed window
//   - redis.pipeline()...exec()                  ← operações em batch
// ---------------------------------------------------------------------------
function createIoRedisAdapter(url: string) {
  const client = new IORedis(url, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 2,
  });

  client.on('error', (err) => {
    // Não crashar o servidor se o Redis ficar fora
    console.error('[Rate Limit] Erro de conexão com Redis self-hosted:', err.message);
  });

  return {
    // Executa script Lua (usado pelo sliding window)
    async eval(script: string, keys: string[] = [], args: string[] = []) {
      return client.eval(script, keys.length, ...keys, ...args);
    },

    // Executa script Lua otimizado (evalsha - exigido pelas novas versões do ratelimit)
    async evalsha(sha: string, keys: string[] = [], args: string[] = []) {
      return client.evalsha(sha, keys.length, ...keys, ...args);
    },

    // Leitura de chave simples
    async get(key: string) {
      return client.get(key);
    },

    // Escrita com TTL opcional em milissegundos
    async set(key: string, value: unknown, opts?: { px?: number; ex?: number }) {
      const val = String(value);
      if (opts?.px) return client.set(key, val, 'PX', opts.px);
      if (opts?.ex) return client.set(key, val, 'EX', opts.ex);
      return client.set(key, val);
    },

    // Pipeline encadeável (para operações em batch)
    pipeline() {
      const pipe = client.pipeline();
      const self: Record<string, any> = {
        exec: async () => {
          const results = await pipe.exec();
          return results?.map(([, result]) => result) ?? [];
        },
      };
      // Proxy: qualquer chamada de método é encaminhada para o pipeline
      return new Proxy(self, {
        get(target, prop: string) {
          if (prop === 'exec') return target.exec;
          return (...cmdArgs: unknown[]) => {
            (pipe as any)[prop](...cmdArgs);
            return self; // retorna self para encadeamento
          };
        },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Factory: detecta o modo e cria o Ratelimit correto
// ---------------------------------------------------------------------------
type RLWindow = `${number} s` | `${number} m` | `${number} h` | `${number} d`;

function createLimiter(limit: number, window: RLWindow): Ratelimit {
  // Modo 1: Upstash cloud (REST API)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Ratelimit({
      redis: new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(limit, window),
      analytics: true,
      prefix: 'Brokercloud:rl',
    });
  }

  // Modo 2: Redis self-hosted (TCP via ioredis)
  if (process.env.REDIS_URL) {
    return new Ratelimit({
      redis: createIoRedisAdapter(process.env.REDIS_URL) as any,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: 'Brokercloud:rl',
    });
  }

  // Modo 3: In-memory EphemeralCache (dev / fallback)
  return new Ratelimit({
    redis: null as any,
    limiter: Ratelimit.slidingWindow(limit, window),
    ephemeralCache,
    prefix: 'Brokercloud:rl',
  });
}

// ---------------------------------------------------------------------------
// Limiters pré-configurados por tipo de operação
// ---------------------------------------------------------------------------
export const limiters = {
  /** Registro de nova conta — 5 tentativas / hora por IP */
  register: createLimiter(5, '1 h'),

  /** Login (NextAuth) — 10 tentativas / 15 min por IP */
  login: createLimiter(10, '15 m'),

  /** QR Code Evolution GO (operação pesada) — 5 req / 10 min por brokerId */
  evolutionQrCode: createLimiter(5, '10 m'),

  /** IA Magic Write (GPT-4o-mini) — 20 req / hora por brokerId */
  aiMagicWrite: createLimiter(20, '1 h'),

  /** IA Summary (GPT-4o) — 10 req / hora por brokerId (mais caro) */
  aiSummary: createLimiter(10, '1 h'),

  /** Envio de mensagem WhatsApp — 60 req / minuto por brokerId */
  messageSend: createLimiter(60, '1 m'),

  /** Upload de arquivo para R2 — 30 req / 10 min por brokerId */
  upload: createLimiter(30, '10 m'),

  /** Criação manual de Lead — 100 req / hora por brokerId */
  leadCreate: createLimiter(100, '1 h'),

  /** Webhook Evolution GO — 200 req / minuto por IP (picos esperados) */
  webhookEvolution: createLimiter(200, '1 m'),
} as const;

// ---------------------------------------------------------------------------
// Helper: extrai o IP real do cliente
// Ordem: Cloudflare → Nginx → X-Forwarded-For → localhost
// ---------------------------------------------------------------------------
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ---------------------------------------------------------------------------
// Helper: aplica rate limit e retorna 429 se excedido, null se ok
//
// Uso simples em qualquer rota:
//   const limited = await applyRateLimit(limiters.register, ip);
//   if (limited) return limited;
// ---------------------------------------------------------------------------
export async function applyRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<NextResponse | null> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      const resetInSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      const minutes = Math.ceil(resetInSeconds / 60);
      const message =
        resetInSeconds < 60
          ? `Muitas requisições. Tente novamente em ${resetInSeconds} segundo${resetInSeconds !== 1 ? 's' : ''}.`
          : `Muitas requisições. Tente novamente em ${minutes} minuto${minutes !== 1 ? 's' : ''}.`;

      return NextResponse.json(
        { success: false, error: message },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
            'Retry-After': String(resetInSeconds),
          },
        }
      );
    }

    return null; // dentro do limite → continuar
  } catch (err) {
    // Se o Redis cair, não derrubar a rota — apenas logar e deixar passar
    console.error('[Rate Limit] Erro ao verificar limite:', err);
    return null;
  }
}
