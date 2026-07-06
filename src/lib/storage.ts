import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const accountId = process.env.R2_ACCOUNT_ID?.trim(); // Apenas se usar Cloudflare
const awsRegion = process.env.AWS_REGION?.trim(); // Se usar AWS
const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)?.trim();
const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY)?.trim();
const bucketName = (process.env.AWS_BUCKET_NAME || process.env.R2_BUCKET_NAME)?.trim();
const publicUrl = (process.env.AWS_PUBLIC_URL || process.env.R2_PUBLIC_URL)?.trim();

// Se tiver AWS_REGION, instancia pro S3 padrão da Amazon. Se não, usa o Cloudflare R2.
const s3Config: any = {
  region: awsRegion || "auto",
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
};

if (!awsRegion && accountId) {
  // Configuração específica para Cloudflare R2
  s3Config.endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  s3Config.forcePathStyle = true;
}

const s3Client = new S3Client(s3Config);

export async function uploadMediaToR2(
  base64Data: string, 
  fileName: string, 
  mimeType: string,
  folder: string = "misc"
): Promise<string | null> {
  const buffer = Buffer.from(base64Data, "base64");
  
  // Clean filename to prevent issues
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
  const objectKey = `${folder}/${Date.now()}_${safeFileName}`;

  if (bucketName && accessKeyId) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);
      return `${publicUrl}/${objectKey}`;
    } catch (error) {
      console.error("Erro no upload R2 (Caindo para armazenamento local):", error);
    }
  }

  // Fallback Local (Se o R2 falhar ou não estiver configurado, salva no próprio PC)
  try {
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    const localFilePath = path.join(publicUploadsDir, objectKey);
    
    // Cria as pastas necessárias (ex: public/uploads/chat_media/123)
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    
    fs.writeFileSync(localFilePath, buffer);
    return `/uploads/${objectKey}`;
  } catch (localError) {
    console.error("Erro ao salvar arquivo localmente:", localError);
    return null;
  }
}

