/**
 * Novel Reader — full-screen novel-style reading view.
 * 小说阅读器 — 全屏小说体阅读视图。
 */
import { useMemo, useState } from 'react';
import { messagesToNovel } from '@/lib/novelUtils';
import type { Message } from '@/types';

interface Props {
  messages: Message[];
  chapterMarkers: { title: string; at: number }[];
  starredIds: string[];
  onClose: () => void;
}

export function NovelReader({ messages, chapterMarkers, starredIds, onClose }: Props) {
  const [includeUser, setIncludeUser] = useState(true);

  const novel = useMemo(() =>
    messagesToNovel(messages, { chapterMarkers, starredIds, includeUser }),
    [messages, chapterMarkers, starredIds, includeUser],
  );

  const handleExport = () => {
    const blob = new Blob([novel], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '小说导出.md'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-100">📖 小说阅读模式</span>
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input type="checkbox" checked={includeUser} onChange={e => setIncludeUser(e.target.checked)} />
            包含我的行动
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
            📥 导出小说
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">
            ✕ 退出
          </button>
        </div>
      </div>

      {/* Reader */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <pre className="text-gray-200 text-base leading-loose whitespace-pre-wrap font-serif"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
            {novel || '暂无对话内容'}
          </pre>
        </div>
      </div>
    </div>
  );
}
