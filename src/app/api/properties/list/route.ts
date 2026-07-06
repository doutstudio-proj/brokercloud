import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const properties = await prisma.property.findMany({
      where: { brokerId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, properties });
  } catch (error: any) {
    console.error("GET Properties Error:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar imóveis" }, { status: 500 });
  }
}
