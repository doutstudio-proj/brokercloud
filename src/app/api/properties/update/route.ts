import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const { propertyId, data } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 });
    }

    const updatedData: any = { ...data };
    
    // Remover campos que não devem ser atualizados diretamente
    delete updatedData.id;
    delete updatedData.brokerId;
    delete updatedData.createdAt;
    delete updatedData.updatedAt;

    if (updatedData.price !== undefined) updatedData.price = Number(updatedData.price);
    if (updatedData.bedrooms !== undefined) updatedData.bedrooms = Number(updatedData.bedrooms);
    if (updatedData.area !== undefined) updatedData.area = Number(updatedData.area);
    if (updatedData.commission !== undefined && updatedData.commission !== null) updatedData.commission = Number(updatedData.commission);
    if (updatedData.galleryUrls === "") updatedData.galleryUrls = null;
    if (updatedData.videoUrl === "") updatedData.videoUrl = null;

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: updatedData
    });

    return NextResponse.json({ success: true, property });
  } catch (error: any) {
    console.error("Update Property Error:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar imóvel" }, { status: 500 });
  }
}
