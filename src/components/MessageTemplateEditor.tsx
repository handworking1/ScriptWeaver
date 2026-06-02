/**
 * Message template editor — managed inside settings page.
 * 消息模板编辑器 — 设置页内联管理。
 */
import { useState, useEffect } from 'react';

export function MessageTemplateEditor() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [newTpl, setNewTpl] = useState('');

  useEffect(() => {
    window.electronAPI.getSetting('msg_templates').then(d => {
      if (d) setTemplates(JSON.parse(d));
    }).catch(() => {});
  }, []);

  const save = async (updated: string[]) => {
    setTemplates(updated);
    await window.electronAPI.setSetting('msg_templates', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const add = () => {
    if (!newTpl.trim()) return;
    save([...templates, newTpl.trim()]);
    setNewTpl('');
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-100">📋 消息模板</h3>
          <p className="text-xs text-gray-500 mt-1">预设常用短语，聊天时点击 📋 按钮快速插入</p>
        </div>
        <span className={`text-xs ${saved ? 'text-green-400' : 'text-gray-600'}`}>
          {saved ? '✓ 已保存' : `${templates.length} 条`}
        </span>
      </div>
      <div className="flex gap-2 mb-3">
        <input value={newTpl} onChange={e => setNewTpl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="新模板内容..." className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
        <button onClick={add} disabled={!newTpl.trim()}
          className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded">+</button>
      </div>
      {templates.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {templates.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-900 rounded px-3 py-1.5">
              <span className="flex-1 text-xs text-gray-300 truncate">{t}</span>
              <button onClick={() => save(templates.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
