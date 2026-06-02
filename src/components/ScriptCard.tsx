import { useState } from 'react';
import type { Script } from '@/types';

interface ScriptCardProps {
  script: Script;
  onEdit: (script: Script) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function ScriptCard({ script, onEdit, onDelete, onSelect, isSelected }: ScriptCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all hover:border-purple-500/50 ${
        isSelected ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-gray-700'
      }`}
      onClick={() => onSelect(script.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-100 text-base">{script.title}</h3>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={async () => {
              try {
                const data = await window.electronAPI.exportScript(script.id);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${script.title}-剧本导出.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (err: any) { alert('导出失败：' + (err.message || '未知错误')); }
            }}
            className="text-gray-500 hover:text-green-400 p-1 text-xs"
            title="导出此剧本"
          >
            📤
          </button>
          <button
            onClick={() => onEdit(script)}
            className="text-gray-500 hover:text-blue-400 p-1 text-xs"
            title="编辑"
          >
            ✏️
          </button>
          {confirmDelete ? (
            <span className="flex gap-1">
              <button
                onClick={() => { onDelete(script.id); setConfirmDelete(false); }}
                className="text-red-400 hover:text-red-300 p-1 text-xs"
              >
                确认
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-gray-400 hover:text-gray-300 p-1 text-xs"
              >
                取消
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-gray-500 hover:text-red-400 p-1 text-xs"
              title="删除"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      {script.worldSetting && (
        <p className="text-xs text-gray-400 mb-1 line-clamp-1">🌍 {script.worldSetting}</p>
      )}
      {script.background && (
        <p className="text-xs text-gray-500 line-clamp-2">{script.background}</p>
      )}
      <div className="mt-3 text-xs text-gray-600">
        更新于 {new Date(script.updatedAt).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
}
