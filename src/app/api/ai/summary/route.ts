import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { limiters, applyRateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 10 req / hora por brokerId (GPT-4o é mais caro)
  const limited = await applyRateLimit(limiters.aiSummary, `ai-summary:${brokerId}`);
  if (limited) return limited;

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ success: false, error: "Lead ID obrigatório" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "Chave da OpenAI não configurada" }, { status: 500 });
    }

    // Verifica que o lead pertence ao broker autenticado (IDOR + custo protection)
    const lead = await prisma.lead.findFirst({ where: { id: leadId, brokerId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { timestamp: 'asc' },
      take: 50
    });

    if (messages.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma mensagem encontrada para resumir" }, { status: 400 });
    }

    const chatHistory = messages.map(m => {
      const role = m.fromMe ? 'Corretor' : 'Cliente';
      const text = m.mediaType ? `[Mídia: ${m.mediaType}] ${m.body || ''}` : m.body;
      return `${role}: ${text}`;
    }).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um assistente estratégico para corretores de imóveis de alto padrão.
Sua tarefa é analisar o histórico de conversa entre o Corretor e o Cliente e gerar um resumo em tópicos focados em VENDAS.

Estruture a sua resposta EXATAMENTE com os seguintes tópicos (use emojis):
- 🎯 Intenção de Compra (Ex: Procurando casa para investir, Moradia imediata)
- 💰 Orçamento Estimado (Se mencionado, caso contrário diga "Não informado")
- ⭐ Preferências do Imóvel (Tamanho, localização, detalhes)
- ⚠️ Objeções ou Pontos Críticos (O que o cliente não gostou, dúvidas frequentes)
- 📌 Próximo Passo Sugerido (O que o corretor deve fazer agora)

Seja extremamente conciso, direto ao ponto e não invente informações. Se algo não foi falado, apenas não cite.`
        },
        { role: "user", content: `Aqui está o histórico de mensagens:\n\n${chatHistory}` }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = response.choices[0].message.content?.trim();

    if (summary) {
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const summaryWithDate = `[Último resumo gerado em ${dateStr} às ${timeStr}]\n\n${summary}`;

      await prisma.lead.update({ where: { id: leadId }, data: { aiSummary: summaryWithDate } });
      return NextResponse.json({ success: true, summary: summaryWithDate });
    } else {
      throw new Error("Resposta vazia da IA");
    }
  } catch (error: any) {
    console.error("[AI SUMMARY ERROR]", error);
    return NextResponse.json({ success: false, error: "Erro ao gerar resumo com IA" }, { status: 500 });
  }
}
