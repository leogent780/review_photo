import fs from 'fs';
import path from 'path';
import { HiggsfieldClient } from '@higgsfield/client';
import { higgsfield as hf, config } from '@higgsfield/client/v2';

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

  // Upload image using v1 client
  const v1Client = new HiggsfieldClient({ apiKey: keyId, apiSecret: keySecret });
  const imageBuffer = fs.readFileSync(options.referenceImagePath);
  const ext = path.extname(options.referenceImagePath).slice(1).toLowerCase();
  const format = (ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg') as 'jpeg' | 'png' | 'webp';
  const uploadedUrl = await v1Client.uploadImage(imageBuffer, format);

  // Configure v2 client
  config({ credentials: `${keyId}:${keySecret}` });

  // Use FLUX Kontext for image editing (accepts image_url for reference)
  const result = await hf.subscribe('flux-pro/kontext/max/text-to-image', {
    input: {
      prompt: options.prompt,
      image_url: uploadedUrl,
      aspect_ratio: '1:1',
      safety_tolerance: 6,
    },
    withPolling: true,
  });

  console.log('[higgsfield result]', JSON.stringify({
    status: result.status,
    request_id: result.request_id,
    images: result.images,
  }));

  if (result.status !== 'completed') {
    throw new Error(`Higgsfield 생성 실패: ${result.status}`);
  }

  const outputUrl = result.images?.[0]?.url;
  if (!outputUrl) throw new Error('Higgsfield: 결과 URL 없음');

  return {
    jobId: result.request_id || crypto.randomUUID(),
    status: 'completed',
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
