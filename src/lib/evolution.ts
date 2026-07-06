// src/lib/evolution.ts
export interface SendMessagePayload {
  number: string;
  text: string;
  delay?: number;
}

const getEvolutionUrl = () => process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const getGlobalApiKey = () => process.env.EVOLUTION_API_KEY || 'SUA_API_KEY_AQUI';

export class EvolutionService {
  private instanceName: string;
  // O Token da instância (usado como API Key na Evolution GO)
  private get instanceToken() {
    return `token-${this.instanceName}`;
  }

  constructor(instanceName: string) {
    this.instanceName = instanceName;
  }

  // Headers para rotas globais (como Criar Instância)
  private get globalHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': getGlobalApiKey(),
    };
  }

  // Headers para rotas da instância (Evolution GO exige o token da instância na apikey)
  private get instanceHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.instanceToken,
    };
  }

  /**
   * Cria uma nova instância na Evolution GO (POST /instance/create)
   */
  async createInstance() {
    const response = await fetch(`${getEvolutionUrl()}/instance/create`, {
      method: 'POST',
      headers: this.globalHeaders, // Usa a Global API Key
      body: JSON.stringify({
        instanceName: this.instanceName,
        name: this.instanceName, // Suporte V1/V2/V3
        token: this.instanceToken, // OBRIGATÓRIO na GO
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
    
    const text = await response.text();
    try { return JSON.parse(text); } 
    catch { return { error: text }; }
  }

  /**
   * Conecta a instância e configura os webhooks (POST /instance/connect)
   * @param webhookUrl URL pública para receber os eventos
   * @param webhookHeaders Headers extras a serem passados para a Evolution GO junto com a URL
   */
  async connectInstance(webhookUrl: string, webhookHeaders?: Record<string, string>) {
    // Tenta configurar o webhook via /webhook/set (Evolution V1/V2 compat)
    await fetch(`${getEvolutionUrl()}/webhook/set/${this.instanceName}`, {
      method: 'POST',
      headers: this.globalHeaders,
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          headers: webhookHeaders || {}, // Headers customizados (incluindo o secret)
          webhookByEvents: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CONNECTION_UPDATE",
            "CALL"
          ]
        }
      })
    });

    const response = await fetch(`${getEvolutionUrl()}/instance/connect`, {
      method: 'POST',
      headers: this.instanceHeaders,
      body: JSON.stringify({
        immediate: true,
        webhookUrl: webhookUrl,
        webhookHeaders: webhookHeaders || {}, // Headers extras para a Evolution GO
        subscribe: [
          'MESSAGE',
          'SEND_MESSAGE',
          'CONNECTION',
          'connection.update'
        ]
      }),
    });
    
    const text = await response.text();
    try { return JSON.parse(text); } 
    catch { return { error: text }; }
  }

  /**
   * Busca o QR Code da Instância (GET /instance/qr)
   */
  async getQRCode() {
    const response = await fetch(`${getEvolutionUrl()}/instance/qr`, {
      method: 'GET',
      headers: this.instanceHeaders, // Usa o TOKEN da Instância
    });
    
    const text = await response.text();
    try { return JSON.parse(text); } 
    catch { return { error: text }; }
  }

  /**
   * Envia uma mensagem de texto simples (POST /send/text)
   */
  async sendTextMessage(payload: SendMessagePayload) {
    const response = await fetch(`${getEvolutionUrl()}/message/sendText/${this.instanceName}`, {
      method: 'POST',
      headers: this.instanceHeaders, // Usa o TOKEN da Instância
      body: JSON.stringify({
        number: payload.number,
        options: {
          delay: payload.delay || 1200,
          presence: 'composing',
        },
        textMessage: {
          text: payload.text,
        },
      }),
    });
    return response.json();
  }
}
