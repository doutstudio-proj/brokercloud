import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório." }, { status: 400 });
    }

    const broker = await prisma.broker.findUnique({
      where: { email },
    });

    if (!broker) {
      // Retornar sucesso genérico mesmo se não existir para não expor quem tem conta
      return NextResponse.json({ success: true });
    }

    // Generate token and expiry (1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); 

    // Update broker in database
    await prisma.broker.update({
      where: { id: broker.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      },
    });

    // Send Email
    const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    const { error: emailError } = await resend.emails.send({
      from: "Brokercloud <onboarding@resend.dev>", // E-mail de testes gratuito do Resend
      to: broker.email,
      subject: "Redefinição de Senha - Brokercloud",
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0a6136;">Brokercloud</h2>
          <p>Você solicitou a redefinição de sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #0a6136; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px; margin-bottom: 16px;">
            Redefinir Senha
          </a>
          <p style="font-size: 14px; color: #666;">Se você não solicitou essa alteração, ignore este e-mail.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend API Error:", emailError);
      // fallback in dev mode: we log the URL so the dev can click it
      console.log("=========================================");
      console.log("RECOVERY URL:", resetUrl);
      console.log("=========================================");
      return NextResponse.json({ error: "Falha ao enviar e-mail. A chave do Resend é válida?" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
