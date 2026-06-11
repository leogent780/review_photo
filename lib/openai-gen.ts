import fs from 'fs';
import path from 'path';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

function getApiKey(): string {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/OPENAI_API_KEY=([^\r\n]+)/);
    if (match) return match[1].replace(/[^\x20-\x7E]/g, '').trim();
  }
  const fromEnv = process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
  if (!fromEnv) throw new Error('OPENAI_API_KEY is not set');
  return fromEnv;
}

interface GenerateOptions {
  referenceImagePath: string;
  prompt: string;
}

interface GenerateResult {
  jobId: string;
  status: string;
  outputBase64?: string;
  outputUrl?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });

  // Convert to PNG (1024x1024) — gpt-image-1 edit mode works best with PNG
  const pngBuffer = await sharp(options.referenceImagePath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  const imageFile = await toFile(pngBuffer, 'reference.png', { type: 'image/png' });

  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: options.prompt,
    n: 1,
    size: '1024x1024',
  });

  const outputBase64 = response.data?.[0]?.b64_json;
  const outputUrl = response.data?.[0]?.url;

  if (!outputBase64 && !outputUrl) {
    throw new Error('이미지 생성 실패: 안전 필터에 의해 차단되었습니다.');
  }

  // Black image check — valid 1024x1024 PNG is at least 50KB base64
  if (outputBase64 && outputBase64.length < 10000) {
    throw new Error('이미지 생성 실패: 안전 필터에 의해 차단되었습니다.');
  }

  return {
    jobId: crypto.randomUUID(),
    status: 'completed',
    outputBase64,
    outputUrl,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
