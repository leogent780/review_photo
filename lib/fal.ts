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

  // ControlNet: extracts structure (pose/depth/edges) from original and preserves it
  // Only appearance changes, composition/position stays exactly the same
  let result: unknown;
  try {
    result = await fal.subscribe('fal-ai/flux-pro/v1/canny-finetuned', {
      input: {
        control_image_url: dataUrl,
        prompt: options.prompt,
        num_images: 1,
        guidance_scale: 30,
        num_inference_steps: 28,
        safety_tolerance: 5,
      },
    });
  } catch (e) {
    console.error('[fal.ai error]', e);
    throw new Error(`fal.ai 호출 실패: ${String(e)}`);
  }

  console.log('[fal.ai result]', JSON.stringify({
    hasData: !!(result as any)?.data,
    images: (result as any)?.data?.images,
    keys: Object.keys((result as any) || {}),
  }));

  const outputUrl = (result as any)?.data?.images?.[0]?.url
    ?? (result as any)?.images?.[0]?.url;

  if (!outputUrl) {
    throw new Error(`이미지 생성 실패 - 응답: ${JSON.stringify(result).slice(0, 200)}`);
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
