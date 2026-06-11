'use client';

import { useState, useEffect } from 'react';

interface GeneratedImage {
  id: number;
  type: number;
  reference_filename: string;
  output_filename: string;
  status: string;
  created_at: string;
}

export default function HistoryPanel() {
  const [items, setItems] = useState<GeneratedImage[]>([]);

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
      <h2 className="font-bold text-lg">생성 기록</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg overflow-hidden">
            {item.output_filename ? (
              <img
                src={`/api/uploads?folder=generated&filename=${item.output_filename}`}
                alt=""
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                <p className="text-xs text-gray-400">생성 중...</p>
              </div>
            )}
            <div className="p-2">
              <p className="text-xs text-gray-600">타입 {item.type}</p>
              <p className="text-xs text-gray-400">{item.created_at.slice(0, 16)}</p>
              {item.output_filename && (
                <a
                  href={`/api/uploads?folder=generated&filename=${item.output_filename}`}
                  download
                  className="text-xs text-blue-500 hover:underline"
                >
                  다운로드
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
