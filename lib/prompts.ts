import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

export function getPrompt(type: 1 | 2): string {
  const filename = `type${type}.txt`;
  const filePath = path.join(PROMPTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filename}`);
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

export function savePrompt(type: 1 | 2, content: string): void {
  const filename = `type${type}.txt`;
  const filePath = path.join(PROMPTS_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function getAllPrompts(): { type1: string; type2: string } {
  return {
    type1: getPrompt(1),
    type2: getPrompt(2),
  };
}
