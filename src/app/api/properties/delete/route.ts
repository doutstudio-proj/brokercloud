import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function DELETE(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 });
    }

    // Garante que o imóvel pertence ao broker autenticado (IDOR protection)
    const property = await prisma.property.findFirst({ where: { id: propertyId, brokerId } });
    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado" }, { status: 404 });
    }

    await prisma.property.delete({ where: { id: propertyId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Property Error:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir imóvel" }, { status: 500 });
  }
}
