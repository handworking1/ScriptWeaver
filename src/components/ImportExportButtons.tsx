import { useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';

export function ImportExportButtons() {
  const loadScripts = useScriptStore((s) => s.loadScripts);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const data = await window.electronAPI.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `script-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`导出失败：${err.message}`);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!confirm('导入将覆盖当前所有数据（剧本、角色、对话、配置），确定继续？')) return;
        setImporting(true);
        await window.electronAPI.importData(data);
        await loadScripts();
        alert('导入成功！');
      } catch (err: any) { alert(`导入失败：${err.message}`); }
      finally { setImporting(false); }
    };
    input.click();
  };

  const handleImportScript = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const title = data?.script?.title || '未知剧本';
        if (!confirm(`导入剧本「${title}」及其 ${data?.characters?.length || 0} 个角色？现有同名剧本将被更新。`)) return;
        setImporting(true);
        await window.electronAPI.importScript(data);
        await loadScripts();
        alert(`剧本「${title}」导入成功！`);
      } catch (err: any) { alert(`导入失败：${err.message}`); }
      finally { setImporting(false); }
    };
    input.click();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        title="导出全部数据"
      >
        📤 导出全部
      </button>
      <button
        onClick={handleImport}
        disabled={importing}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 rounded-lg transition-colors"
        title="导入全部数据（覆盖）"
      >
        {importing ? '⏳ 导入中...' : '📥 导入全部'}
      </button>
      <button
        onClick={handleImportScript}
        disabled={importing}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 rounded-lg transition-colors"
        title="导入单个剧本导出文件"
      >
        📥 导入剧本
      </button>
    </div>
  );
}
