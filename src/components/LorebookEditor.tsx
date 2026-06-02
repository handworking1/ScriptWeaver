/**
 * Lorebook / World Info editor — keyword-triggered context injection.
 * 世界信息编辑器 — 关键词触发式上下文注入。
 */
import { useState } from 'react';

interface LoreEntry {
  id: string;
  keywords: string;
  content: string;
}

interface Props {
  entries: LoreEntry[];
  onChange: (entries: LoreEntry[]) => void;
}

export function LorebookEditor({ entries, onChange }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');

  const add = () => {
    if (!newKey.trim() || !newContent.trim()) return;
    onChange([...entries, { id: Date.now().toString(36), keywords: newKey.trim(), content: newContent.trim() }]);
    setNewKey('');
    setNewContent('');
  };

  const remove = (id: string) => onChange(entries.filter(e => e.id !== id));
  const update = (id: string, field: 'keywords' | 'content', value: string) =>
    onChange(entries.map(e => e.id === id ? { ...e, [field]: value } : e));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">🌐 世界信息（Lorebook）</span>
        <span className="text-xs text-gray-600">{entries.length} 条</span>
      </div>
      <p className="text-xs text-gray-600">
        对话中出现关键词时，自动注入对应内容到 AI 上下文。用逗号分隔多个关键词。
      </p>
      {/* Quick add */}
      <div className="flex gap-2">
        <input value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newContent) add(); }}
          placeholder="关键词（逗号分隔）" className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-purple-500" />
        <button onClick={add} disabled={!newKey.trim() || !newContent.trim()}
          className="px-3 py-1 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded">+</button>
      </div>
      <textarea value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) add(); }}
        placeholder="注入内容..." className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 h-14 resize-none focus:outline-none focus:border-purple-500" />
      {/* Entry list */}
      {entries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {entries.map(e => (
            <div key={e.id} className="bg-gray-800 rounded-lg border border-gray-700 p-2 flex gap-2">
              <div className="flex-1 space-y-1">
                <input value={e.keywords} onChange={ev => update(e.id, 'keywords', ev.target.value)}
                  className="w-full bg-transparent text-xs text-purple-400 focus:outline-none" placeholder="关键词..." />
                <textarea value={e.content} onChange={ev => update(e.id, 'content', ev.target.value)}
                  className="w-full bg-transparent text-xs text-gray-400 focus:outline-none h-10 resize-none" placeholder="内容..." />
              </div>
              <button onClick={() => remove(e.id)} className="text-gray-600 hover:text-red-400 flex-shrink-0 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
