import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { limiters, getClientIp, applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 5 tentativas / hora por IP
  const ip = getClientIp(request);
  const limited = await applyRateLimit(limiters.register, `register:${ip}`);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e número.' },
        { status: 400 }
      );
    }

    // Verifica se email já está em uso
    const existing = await prisma.broker.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este email já está cadastrado." },
        { status: 409 }
      );
    }

    // Hash da senha com bcrypt (salt 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Cria o novo Broker com 3 dias de Trial
    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const broker = await prisma.broker.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        planId: "TRIAL",
        trialEndsAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ ok: true, broker }, { status: 201 });
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
