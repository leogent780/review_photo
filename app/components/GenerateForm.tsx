'use client';

import { useState, useRef, useCallback } from 'react';
import ProductManager from './ProductManager';

interface Product {
  id: number;
  name: string;
  filename: string;
  created_at: string;
}

interface GeneratedResult {
  jobId: string;
  status: string;
  outputFilename?: string;
}

export default function GenerateForm() {
  const [type, setType] = useState<1 | 2>(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    setReferenceFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setReferencePreview(url);
    } else {
      setReferencePreview(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file);
    }
  }, []);

  const pollStatus = async (jobId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      const res = await fetch(`/api/generate?jobId=${jobId}`);
      const data = await res.json();
      if (data.status === 'completed') {
        clearInterval(interval);
        setPolling(false);
        setResult(prev => prev ? { ...prev, status: 'completed', outputFilename: data.outputFilename } : null);
      } else if (data.status === 'failed') {
        clearInterval(interval);
        setPolling(false);
        setError('생성 실패. 다시 시도해주세요.');
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    if (!referenceFile) { setError('레퍼런스 이미지를 선택해주세요.'); return; }
    if (type === 2 && !selectedProduct) { setError('제품 이미지를 선택해주세요.'); return; }

    setError(null);
    setGenerating(true);
    setResult(null);

    const fd = new FormData();
    fd.append('reference', referenceFile);
    fd.append('type', String(type));
    if (type === 2 && selectedProduct) {
      fd.append('productId', String(selectedProduct.id));
    }

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '오류가 발생했습니다.');
        return;
      }

      setResult(data);
      if (data.status !== 'completed') {
        pollStatus(data.jobId);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

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
                {t === 1
                  ? '제품 없이 사용 결과만 나오는 이미지\n(피부, 헤어 결과 등)'
                  : '제품을 들고 있거나 사용 중인 이미지'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Product selection for type 2 */}
      {type === 2 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <ProductManager
            onSelect={p => setSelectedProduct(p)}
            selectedId={selectedProduct?.id}
          />
          {selectedProduct && (
            <p className="text-xs text-blue-600 mt-2">✓ 선택된 제품: {selectedProduct.name}</p>
          )}
        </div>
      )}

      {/* Reference image upload */}
      <div>
        <h3 className="font-semibold mb-2">레퍼런스 이미지</h3>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {referencePreview ? (
            <img src={referencePreview} alt="reference" className="max-h-48 mx-auto rounded" />
          ) : (
            <div className="text-gray-400">
              <p className="text-sm">이미지를 드래그하거나 클릭해서 업로드</p>
              <p className="text-xs mt-1">JPG, PNG, WEBP 지원</p>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          className="hidden"
          onChange={e => handleFileChange(e.target.files?.[0] || null)}
        />
        {referenceFile && (
          <p className="text-xs text-gray-500 mt-1">{referenceFile.name}</p>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || polling}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {generating ? '요청 중...' : polling ? '생성 중... (잠시 기다려주세요)' : '이미지 생성'}
      </button>

      {/* Result */}
      {result && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">
            {result.status === 'completed' ? '✓ 생성 완료' : '⏳ 생성 중...'}
          </h3>
          {result.outputFilename && (
            <div className="space-y-2">
              <img
                src={`/api/uploads?folder=generated&filename=${result.outputFilename}`}
                alt="generated"
                className="max-h-64 rounded border"
              />
              <a
                href={`/api/uploads?folder=generated&filename=${result.outputFilename}`}
                download
                className="inline-block bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
              >
                다운로드
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
