/**
 * Novel Importer — upload novel, extract script settings via AI.
 * 小说导入器 — 上传小说，通过 AI 提取剧本设定。
 */
import { useState } from 'react';
import { sampleNovel } from '@/lib/novelUtils';

interface Props {
  configId: string | null;
  scriptId?: string | null;
  onExtract: (fields: any) => void;
}

export function NovelImporter({ configId, scriptId, onExtract }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'extract' | 'style'>('extract');
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
        [{ role: 'system', content: `从以下小说片段中提取完整剧本设定。输出严格JSON：

{
  "title": "小说名",
  "worldSetting": "世界观概括（100字内）",
  "background": "故事背景（150字内）",
  "tags": "类型标签（逗号分隔，如：玄幻,升级流,爽文）",
  "mainQuests": "主线任务（每条用换行分隔）",
  "sideQuests": "支线任务（每条用换行分隔）",
  "referenceWorks": "对标作品（1-3部，逗号分隔）",
  "eraBackground": "时代背景（如：古代架空仙侠世界）",
  "protagonistDilemma": "主角困境（宏观+中观+微观+个人四层）",
  "coreCheat": "金手指/核心信息差",
  "chapters": "章节/卷划分（每卷一行）",
  "environment": "环境描述（气候/地理/建筑/科技水平）",
  "map": "地图（区域/关键地点/路径）",
  "data": "其他设定（势力/等级/货币/特殊规则）",
  "timeline": "事件时间线",
  "ageRule": "适用年龄（全年龄/16+/18+）",
  "lorebook": [{"keywords":"关键词1,关键词2","content":"注入内容"}],
  "characters": [{"name":"角色名","personality":"性格","background":"背景","speakingStyle":"口癖","appearance":"外貌","firstMessage":"开场白","exampleDialogue":"用户：xxx\\n角色：xxx\\n用户：xxx\\n角色：xxx"}]
}

只输出JSON，不要任何额外文字。

小说内容：\n${sampled.slice(0, 13000)}` }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const data = JSON.parse(match[0]);
            setPreview(data);

            // Pass characters to onExtract — ScriptsPage creates them after script is saved
            // 角色数据传给onExtract——剧本保存后由ScriptsPage创建
            onExtract(data);
          } catch (err) { alert('AI返回格式异常，请重试'); }
        }
      }
    } catch (err: any) { alert('提取失败：' + (err.message || '未知错误')); }
    finally { setLoading(false); }
  };

  const handleAnalyzeStyle = async () => {
    if (!text.trim() || !configId || !scriptId) return;
    setLoading(true);
    try {
      // Sample 3 representative passages / 选取3段代表性文字
      const head = text.slice(0, 500);
      const mid = text.slice(Math.floor(text.length * 0.4), Math.floor(text.length * 0.4) + 500);
      const tail = text.slice(-500);
      const samples = [head, mid, tail].filter(Boolean).join('\n\n---\n\n');

      const result = await window.electronAPI.discussSettings(configId, 'script',
        { title: '', worldSetting: '', background: '', mainQuests: '', sideQuests: '', environment: '', map: '', data: '' },
        [{ role: 'system', content: `分析以下小说的文风，输出JSON：
{"styleProfile":"## 参考示例（严格模仿此风格写作）\\n\\n${samples.slice(0, 2000).replace(/\n/g, '\\n')}\\n\\n## 风格要点\\n- 句式特点：...\\n- 用词风格：...\\n- 描写密度：...\\n- 对话风格：...\\n- 节奏控制：...\\n- 叙事视角：...\\n\\n请灵活运用以上风格，不必逐字模仿。"}

只输出JSON` }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          if (data.styleProfile) {
            await window.electronAPI.setSetting('style_profile_' + scriptId, data.styleProfile);
            setPreview({ styleProfile: data.styleProfile });
          }
        }
      }
    } catch (err: any) { alert('分析失败：' + (err.message || '未知错误')); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          {mode === 'extract' ? '📤 从小说提取剧本' : '📝 分析作者文风'}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {mode === 'extract' ? '上传 .txt/.md 小说或粘贴文本，AI提取剧本设定' : 'AI分析小说文风，生成风格模仿提示词'}
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={() => { setMode('extract'); setPreview(null); }}
          className={`px-3 py-1 text-xs rounded ${mode === 'extract' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400'}`}>
          📤 提取剧本
        </button>
        <button onClick={() => { setMode('style'); setPreview(null); }}
          className={`px-3 py-1 text-xs rounded ${mode === 'style' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400'}`}>
          📝 分析文风
        </button>
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

      <button onClick={mode === 'extract' ? handleExtract : handleAnalyzeStyle} disabled={loading || !text.trim() || !configId || (mode === 'style' && !scriptId)}
        className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg">
        {loading ? '⏳ 处理中...' : mode === 'extract' ? '🤖 开始提取' : '📝 分析文风'}
      </button>

      {preview && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 space-y-1 text-xs">
          <div className="text-green-400 mb-2">✅ 提取完成：</div>
          {preview.title && <div>📖 标题：{preview.title}</div>}
          {preview.tags && <div>🏷️ 类型：{preview.tags}</div>}
          {preview.worldSetting && <div className="truncate">🌍 世界观：{preview.worldSetting}</div>}
          {preview.mainQuests && <div>🎯 主线：已提取</div>}
          {preview.chapters && <div>📑 章节：{preview.chapters.split(/[\n,]/).filter(Boolean).length} 卷</div>}
          {preview.lorebook && <div>🌐 世界信息：{Array.isArray(preview.lorebook) ? preview.lorebook.length : 0} 条</div>}
          {preview.characters && <div>👥 角色：{Array.isArray(preview.characters) ? preview.characters.length : 0} 个（保存剧本时自动创建）</div>}
        </div>
      )}
    </div>
  );
}
