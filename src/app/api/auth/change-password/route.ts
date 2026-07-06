import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e número.' },
        { status: 400 }
      );
    }

    const broker = await prisma.broker.findUnique({
      where: { id: session.user.id },
    });

    if (!broker || !broker.passwordHash) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, broker.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.broker.update({
      where: { id: broker.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
