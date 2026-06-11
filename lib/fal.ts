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

  // Upload image to fal.ai storage
  const imageBytes = fs.readFileSync(options.referenceImagePath);
  const ext = path.extname(options.referenceImagePath).slice(1).toLowerCase() || 'jpeg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob = new Blob([imageBytes], { type: mimeType });
  const uploadedUrl = await fal.storage.upload(blob);
  fs.writeFileSync('fal-debug.txt', `uploaded: ${uploadedUrl}\n`, { flag: 'w' });

  // xai/grok-imagine-image/edit — confirmed best result from fal.ai sandbox
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: [uploadedUrl],
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
