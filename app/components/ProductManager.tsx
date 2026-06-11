'use client';

import { useState, useEffect, useRef } from 'react';

interface Product {
  id: number;
  name: string;
  filename: string;
  created_at: string;
}

interface Props {
  onSelect?: (product: Product) => void;
  selectedId?: number | null;
}

export default function ProductManager({ onSelect, selectedId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch('/api/product');
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !name.trim()) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name.trim());
    await fetch('/api/product', { method: 'POST', body: fd });
    setName('');
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/product?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-700">제품 이미지 등록</h3>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="제품명"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
        />
        <input type="file" ref={fileRef} accept="image/*" className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="border rounded px-2 py-1 text-sm whitespace-nowrap bg-gray-50 hover:bg-gray-100"
        >
          파일 선택
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-blue-600 text-white rounded px-3 py-1 text-sm whitespace-nowrap hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '등록'}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-gray-400">등록된 제품 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {products.map(p => (
            <div
              key={p.id}
              onClick={() => onSelect?.(p)}
              className={`border rounded p-2 cursor-pointer flex items-center gap-2 hover:border-blue-400 transition-colors ${
                selectedId === p.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <img
                src={`/api/uploads?folder=products&filename=${p.filename}`}
                alt={p.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
