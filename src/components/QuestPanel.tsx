/**
 * Quest tracking panel for chat page — shows main/side quests with auto-detection.
 * 任务追踪面板 — 显示主线/支线任务，支持手动标记和 AI 自动识别进度。
 */
import { useState, useEffect, useRef } from 'react';

interface Quest {
  id: string;
  text: string;
  type: 'main' | 'side';
  status: 'pending' | 'active' | 'done';
  /** AI-generated detail from conversation analysis / AI分析生成的详情 */
  detail?: string;
}

interface Props {
  scriptId: string;
  conversationId?: string | null;
  configId?: string | null;
  mainQuests: string;
  sideQuests: string;
  onClose: () => void;
}

/** Parse quest text into structured items / 将任务文本解析为结构化列表 */
function parseQuests(raw: string, type: 'main' | 'side'): Quest[] {
  if (!raw?.trim()) return [];
  // en: split by newline, numbered prefix, or Chinese separator / 按换行、数字序号、中文分隔符拆分
  const lines = raw
    .split(/[\n,，;；]+/)
    .map(s => s.replace(/^[\d]+[.、．)\s]*/, '').replace(/^[一二三四五六七八九十]+[、.]/, '').trim())
    .filter(s => s.length > 1);
  return lines.map((text, i) => ({
    id: `${type}_${i}`,
    text,
    type,
    status: 'pending' as const,
  }));
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⬜ 未触发',
  active: '🔄 进行中',
  done: '✅ 已完成',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500',
  active: 'text-yellow-400',
  done: 'text-green-400',
};

const STORAGE_KEY_PREFIX = 'quest_state_';

