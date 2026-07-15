import { NextResponse } from 'next/server';
import { uploadMediaToR2 } from '@/lib/storage';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';
import { limiters, applyRateLimit } from '@/lib/rate-limit';

const uploadSchema = z.object({
  base64Data: z.string().min(1),
  fileName: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._\-\s()\[\]{},&!'áàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ+@#~%=]+$/, 'Nome de arquivo contém caracteres inválidos'),
  mimeType: z.string().refine((val: string) =>
    val.startsWith('image/') ||
    val.startsWith('video/') ||
    val.startsWith('audio/') ||
    val.startsWith('application/pdf') ||
    val === 'application/msword' ||
    val === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    val === 'application/vnd.ms-excel' ||
    val === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    val === 'application/vnd.ms-powerpoint' ||
    val === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    val === 'text/plain' ||
    val === 'text/csv' ||
    val === 'application/zip' ||
    val === 'application/x-zip-compressed' ||
    val === 'application/x-rar-compressed' ||
    val === 'application/x-7z-compressed',
    { message: "Tipo de arquivo não permitido. Apenas imagens, áudios, vídeos e documentos comuns são permitidos." }
  ),
  folder: z.string().optional(),
});

export async function POST(request: Request) {
  const { brokerId, error } = await requireAuth();
  if (error) return error;

  // Rate limit: 30 uploads / 10 min por brokerId (anti-abuso de storage)
  const limited = await applyRateLimit(limiters.upload, `upload:${brokerId}`);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }, { status: 400 });
    }

    const { base64Data, fileName, mimeType, folder } = parsed.data;

    // Check size limit (approx 20MB file is ~26.6MB base64)
    if (base64Data.length > 27 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Arquivo muito grande (máximo ~20MB)' }, { status: 400 });
    }

    const finalFolder = `${brokerId}/${folder || 'misc'}`;
    const publicUrl = await uploadMediaToR2(base64Data, fileName, mimeType, finalFolder);

    if (publicUrl) {
      return NextResponse.json({ success: true, url: publicUrl });
    } else {
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error("Erro no /api/upload:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
