import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { getPrompt } from '@/lib/prompts';
import { generateImage } from '@/lib/fal';

async function ensureUploadDirs() {
  const base = path.join(process.cwd(), 'uploads');
  for (const sub of ['references', 'products', 'generated']) {
    await mkdir(path.join(base, sub), { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const referenceFile = formData.get('reference') as File | null;
    const typeStr = formData.get('type') as string | null;
    const productId = formData.get('productId') as string | null;

    await ensureUploadDirs();

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

    // Save reference image
    const refExt = referenceFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(refExt) ? refExt : 'jpg';
    const refFilename = `${uuidv4()}.${safeExt}`;
    const refPath = path.join(process.cwd(), 'uploads', 'references', refFilename);
    const refBytes = await referenceFile.arrayBuffer();
    await writeFile(refPath, Buffer.from(refBytes));

    const prompt = getPrompt(type);
    let productImageIdNum: number | null = null;
    let productImagePaths: string[] = [];

    if (type === 2 && productId) {
      const db = getDb();
      const product = db.prepare('SELECT * FROM product_images WHERE id = ?').get(productId) as
        | { id: number; filename: string }
        | undefined;
      if (!product) {
        return NextResponse.json({ error: 'Product image not found' }, { status: 404 });
      }
      productImageIdNum = product.id;

      // Get all product image files
      const files = db.prepare(
        'SELECT filename FROM product_image_files WHERE product_id = ? ORDER BY created_at ASC LIMIT 3'
      ).all(productId) as { filename: string }[];

      if (files.length > 0) {
        productImagePaths = files.map(f => path.join(process.cwd(), 'uploads', 'products', f.filename));
      } else {
        productImagePaths = [path.join(process.cwd(), 'uploads', 'products', product.filename)];
      }
    }

    const result = await generateImage({ referenceImagePath: refPath, prompt, productImagePaths });

    // Save output image
    let outputFilename = '';
    if (result.outputUrl) {
      outputFilename = `${uuidv4()}.jpg`;
      const outputPath = path.join(process.cwd(), 'uploads', 'generated', outputFilename);
      const imgResp = await fetch(result.outputUrl);
      const imgBytes = await imgResp.arrayBuffer();
      await writeFile(outputPath, Buffer.from(imgBytes));
    }

    const db = getDb();
    db.prepare(
      `INSERT INTO generated_images
       (type, reference_filename, output_filename, product_image_id, job_id, prompt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(type, refFilename, outputFilename, productImageIdNum, result.jobId, prompt, 'completed');

    return NextResponse.json({
      jobId: result.jobId,
      status: 'completed',
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();
    const row = db.prepare('SELECT * FROM generated_images WHERE id = ?').get(id) as
      | { reference_filename: string; output_filename: string }
      | undefined;

    if (row) {
      const { unlink } = await import('fs/promises');
      const refPath = path.join(process.cwd(), 'uploads', 'references', row.reference_filename);
      const outPath = row.output_filename
        ? path.join(process.cwd(), 'uploads', 'generated', row.output_filename)
        : null;
      await unlink(refPath).catch(() => {});
      if (outPath) await unlink(outPath).catch(() => {});
      db.prepare('DELETE FROM generated_images WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
