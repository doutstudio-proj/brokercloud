import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token e senha são obrigatórios." }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e número.' },
        { status: 400 }
      );
    }

    // Encontra o usuário pelo token e verifica se não expirou
    const broker = await prisma.broker.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!broker || !broker.resetPasswordExpires || broker.resetPasswordExpires < new Date()) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user and invalidate token
    await prisma.broker.update({
      where: { id: broker.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
