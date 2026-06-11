import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const products = db.prepare('SELECT * FROM product_images ORDER BY created_at DESC').all();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    const uploadPath = path.join(process.cwd(), 'uploads', 'products', filename);

    const bytes = await file.arrayBuffer();
    await writeFile(uploadPath, Buffer.from(bytes));

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO product_images (name, filename, path) VALUES (?, ?, ?)'
    ).run(name, filename, uploadPath);

    return NextResponse.json({ id: result.lastInsertRowid, name, filename });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM product_images WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
