import { useState, useEffect, useRef } from 'react';
import { RelationGraph } from './RelationGraph';

interface CharEntry {
  id: string;
  name: string;
  personality: string;
  favorability: number;
  bodyType: string;
  kinks: string;
  status: string;
  notes: string;
}

interface Props {
  scriptId: string;
  conversationId?: string | null;
  configId?: string | null;
  onClose: () => void;
}

function defaultChar(id: string): CharEntry {
  return { id, name: '', personality: '', favorability: 50, bodyType: '', kinks: '', status: '', notes: '' };
}

export function CharacterCompendium({ scriptId, conversationId, configId, onClose }: Props) {
  const [chars, setChars] = useState<CharEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  /** Relations / 关系图 */
  const [relations, setRelations] = useState<{ from: string; to: string; type: string; strength: number; note: string }[]>([]);
  const [tab, setTab] = useState<'chars' | 'relations'>('chars');
  /** Cleanup timer ref / 清理定时器引用 */
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /** Load relations / 加载关系图 */
  const loadRelations = async () => {
    try {
      const d = await window.electronAPI.getSetting(`relation_map_${scriptId}`);
      if (d) setRelations(JSON.parse(d));
    } catch { /* none */ }
  };
  const saveRelations = async (updated: typeof relations) => {
    setRelations(updated);
    await window.electronAPI.setSetting(`relation_map_${scriptId}`, JSON.stringify(updated));
  };

  const load = async () => {
    try {
      const data = await window.electronAPI.getSetting(`compendium_${scriptId}`);
      if (data) setChars(JSON.parse(data));
    } catch (err) { console.error('[compendium] load:', err); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); return () => clearTimeout(savedTimerRef.current); }, []);

  /** Persist to IPC and show saved indicator / 持久化到IPC并显示已保存指示 */
  const persist = async (updated: CharEntry[]) => {
    await window.electronAPI.setSetting(`compendium_${scriptId}`, JSON.stringify(updated));
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  /** Track user-initiated edits with debounce / 追踪编辑并防抖持久化 */
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (dirtyRef.current) {
      dirtyRef.current = false;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => persist(chars), 800);
    }
    return () => clearTimeout(debounceRef.current);
  }, [chars]);

  /** Atomic char update: func updater prevents stale-closure; persist via useEffect / 函数式更新防闭包陈旧；通过 useEffect 持久化 */
  const addChar = () => {
    dirtyRef.current = true;
    setChars(prev => [...prev, defaultChar(Date.now().toString())]);
  };
  const removeChar = (id: string) => {
    dirtyRef.current = true;
    setChars(prev => prev.filter(c => c.id !== id));
  };
  const updateChar = (id: string, patch: Partial<CharEntry>) => {
    dirtyRef.current = true;
    setChars(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  // ── AI analysis ─────────────────────────────────────
  const handleAIAnalyze = async () => {
    if (!conversationId || !configId) return;
    setAnalyzing(true);
    try {
      const msgs = await window.electronAPI.getMessages(conversationId);
      const chatContent = msgs.filter(m => m.role !== 'system').map(m => `[${m.role === 'user' ? '主角' : '角色'}]: ${m.content}`).join('\n');

      const prompt = `分析以下对话，提取所有出场角色（不包括"主角"）的信息。返回严格JSON数组：
[{"name":"角色名","personality":"性格特征","favorability":50,"bodyType":"身材外貌","kinks":"性癖偏好","status":"当前状态","notes":"与主角的关系和互动摘要"}]

对话内容：
${chatContent.slice(0, 8000)}`;

      const result = await window.electronAPI.discussSettings(configId, 'character',
        { name: '', personality: '', background: '', speakingStyle: '', appearance: '' },
        [{ role: 'system', content: prompt }]);
      if (result.reply) {
        const match = result.reply.match(/\[[\s\S]*?\]/);
        if (match) {
          try {
            const analyzed: Partial<CharEntry>[] = JSON.parse(match[0]);
            // en: 基于当前 chars 快照构建合并结果，无竞态风险（analyzing 守卫保证单次执行）
            const merged = [...chars];
            for (const a of analyzed) {
              const existing = merged.find(c => c.name === a.name);
              if (existing) {
                Object.assign(existing, { personality: a.personality || existing.personality, favorability: a.favorability ?? existing.favorability, bodyType: a.bodyType || existing.bodyType, kinks: a.kinks || existing.kinks, status: a.status || existing.status, notes: a.notes || existing.notes });
              } else if (a.name) {
                merged.push({ id: Date.now().toString() + Math.random().toString(36).slice(2), name: a.name, personality: a.personality || '', favorability: a.favorability ?? 50, bodyType: a.bodyType || '', kinks: a.kinks || '', status: a.status || '', notes: a.notes || '' });
              }
            }
            setChars(merged);
            persist(merged);
          } catch (err) { console.error('[compendium] parse:', err); }
        }
      }
    } catch (err) { console.error('[compendium] analyze:', err); }
    finally { setAnalyzing(false); }
  };

  const getFavorColor = (v: number) => {
    if (v >= 80) return 'text-pink-400';
    if (v >= 60) return 'text-green-400';
    if (v >= 40) return 'text-gray-300';
    if (v >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFavorLabel = (v: number) => {
    if (v >= 90) return '❤️ 挚爱';
    if (v >= 75) return '💕 喜欢';
    if (v >= 55) return '😊 友好';
    if (v >= 35) return '😐 中立';
    if (v >= 15) return '😒 冷淡';
    return '😠 敌视';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-700 flex flex-col z-[60] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setTab('chars')} className={`text-sm ${tab === 'chars' ? 'font-medium text-purple-400' : 'text-gray-500'}`}>📖 图鉴</button>
            <button onClick={() => { loadRelations(); setTab('relations'); }} className={`text-sm ${tab === 'relations' ? 'font-medium text-purple-400' : 'text-gray-500'}`}>🔗 关系</button>
          </div>
          <div className="text-xs text-gray-500">{chars.length} 个角色 · {relations.length} 条关系</div>
        </div>
        <div className="flex gap-2">
          {configId && conversationId && (
            <button onClick={handleAIAnalyze} disabled={analyzing}
              className="text-xs text-green-400 hover:text-green-300 disabled:text-gray-600">
              {analyzing ? '⏳' : '🤖 分析'}
            </button>
          )}
          <button onClick={addChar} className="text-xs text-purple-400 hover:text-purple-300">+ 添加</button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      </div>

      {saved && <div className="px-4 py-1 bg-green-900/30 text-green-400 text-xs text-center">✓ 已保存</div>}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'relations' ? (
          <RelationGraph chars={chars} relations={relations} onChange={saveRelations}
            onAddRelation={r => saveRelations([...relations, r])} />
        ) : (
        <>{chars.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            点击 🤖 分析 让 AI 自动从对话中提取角色信息
          </div>
        )}
        {chars.map((c) => (
          <div key={c.id} className="bg-gray-800 rounded-xl border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <input value={c.name} onChange={(e) => updateChar(c.id, { name: e.target.value })}
                className="bg-transparent text-sm font-medium text-gray-100 focus:outline-none border-b border-transparent focus:border-purple-500 w-24"
                placeholder="角色名" />
              <button onClick={() => removeChar(c.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
            </div>

            <input value={c.personality} onChange={(e) => updateChar(c.id, { personality: e.target.value })}
              className="w-full bg-gray-900 rounded px-2 py-1 text-xs text-gray-300 mb-2 focus:outline-none focus:border-purple-500 border border-gray-700"
              placeholder="性格..." />

            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">好感度</span>
                <span className={getFavorColor(c.favorability)}>{c.favorability} · {getFavorLabel(c.favorability)}</span>
              </div>
              <input type="range" min={0} max={100} value={c.favorability}
                onChange={(e) => updateChar(c.id, { favorability: parseInt(e.target.value) })}
                className="w-full h-1 accent-purple-500" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={c.bodyType} onChange={(e) => updateChar(c.id, { bodyType: e.target.value })}
                className="bg-gray-900 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-purple-500 border border-gray-700"
                placeholder="身材..." />
              <input value={c.kinks} onChange={(e) => updateChar(c.id, { kinks: e.target.value })}
                className="bg-gray-900 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-purple-500 border border-gray-700"
                placeholder="性癖..." />
            </div>

            <input value={c.status} onChange={(e) => updateChar(c.id, { status: e.target.value })}
              className="w-full bg-gray-900 rounded px-2 py-1 text-xs text-gray-300 mb-2 focus:outline-none focus:border-purple-500 border border-gray-700"
              placeholder="状态：健康/受伤/昏迷..." />

            <textarea value={c.notes} onChange={(e) => updateChar(c.id, { notes: e.target.value })}
              className="w-full bg-gray-900 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-purple-500 border border-gray-700 h-12 resize-none"
              placeholder="备注、关系、特殊能力..." />
          </div>
        ))}
        </>)}
      </div>
    </div>
  );
}