export function QuestPanel({ scriptId, conversationId, configId, mainQuests, sideQuests, onClose }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const savedRef = useRef(false); // eslint-disable-line

  useEffect(() => {
    // Parse quests from script data + merge saved state
    const main = parseQuests(mainQuests, 'main');
    const side = parseQuests(sideQuests, 'side');
    const all = [...main, ...side];
    // Restore saved status
    (async () => {
      try {
        // en: 按对话隔离任务状态 / Per-conversation quest state
        const suffix = conversationId ? `_${conversationId}` : '';
        const key = STORAGE_KEY_PREFIX + scriptId + suffix;
        const raw = await window.electronAPI.getSetting(key);
        if (raw) {
          const saved = JSON.parse(raw);
          all.forEach(q => {
            const entry = saved[q.id];
            if (typeof entry === 'object' && entry !== null) {
              const s = entry.status;
              if (s === 'pending' || s === 'active' || s === 'done') q.status = s;
              if (typeof entry.detail === 'string') q.detail = entry.detail;
            } else if (typeof entry === 'string') {
              if (entry === 'pending' || entry === 'active' || entry === 'done') q.status = entry;
            }
          });
        }
        setQuests(all);
      } catch {
        setQuests(all);
      }
    })();
  }, [scriptId, mainQuests, sideQuests]);

  /** Persist quest state to DB / 持久化任务状态 */
  const persist = async (updated: Quest[]) => {
    const data: Record<string, { status: Quest['status']; detail?: string }> = {};
    updated.forEach(q => { data[q.id] = { status: q.status, detail: q.detail }; });
    const suffix = conversationId ? `_${conversationId}` : '';
    await window.electronAPI.setSetting(STORAGE_KEY_PREFIX + scriptId + suffix, JSON.stringify(data));
  };

  /** Toggle quest status: pending → active → done → pending / 切换任务状态 */
  const toggleStatus = (id: string) => {
    setQuests(prev => {
      const order: Quest['status'][] = ['pending', 'active', 'done'];
      const next = prev.map(q => {
        if (q.id !== id) return q;
        const idx = order.indexOf(q.status);
        return { ...q, status: order[(idx + 1) % order.length] };
      });
      persist(next);
      return next;
    });
  };

  /** AI analysis: scan conversation for quest progress / AI 分析对话中的任务进度 */
  const handleAIAnalyze = async () => {
    if (!conversationId || !configId) return;
    setAnalyzing(true);
    try {
      const msgs = await window.electronAPI.getMessages(conversationId);
      const chatContent = msgs
        .filter(m => m.role !== 'system')
        .map(m => `[${m.role === 'user' ? '主角' : 'AI'}]: ${m.content}`)
        .join('\n');

      const questList = quests.map(q => `- [${q.id}] ${q.text}`).join('\n');
      const prompt = `根据以下对话内容，判断每个任务的状态并生成简短进度说明。返回严格JSON对象，每个任务包含status和detail字段：
{
  "task_id": {"status": "pending/active/done", "detail": "从对话中分析到的任务进度说明（20-50字）"}
}

任务列表：
${questList}

对话内容：
${chatContent.slice(0, 6000)}

状态规则：
- pending: 任务尚未在对话中被提及或触发
- active: 任务已被触发，正在进行中，尚未完成
- done: 任务目标已达成，对话中有明确的完成描述

只输出JSON对象，不要任何额外文字。`;

      const result = await window.electronAPI.discussSettings(configId, 'script',
        { title: '', worldSetting: '', background: '', mainQuests: '', sideQuests: '', environment: '', map: '', data: '' },
        [{ role: 'system', content: prompt }]);

      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const updates: Record<string, { status?: Quest['status']; detail?: string }> = JSON.parse(match[0]);
            setQuests(prev => {
              const next = prev.map(q => {
                const u = updates[q.id];
                if (typeof u === 'object' && u !== null) {
                  return { ...q, status: (u.status as Quest['status']) || q.status, detail: u.detail || q.detail };
                }
                if (typeof u === 'string' && (u === 'pending' || u === 'active' || u === 'done')) {
                  return { ...q, status: u };
                }
                return q;
              });
              persist(next);
              return next;
            });
          } catch { /* parse error */ }
        }
      }
    } catch (err) { console.error('[questPanel] analyze:', err); }
    finally { setAnalyzing(false); }
  };

  const main = quests.filter(q => q.type === 'main');
  const side = quests.filter(q => q.type === 'side');

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-700 flex flex-col z-[60] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <div className="text-sm font-medium text-gray-200">📋 任务追踪</div>
          <div className="text-xs text-gray-500">
            {quests.filter(q => q.status === 'done').length}/{quests.length} 完成
          </div>
        </div>
        <div className="flex gap-2">
          {configId && conversationId && (
            <button onClick={handleAIAnalyze} disabled={analyzing}
              className="text-xs text-green-400 hover:text-green-300 disabled:text-gray-600">
              {analyzing ? '⏳' : '🤖 分析'}
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {quests.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            剧本未设置任务。<br />在剧本管理中填写主线/支线任务后刷新。
          </div>
        )}

        {/* Main quests / 主线任务 */}
        {main.length > 0 && (
          <div>
            <div className="text-xs font-medium text-amber-400 mb-2">🎯 主线任务</div>
            <div className="space-y-1.5">
              {main.map(q => (
                <div key={q.id}>
                  <button
                    onClick={() => setSelectedQuest(selectedQuest === q.id ? null : q.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
                      selectedQuest === q.id ? 'border-purple-500/50' : 'border-transparent hover:border-gray-600'
                    } ${
                      q.status === 'done' ? 'bg-green-900/20' :
                      q.status === 'active' ? 'bg-yellow-900/20' : 'bg-gray-800'
                    }`}
                  >
                    <div className={STATUS_COLORS[q.status]}>{q.text}</div>
                    <div className="text-gray-600 mt-0.5">{STATUS_LABELS[q.status]}</div>
                  </button>
                  {selectedQuest === q.id && (
                    <div className="ml-2 mt-1 mb-2 p-2 bg-gray-800/50 rounded border border-gray-700/50">
                      {q.detail ? (
                        <p className="text-xs text-gray-400 leading-relaxed">{q.detail}</p>
                      ) : (
                        <p className="text-xs text-gray-600">暂无详情，点击 🤖 分析让 AI 自动识别</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => toggleStatus(q.id)}
                          className="text-xs text-purple-400 hover:text-purple-300">切换状态</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side quests / 支线任务 */}
        {side.length > 0 && (
          <div>
            <div className="text-xs font-medium text-blue-400 mb-2">📌 支线任务</div>
            <div className="space-y-1.5">
              {side.map(q => (
                <div key={q.id}>
                  <button
                    onClick={() => setSelectedQuest(selectedQuest === q.id ? null : q.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
                      selectedQuest === q.id ? 'border-purple-500/50' : 'border-transparent hover:border-gray-600'
                    } ${
                      q.status === 'done' ? 'bg-green-900/20' :
                      q.status === 'active' ? 'bg-yellow-900/20' : 'bg-gray-800'
                    }`}
                  >
                    <div className={STATUS_COLORS[q.status]}>{q.text}</div>
                    <div className="text-gray-600 mt-0.5">{STATUS_LABELS[q.status]}</div>
                  </button>
                  {selectedQuest === q.id && (
                    <div className="ml-2 mt-1 mb-2 p-2 bg-gray-800/50 rounded border border-gray-700/50">
                      {q.detail ? (
                        <p className="text-xs text-gray-400 leading-relaxed">{q.detail}</p>
                      ) : (
                        <p className="text-xs text-gray-600">暂无详情，点击 🤖 分析让 AI 自动识别</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => toggleStatus(q.id)}
                          className="text-xs text-purple-400 hover:text-purple-300">切换状态</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
