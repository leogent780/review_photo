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
  referenceImageBase64: string;
  prompt: string;
  productImageBase64?: string;
}

interface GenerateResult {
  jobId: string;
  status: string;
  outputUrl?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = getApiKey();

  fal.config({ credentials: apiKey });

  const referenceDataUrl = `data:image/jpeg;base64,${options.referenceImageBase64}`;

  const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
    input: {
      image_url: referenceDataUrl,
      prompt: options.prompt,
      strength: 0.85,
      num_images: 1,
    },
  }) as { data?: { images?: { url: string }[] }; requestId?: string; images?: { url: string }[] };

  // fal.subscribe returns { data, requestId }
  const images = result?.data?.images ?? result?.images;
  const outputUrl = images?.[0]?.url;

  return {
    jobId: result?.requestId || crypto.randomUUID(),
    status: 'completed',
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
