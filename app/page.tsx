'use client';

import { useState } from 'react';
import GenerateForm from './components/GenerateForm';
import HistoryPanel from './components/HistoryPanel';
import PromptEditor from './components/PromptEditor';

type Tab = 'generate' | 'history' | 'prompts';

export default function Home() {
  const [tab, setTab] = useState<Tab>('generate');
  const [historyKey, setHistoryKey] = useState(0);

  const switchTab = (t: Tab) => {
    if (t === 'history') setHistoryKey(k => k + 1);
    setTab(t);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">리뷰 이미지 생성기</h1>
          <p className="text-xs text-gray-500 mt-0.5">레퍼런스 이미지 → 저작권 문제 없는 리뷰 이미지</p>
        </div>
      </header>

      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {([
            { id: 'generate', label: '이미지 생성' },
            { id: 'history', label: '생성 기록' },
            { id: 'prompts', label: '프롬프트 관리' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {tab === 'generate' && <GenerateForm onAllDone={() => switchTab('history')} />}
        {tab === 'history' && <HistoryPanel key={historyKey} />}
        {tab === 'prompts' && <PromptEditor />}
      </main>
    </div>
  );
}
