'use client';

import { useState, useEffect, useRef } from 'react';

interface Product {
  id: number;
  name: string;
  filename: string;
  filenames: string[];
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch('/api/product');
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => { load(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !name.trim()) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('name', name.trim());
    for (const f of selectedFiles) fd.append('files', f);
    await fetch('/api/product', { method: 'POST', body: fd });
    setName('');
    setSelectedFiles([]);
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
        <button
          onClick={() => fileRef.current?.click()}
          className="border rounded px-2 py-1 text-sm whitespace-nowrap bg-gray-50 hover:bg-gray-100"
        >
          {selectedFiles.length > 0 ? `${selectedFiles.length}장 선택됨` : '파일 선택'}
        </button>
        <input type="file" ref={fileRef} accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0 || !name.trim()}
          className="bg-blue-600 text-white rounded px-3 py-1 text-sm whitespace-nowrap hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '등록'}
        </button>
      </div>
      <p className="text-xs text-gray-400">여러 장 선택할수록 생성 품질이 올라가요 (최대 3장 권장)</p>

      {products.length === 0 ? (
        <p className="text-xs text-gray-400">등록된 제품 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {products.map(p => (
            <div
              key={p.id}
              onClick={() => onSelect?.(p)}
              className={`border rounded p-2 cursor-pointer hover:border-blue-400 transition-colors ${
                selectedId === p.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {p.filenames.slice(0, 3).map((fn, i) => (
                    <img
                      key={i}
                      src={`/api/uploads?folder=products&filename=${fn}`}
                      alt={p.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.filenames.length}장</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
