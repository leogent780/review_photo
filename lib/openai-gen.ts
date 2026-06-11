import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { toFile } from 'openai';

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
  outputUrl?: string;
  outputBase64?: string;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });

  const imageStream = fs.createReadStream(options.referenceImagePath);
  const imageFile = await toFile(imageStream, path.basename(options.referenceImagePath), {
    type: 'image/jpeg',
  });

  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: options.prompt,
    n: 1,
    size: '1024x1024',
  });

  const outputBase64 = response.data?.[0]?.b64_json;
  const outputUrl = response.data?.[0]?.url;

  return {
    jobId: crypto.randomUUID(),
    status: 'completed',
    outputUrl,
    outputBase64,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
