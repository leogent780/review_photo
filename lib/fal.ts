import fs from 'fs';
import path from 'path';
import { fal } from '@fal-ai/client';

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
}

interface GenerateResult {
  jobId: string;
  status: string;
  outputUrl?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = getApiKey();
  fal.config({ credentials: apiKey });

  // Upload image to fal.ai storage first
  const imageBytes = fs.readFileSync(options.referenceImagePath);
  const ext = path.extname(options.referenceImagePath).slice(1).toLowerCase() || 'jpeg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob = new Blob([imageBytes], { type: mimeType });
  const uploadedUrl = await fal.storage.upload(blob);
  console.log('[fal] uploaded:', uploadedUrl);

  // FLUX Kontext — true image editing model (image→image)
  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      image_url: uploadedUrl,
      prompt: options.prompt,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: '6',
      output_format: 'jpeg',
    },
  }) as any;

  console.log('[fal kontext result]', JSON.stringify({
    images: result?.data?.images,
    keys: Object.keys(result || {}),
  }));

  const outputUrl = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url;
  if (!outputUrl) {
    throw new Error(`이미지 생성 실패 — 응답: ${JSON.stringify(result).slice(0, 200)}`);
  }

  return {
    jobId: result?.requestId || crypto.randomUUID(),
    status: 'completed',
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
