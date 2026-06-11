import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const filename = searchParams.get('filename');

  if (!folder || !filename) {
    return NextResponse.json({ error: 'folder and filename required' }, { status: 400 });
  }

  const allowed = ['products', 'generated', 'references'];
  if (!allowed.includes(folder)) {
    return NextResponse.json({ error: 'invalid folder' }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), 'uploads', folder, safeName);

  try {
    const bytes = await readFile(filePath);
    const ext = safeName.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return new Response(bytes, { headers: { 'Content-Type': contentType } });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
