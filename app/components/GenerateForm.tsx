'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ProductManager from './ProductManager';

interface Product {
  id: number;
  name: string;
  filename: string;
  created_at: string;
}

interface FileItem {
  file: File;
  preview: string;
  status: 'waiting' | 'generating' | 'done' | 'error';
  outputFilename?: string;
  error?: string;
}

interface Props {
  onAllDone?: () => void;
}

export default function GenerateForm({ onAllDone }: Props) {
  const [type, setType] = useState<1 | 2>(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!running && files.length > 0 && files.some(f => f.status === 'done')) {
      const allFinished = files.every(f => f.status === 'done' || f.status === 'error');
      if (allFinished) onAllDone?.();
    }
  }, [running]);

  const addFiles = (newFiles: File[]) => {
    const items: FileItem[] = newFiles
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        status: 'waiting',
      }));
    setFiles(prev => [...prev, ...items]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (files.length === 0) { setError('이미지를 선택해주세요.'); return; }
    if (type === 2 && !selectedProduct) { setError('제품 이미지를 선택해주세요.'); return; }
    setError(null);
    setRunning(true);

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'done') continue;

      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'generating' } : f));

      const fd = new FormData();
      fd.append('reference', item.file);
      fd.append('type', String(type));
      if (type === 2 && selectedProduct) {
        fd.append('productId', String(selectedProduct.id));
      }

      try {
        const res = await fetch('/api/generate', { method: 'POST', body: fd });
        const data = await res.json();

        if (!res.ok) {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: data.error } : f));
        } else {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', outputFilename: data.outputFilename } : f));
        }
      } catch (e) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: String(e) } : f));
      }
    }

    setRunning(false);
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');
  const doneCount = files.filter(f => f.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Type selection */}
      <div>
        <h3 className="font-semibold mb-2">이미지 타입 선택</h3>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`border-2 rounded-lg p-4 text-left transition-colors ${
                type === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-sm">타입 {t}</p>
              <p className="text-xs text-gray-600 mt-1">
                {t === 1 ? '제품 없이 사용 결과만 나오는 이미지 (피부, 헤어 결과 등)' : '제품을 들고 있거나 사용 중인 이미지'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Product selection for type 2 */}
      {type === 2 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <ProductManager onSelect={p => setSelectedProduct(p)} selectedId={selectedProduct?.id} />
          {selectedProduct && <p className="text-xs text-blue-600 mt-2">✓ 선택된 제품: {selectedProduct.name}</p>}
        </div>
      )}

      {/* Upload area */}
      <div>
        <h3 className="font-semibold mb-2">레퍼런스 이미지</h3>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <p className="text-sm text-gray-400">이미지를 드래그하거나 클릭해서 업로드</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
        </div>
        <input type="file" ref={fileRef} accept="image/*" multiple className="hidden" onChange={handleFileInput} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {files.map((item, idx) => (
            <div key={idx} className="relative border rounded-lg overflow-hidden">
              <img src={item.preview} alt="" className="w-full h-24 object-cover" />
              {/* Status overlay */}
              {item.status === 'generating' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white text-xs">생성 중...</p>
                </div>
              )}
              {item.status === 'done' && (
                <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center">
                  <p className="text-white text-lg">✓</p>
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center p-1">
                  <p className="text-white text-sm font-bold">⚠ 실패</p>
                  {item.error && <p className="text-white text-xs text-center mt-1 leading-tight">{item.error.replace('Error: ', '')}</p>}
                </div>
              )}
              {item.status === 'waiting' && !running && (
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-700">
            생성 중... {doneCount} / {files.length} 완료
          </p>
          <div className="mt-2 bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(doneCount / files.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-700">✓ 전체 완료! {doneCount}장 생성됨 → 생성 기록 탭으로 이동됩니다.</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={running || files.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {running ? `생성 중... (${doneCount}/${files.length})` : `이미지 생성 ${files.length > 0 ? `(${files.length}장)` : ''}`}
      </button>
    </div>
  );
}
