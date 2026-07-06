import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/session';
import { limiters, applyRateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { planId, brokerId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 20 req / hora por brokerId
  const limited = await applyRateLimit(limiters.aiMagicWrite, `magic-write:${brokerId}`);
  if (limited) return limited;

  const { canUseAI } = await import('@/lib/limits');
  if (!canUseAI(planId!)) {
    return NextResponse.json({ success: false, error: "Upgrade to Premium required" }, { status: 403 });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: "Texto vazio" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "Chave da OpenAI não configurada" }, { status: 500 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo rápido e barato
      messages: [
        {
          role: "system",
          content: "Você é um assistente de reescrita para corretores de imóveis de alto padrão. Sua tarefa é pegar a mensagem curta, coloquial ou mal escrita pelo corretor e transformá-la em uma resposta polida, profissional, amigável e extremamente persuasiva para ser enviada a um cliente via WhatsApp. Mantenha a mensagem direta, não alongue demais e não invente informações que não estavam no texto original. Retorne APENAS a mensagem reescrita."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const rewrittenText = response.choices[0].message.content?.trim();

    return NextResponse.json({ success: true, text: rewrittenText });

  } catch (error: any) {
    console.error("[MAGIC WRITE ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao gerar texto com IA" }, { status: 500 });
  }
}
