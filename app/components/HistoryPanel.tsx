'use client';

import { useState, useEffect } from 'react';

interface GeneratedImage {
  id: number;
  type: number;
  reference_filename: string;
  output_filename: string;
  prompt: string;
  status: string;
  created_at: string;
}

export default function HistoryPanel() {
  const [items, setItems] = useState<GeneratedImage[]>([]);
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/generate')
      .then(r => r.json())
      .then(setItems);
  }, []);

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">생성 기록이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">생성 기록</h2>
        <p className="text-xs text-gray-400">총 {items.length}장</p>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-2 gap-0">
              {/* Reference */}
              <div className="relative">
                <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">원본</p>
                <img
                  src={`/api/uploads?folder=references&filename=${item.reference_filename}`}
                  alt="reference"
                  className="w-full h-40 object-cover"
                />
              </div>
              {/* Output */}
              <div className="relative">
                <p className="absolute top-1 left-1 bg-blue-500/80 text-white text-xs px-1 rounded">생성</p>
                {item.output_filename ? (
                  <img
                    src={`/api/uploads?folder=generated&filename=${item.output_filename}`}
                    alt="generated"
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <p className="text-xs text-gray-400">생성 중...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info bar */}
            <div className="px-3 py-2 flex items-center justify-between gap-2 bg-gray-50 border-t">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">타입 {item.type}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{item.created_at.slice(0, 16)}</span>
                {item.prompt && (
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === item.id ? null : item.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                  >
                    프롬프트 {expandedPrompt === item.id ? '닫기' : '보기'}
                  </button>
                )}
              </div>
              {item.output_filename && (
                <a
                  href={`/api/uploads?folder=generated&filename=${item.output_filename}`}
                  download
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
                >
                  다운로드
                </a>
              )}
            </div>

            {/* Prompt expand */}
            {expandedPrompt === item.id && item.prompt && (
              <div className="px-3 py-2 border-t bg-yellow-50">
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.prompt}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
