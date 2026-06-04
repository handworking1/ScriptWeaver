/**
 * Novel Importer — upload novel, extract script settings via AI.
 * 小说导入器 — 上传小说，通过 AI 提取剧本设定。
 */
import { useState } from 'react';
import { sampleNovel } from '@/lib/novelUtils';

interface Props {
  configId: string | null;
  onExtract: (fields: Record<string, string>) => void;
}

export function NovelImporter({ configId, onExtract }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string> | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setText(t);
    setPreview(null);
  };

  const handleExtract = async () => {
    if (!text.trim() || !configId) return;
    setLoading(true);
    try {
      const sampled = sampleNovel(text);
      const result = await window.electronAPI.discussSettings(configId, 'script',
        { title: '', worldSetting: '', background: '', mainQuests: '', sideQuests: '', environment: '', map: '', data: '' },
        [{ role: 'system', content: `从以下小说片段中提取剧本设定。输出JSON：
{
  "title": "小说名",
  "worldSetting": "世界观概括（50字内）",
  "background": "故事背景（100字内）",
  "tags": "类型标签（逗号分隔，如：玄幻,升级流）",
  "mainQuests": "主线任务",
  "sideQuests": "支线任务",
  "referenceWorks": "对标作品",
  "eraBackground": "时代背景",
  "protagonistDilemma": "主角困境",
  "coreCheat": "金手指",
  "chapters": "章节/卷划分",
  "characters": [{"name":"角色名","personality":"性格","background":"背景"}]
}

小说内容：\n${sampled.slice(0, 12000)}` }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          setPreview(data);
          onExtract(data);
        }
      }
    } catch (err: any) { alert('提取失败：' + (err.message || '未知错误')); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">📤 从小说提取剧本</h3>
        <p className="text-xs text-gray-500 mb-3">
          上传 .txt/.md 小说文件或粘贴文本，AI 自动提取剧本设定。支持百万字级小说。
        </p>
      </div>

      <input type="file" accept=".txt,.md" onChange={handleFile}
        className="block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-purple-700 file:text-white hover:file:bg-purple-600" />

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="或直接粘贴小说文本..."
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500 h-32 resize-none" />

      {text && (
        <div className="text-xs text-gray-500">
          已加载 {text.length.toLocaleString()} 字（采样后约 {Math.min(text.length, 12000).toLocaleString()} 字发送给 AI）
        </div>
      )}

      <button onClick={handleExtract} disabled={loading || !text.trim() || !configId}
        className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg">
        {loading ? '⏳ 提取中...' : '🤖 开始提取'}
      </button>

      {preview && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 space-y-1 text-xs">
          <div className="text-green-400 mb-2">✅ 提取完成：</div>
          {preview.title && <div>📖 标题：{preview.title}</div>}
          {preview.tags && <div>🏷️ 类型：{preview.tags}</div>}
          {preview.worldSetting && <div>🌍 世界观：{preview.worldSetting}</div>}
          {preview.characters && <div>👥 角色：{Array.isArray(preview.characters) ? preview.characters.length : 0} 个</div>}
        </div>
      )}
    </div>
  );
}
