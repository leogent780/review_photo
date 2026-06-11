import { NextResponse } from 'next/server';
import { getAllPrompts, savePrompt } from '@/lib/prompts';

export async function GET() {
  try {
    const prompts = getAllPrompts();
    return NextResponse.json(prompts);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { type, content } = await request.json();
    if (type !== 1 && type !== 2) {
      return NextResponse.json({ error: 'type must be 1 or 2' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    savePrompt(type as 1 | 2, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
