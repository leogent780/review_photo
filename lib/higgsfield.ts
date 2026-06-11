import fs from 'fs';
import path from 'path';
import { HiggsfieldClient } from '@higgsfield/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SoulQuality, SoulSize, BatchSize } = require('@higgsfield/client/dist/helpers');

function getCredentials(): { keyId: string; keySecret: string } {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const idMatch = content.match(/HIGGSFIELD_KEY_ID=([^\r\n]+)/);
    const secretMatch = content.match(/HIGGSFIELD_KEY_SECRET=([^\r\n]+)/);
    if (idMatch && secretMatch) {
      return {
        keyId: idMatch[1].replace(/[^\x20-\x7E]/g, '').trim(),
        keySecret: secretMatch[1].replace(/[^\x20-\x7E]/g, '').trim(),
      };
    }
  }
  const keyId = process.env.HIGGSFIELD_KEY_ID?.replace(/[^\x20-\x7E]/g, '').trim();
  const keySecret = process.env.HIGGSFIELD_KEY_SECRET?.replace(/[^\x20-\x7E]/g, '').trim();
  if (!keyId || !keySecret) throw new Error('HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET are not set');
  return { keyId, keySecret };
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
  const { keyId, keySecret } = getCredentials();
  const client = new HiggsfieldClient({ apiKey: keyId, apiSecret: keySecret });

  // Upload reference image to Higgsfield CDN
  const imageBuffer = fs.readFileSync(options.referenceImagePath);
  const ext = path.extname(options.referenceImagePath).slice(1).toLowerCase();
  const format = (ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg') as 'jpeg' | 'png' | 'webp';
  const uploadedUrl = await client.uploadImage(imageBuffer, format);
  console.log('[higgsfield] uploaded reference:', uploadedUrl);

  // Use Soul text-to-image with image_reference for composition guidance
  const jobSet = await client.generate('/v1/text2image/soul', {
    prompt: options.prompt,
    width_and_height: SoulSize.PORTRAIT_1536x2048,
    quality: SoulQuality.HD,
    batch_size: BatchSize.SINGLE,
    image_reference: {
      type: 'image_url',
      image_url: uploadedUrl,
    },
  }, { withPolling: true });

  console.log('[higgsfield result]', JSON.stringify({
    isCompleted: jobSet.isCompleted,
    isFailed: jobSet.isFailed,
    jobCount: jobSet.jobs?.length,
    jobs: jobSet.jobs?.map((j: any) => ({ status: j.status, url: j.results?.raw?.url })),
  }));

  if (!jobSet.isCompleted) {
    throw new Error(`Higgsfield 생성 실패: ${JSON.stringify(jobSet)}`);
  }

  const outputUrl = jobSet.jobs?.[0]?.results?.raw?.url
    ?? jobSet.jobs?.[0]?.results?.min?.url;

  if (!outputUrl) throw new Error('Higgsfield: 결과 URL 없음');

  return {
    jobId: jobSet.id || crypto.randomUUID(),
    status: 'completed',
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
