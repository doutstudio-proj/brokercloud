import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function POST(req: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await req.json();

    const { checkPropertyLimit } = await import('@/lib/limits');
    const canCreate = await checkPropertyLimit(brokerId);
    if (!canCreate) {
      return NextResponse.json({ success: false, error: "Limite de imóveis atingido para o seu plano." }, { status: 403 });
    }

    const newProperty = await prisma.property.create({
      data: {
        title: data.title,
        description: data.description || "",
        price: Number(data.price),
        location: data.location || "",
        bedrooms: Number(data.bedrooms || 0),
        area: Number(data.area || 0),
        commission: data.commission ? Number(data.commission) : null,
        status: data.status || "AVAILABLE",
        imageUrl: data.imageUrl || null,
        galleryUrls: data.galleryUrls || null,
        videoUrl: data.videoUrl || null,
        brokerId
      }
    });

    return NextResponse.json({ success: true, property: newProperty });
  } catch (error: any) {
    console.error("Create Property Error:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar imóvel" }, { status: 500 });
  }
}
