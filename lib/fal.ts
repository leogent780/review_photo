import fs from 'fs';
import path from 'path';
import { fal } from '@fal-ai/client';
import sharp from 'sharp';

function getApiKey(): string {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/FAL_KEY=([^\r\n]+)/);
    if (match) return match[1].replace(/[^\x20-\x7E]/g, '').trim();
  }
  const fromEnv = process.env.FAL_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
  if (!fromEnv) throw new Error('FAL_KEY is not set');
  return fromEnv;
}

interface GenerateOptions {
  referenceImagePath: string;
  prompt: string;
  productImagePaths?: string[];
}

interface GenerateResult {
  jobId: string;
  status: string;
  outputUrl?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = getApiKey();
  fal.config({ credentials: apiKey });

  // Resize to max 2048px and convert to JPEG to avoid 422 validation errors
  const resizedBytes = await sharp(options.referenceImagePath)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const blob = new Blob([new Uint8Array(resizedBytes)], { type: 'image/jpeg' });
  const uploadedUrl = await fal.storage.upload(blob);
  fs.writeFileSync('fal-debug.txt', `uploaded: ${uploadedUrl}\n`, { flag: 'w' });

  // Upload up to 2 product images (multiple angles of same product for better 3D understanding)
  const imageUrls: string[] = [uploadedUrl];
  if (options.productImagePaths && options.productImagePaths.length > 0) {
    for (const pPath of options.productImagePaths.slice(0, 2)) {
      const pBytes = await sharp(pPath)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      const pBlob = new Blob([new Uint8Array(pBytes)], { type: 'image/jpeg' });
      const pUrl = await fal.storage.upload(pBlob);
      imageUrls.push(pUrl);
    }
  }

  // xai/grok-imagine-image/edit — confirmed best result from fal.ai sandbox
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: imageUrls,
      prompt: options.prompt,
    } as any,
  }) as any;

  // Write full response to debug file
  fs.writeFileSync('fal-debug.txt', `uploaded: ${uploadedUrl}\nresult: ${JSON.stringify(result, null, 2).slice(0, 2000)}\n`);

  // Try all possible URL locations in response
  const outputUrl =
    result?.data?.images?.[0]?.url ??
    result?.data?.image?.url ??
    result?.data?.output?.[0] ??
    result?.images?.[0]?.url ??
    result?.image?.url ??
    result?.output?.[0];

  if (!outputUrl) {
    throw new Error(`이미지 URL 없음 — 응답: ${JSON.stringify(result).slice(0, 500)}`);
  }

  return {
    jobId: result?.requestId || result?.data?.request_id || crypto.randomUUID(),
    status: 'completed',
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
