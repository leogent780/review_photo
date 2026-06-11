import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { getPrompt } from '@/lib/prompts';
import { generateImage } from '@/lib/fal';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const referenceFile = formData.get('reference') as File | null;
    const typeStr = formData.get('type') as string | null;
    const productId = formData.get('productId') as string | null;

    if (!referenceFile) {
      return NextResponse.json({ error: 'reference image is required' }, { status: 400 });
    }
    if (!typeStr || (typeStr !== '1' && typeStr !== '2')) {
      return NextResponse.json({ error: 'type must be 1 or 2' }, { status: 400 });
    }

    const type = parseInt(typeStr) as 1 | 2;

    if (type === 2 && !productId) {
      return NextResponse.json({ error: 'productId is required for type 2' }, { status: 400 });
    }

    const refExt = referenceFile.name.split('.').pop() || 'jpg';
    const refFilename = `${uuidv4()}.${refExt}`;
    const refPath = path.join(process.cwd(), 'uploads', 'references', refFilename);
    const refBytes = await referenceFile.arrayBuffer();
    await writeFile(refPath, Buffer.from(refBytes));

    const prompt = getPrompt(type);
    const refBase64 = Buffer.from(refBytes).toString('base64');

    let productImageBase64: string | undefined;
    let productImageIdNum: number | null = null;

    if (type === 2 && productId) {
      const db = getDb();
      const product = db.prepare('SELECT * FROM product_images WHERE id = ?').get(productId) as
        | { path: string; id: number }
        | undefined;
      if (!product) {
        return NextResponse.json({ error: 'Product image not found' }, { status: 404 });
      }
      const productBytes = await readFile(product.path);
      productImageBase64 = productBytes.toString('base64');
      productImageIdNum = product.id;
    }

    const result = await generateImage({
      referenceImageBase64: refBase64,
      prompt,
      productImageBase64,
    });

    const outputFilename = result.outputUrl ? `${uuidv4()}.jpg` : '';
    const db = getDb();

    if (result.outputUrl && outputFilename) {
      const outputPath = path.join(process.cwd(), 'uploads', 'generated', outputFilename);
      const imgResp = await fetch(result.outputUrl);
      const imgBytes = await imgResp.arrayBuffer();
      await writeFile(outputPath, Buffer.from(imgBytes));
    }

    db.prepare(
      `INSERT INTO generated_images
       (type, reference_filename, output_filename, product_image_id, job_id, prompt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      type,
      refFilename,
      outputFilename,
      productImageIdNum,
      result.jobId,
      prompt,
      result.status === 'completed' ? 'completed' : 'pending'
    );

    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      outputFilename: outputFilename || null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const items = db
      .prepare('SELECT * FROM generated_images ORDER BY created_at DESC LIMIT 100')
      .all();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
