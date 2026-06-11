'use client';

import { useState, useEffect } from 'react';

export default function PromptEditor() {
  const [prompts, setPrompts] = useState({ type1: '', type2: '' });
  const [saving, setSaving] = useState<1 | 2 | null>(null);
  const [saved, setSaved] = useState<1 | 2 | null>(null);

  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(setPrompts);
  }, []);

  const save = async (type: 1 | 2) => {
    setSaving(type);
    await fetch('/api/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content: type === 1 ? prompts.type1 : prompts.type2 }),
    });
    setSaving(null);
    setSaved(type);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">프롬프트 관리</h2>
      {([1, 2] as const).map(type => (
        <div key={type} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              타입 {type}: {type === 1 ? '결과 이미지 (제품 없음)' : '제품 사용 이미지'}
            </h3>
            <button
              onClick={() => save(type)}
              disabled={saving === type}
              className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving === type ? '저장 중...' : saved === type ? '저장됨 ✓' : '저장'}
            </button>
          </div>
          <textarea
            value={type === 1 ? prompts.type1 : prompts.type2}
            onChange={e =>
              setPrompts(prev => ({ ...prev, [`type${type}`]: e.target.value }))
            }
            rows={8}
            className="w-full border rounded p-2 text-sm font-mono resize-y"
          />
        </div>
      ))}
    </div>
  );
}
