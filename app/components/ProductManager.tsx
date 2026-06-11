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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('name', `제품 ${new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`);
    for (const f of selectedFiles) fd.append('files', f);
    const res = await fetch('/api/product', { method: 'POST', body: fd });
    const created = await res.json();
    setSelectedFiles([]);
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    await load();
    // Auto-select the newly registered product
    if (created.id && onSelect) {
      const allRes = await fetch('/api/product');
      const all = await allRes.json();
      const found = all.find((p: Product) => p.id === created.id);
      if (found) onSelect(found);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/product?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-700">제품 이미지 등록</h3>
      <button
        onClick={handleUpload}
        disabled={uploading || selectedFiles.length === 0}
        className="w-full bg-blue-600 text-white rounded px-3 py-1 text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : '등록'}
      </button>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
      >
        {selectedFiles.length > 0 ? (
          <div className="space-y-1">
            <div className="flex gap-2 justify-center flex-wrap">
              {selectedFiles.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" className="w-12 h-12 object-cover rounded" />
              ))}
            </div>
            <p className="text-xs text-blue-600">{selectedFiles.length}장 선택됨</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">이미지를 드래그하거나 클릭해서 업로드</p>
            <p className="text-xs text-gray-400 mt-1">여러 장 선택할수록 생성 품질↑ (최대 3장 권장)</p>
          </>
        )}
      </div>
      <input type="file" ref={fileRef} accept="image/*" multiple className="hidden" onChange={handleFileChange} />

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
