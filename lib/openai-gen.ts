import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

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

  const imageBytes = fs.readFileSync(options.referenceImagePath);
  const base64Image = imageBytes.toString('base64');
  const ext = path.extname(options.referenceImagePath).replace('.', '') || 'jpeg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  // Use responses API with image generation tool — same pipeline as ChatGPT
  const response = await client.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: dataUrl },
          { type: 'input_text', text: options.prompt },
        ],
      },
    ],
    tools: [{ type: 'image_generation' }],
  });

  // Extract image from response
  const imageOutput = response.output?.find(
    (o: { type: string }) => o.type === 'image_generation_call'
  ) as { result?: string } | undefined;

  const outputBase64 = imageOutput?.result;

  return {
    jobId: response.id || crypto.randomUUID(),
    status: 'completed',
    outputBase64,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  return { jobId, status: 'completed' };
}
