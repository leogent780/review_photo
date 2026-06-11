import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';

const PRODUCTS_DIR = path.join(process.cwd(), 'uploads', 'products');

export async function GET() {
  const db = getDb();
  const products = db.prepare('SELECT * FROM product_images ORDER BY created_at DESC').all() as {
    id: number; name: string; filename: string; path: string; created_at: string;
  }[];

  const result = products.map(p => {
    const files = db.prepare(
      'SELECT filename FROM product_image_files WHERE product_id = ? ORDER BY created_at ASC'
    ).all(p.id) as { filename: string }[];
    return {
      ...p,
      filenames: files.length > 0 ? files.map(f => f.filename) : [p.filename],
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    await mkdir(PRODUCTS_DIR, { recursive: true });

    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const files = formData.getAll('files') as File[];

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (files.length === 0) return NextResponse.json({ error: 'files are required' }, { status: 400 });

    // Save first file as representative filename
    const firstFile = files[0];
    const firstExt = firstFile.name.split('.').pop() || 'jpg';
    const firstFilename = `${uuidv4()}.${firstExt}`;
    const firstPath = path.join(PRODUCTS_DIR, firstFilename);
    await writeFile(firstPath, Buffer.from(await firstFile.arrayBuffer()));

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO product_images (name, filename, path) VALUES (?, ?, ?)'
    ).run(name, firstFilename, firstPath);

    const productId = result.lastInsertRowid;

    // Save all files to product_image_files (skip first — already saved as representative)
    for (const file of files.slice(1)) {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${uuidv4()}.${ext}`;
      const filePath = path.join(PRODUCTS_DIR, filename);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      db.prepare('INSERT INTO product_image_files (product_id, filename) VALUES (?, ?)').run(productId, filename);
    }

    return NextResponse.json({ id: productId, name, filename: firstFilename });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { unlink } = await import('fs/promises');
    const db = getDb();

    // Delete all product_image_files from disk
    const fileRows = db.prepare('SELECT filename FROM product_image_files WHERE product_id = ?').all(id) as { filename: string }[];
    for (const row of fileRows) {
      await unlink(path.join(PRODUCTS_DIR, row.filename)).catch(() => {});
    }

    // Delete the representative filename from disk
    const product = db.prepare('SELECT filename FROM product_images WHERE id = ?').get(id) as { filename: string } | undefined;
    if (product) {
      await unlink(path.join(PRODUCTS_DIR, product.filename)).catch(() => {});
    }

    db.prepare('DELETE FROM product_image_files WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM product_images WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
