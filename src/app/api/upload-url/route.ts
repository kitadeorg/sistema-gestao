
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// 1. Inicializa o cliente S3 para o R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { fileName, fileType, folder = 'condominio-logos' } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Nome e tipo do ficheiro são obrigatórios.' }, { status: 400 });
    }

    const uniqueKey = `${folder}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });
    
    // 2. Gera o URL de upload seguro
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutos de validade

    // 3. Gera o URL público final da imagem
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueKey}`;

    return NextResponse.json({ uploadUrl, publicUrl });

  } catch (error) {
    console.error('Erro ao gerar URL de upload:', error);
    return NextResponse.json({ error: 'Falha ao gerar URL de upload.' }, { status: 500 });
  }
}