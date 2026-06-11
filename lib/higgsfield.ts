import fs from 'fs';
import path from 'path';

const HIGGSFIELD_API_URL = 'https://api.higgsfield.ai';

function getApiKey(): string {
  // Read directly from file to avoid BOM/encoding issues with process.env
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/HIGGSFIELD_API_KEY=([^\r\n]+)/);
    if (match) {
      return match[1].replace(/[^\x20-\x7E]/g, '').trim();
    }
  }
  const fromEnv = process.env.HIGGSFIELD_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
  if (!fromEnv) throw new Error('HIGGSFIELD_API_KEY is not set');
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

  const body: Record<string, unknown> = {
    prompt: options.prompt,
    reference_image: options.referenceImageBase64,
  };

  if (options.productImageBase64) {
    body.product_image = options.productImageBase64;
  }

  const response = await fetch(`${HIGGSFIELD_API_URL}/v1/image/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Higgsfield API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    jobId: data.job_id || data.id,
    status: data.status || 'pending',
    outputUrl: data.output_url || data.image_url,
  };
}

export async function getJobStatus(jobId: string): Promise<GenerateResult> {
  const apiKey = getApiKey();

  const response = await fetch(`${HIGGSFIELD_API_URL}/v1/image/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Higgsfield API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    jobId: data.job_id || data.id,
    status: data.status,
    outputUrl: data.output_url || data.image_url,
  };
}
