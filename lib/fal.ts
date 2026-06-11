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

  const imageBytes = fs.readFileSync(options.referenceImagePath);
  const ext = path.extname(options.referenceImagePath).replace('.', '') || 'jpeg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${imageBytes.toString('base64')}`;

  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      image_url: dataUrl,
      prompt: options.prompt,
      guidance_scale: 2.5,
      num_images: 1,
      safety_tolerance: 5,
    },
  }) as { data?: { images?: { url: string }[] }; requestId?: string };

  const outputUrl = result?.data?.images?.[0]?.url;

  if (!outputUrl) {
    throw new Error('이미지 생성 실패');
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
