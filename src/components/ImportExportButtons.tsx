import { useScriptStore } from '@/stores/scriptStore';

export function ImportExportButtons() {
  const loadScripts = useScriptStore((s) => s.loadScripts);

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
        await window.electronAPI.importData(data);
        await loadScripts();
        alert('导入成功！');
      } catch (err: any) {
        alert(`导入失败：${err.message}`);
      }
    };
    input.click();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
      >
        📤 导出数据
      </button>
      <button
        onClick={handleImport}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
      >
        📥 导入数据
      </button>
    </div>
  );
}
