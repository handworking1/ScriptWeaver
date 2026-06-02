import { useState } from 'react';

interface Props {
  inputValue: string;
  setInputValue: (v: string) => void;
  isStreaming: boolean;
  shortcutBar: string[];
  shortcutsExpanded: boolean;
  setShortcutsExpanded: (v: boolean) => void;
  activeConfigId: string | null;
  failoverConfigId: string | null;
  sendMessage: (configId: string, text: string, failover?: string) => void;
  recentMessages: { role: string; content: string }[];
  characterName?: string;
  banghuiEnabled?: boolean;
}

export function ChatInput({
  inputValue, setInputValue, isStreaming, shortcutBar, shortcutsExpanded,
  setShortcutsExpanded, activeConfigId, failoverConfigId, sendMessage,
  recentMessages, characterName, banghuiEnabled,
}: Props) {
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);

  const handleSend = () => {
    const c = inputValue.trim();
    if (!c || isStreaming || !activeConfigId) return;
    setInputValue('');
    sendMessage(activeConfigId, c, failoverConfigId ?? undefined);
  };

  const handleAIGenerate = async () => {
    if (replyLoading || !activeConfigId || recentMessages.length < 2) return;
    setReplyLoading(true);
    try {
      const chatHistory = recentMessages.map(m => `[${m.role === 'user' ? '主角' : characterName || 'NPC'}]: ${m.content}`).join('\n');
      const result = await window.electronAPI.discussSettings(activeConfigId, 'character',
        { name: characterName || '', personality: '', background: '', speakingStyle: '', appearance: '' },
        [{ role: 'system', content: `根据以下对话，为用户主角生成3个自然流畅的回复选项。每个选项10-30字左右，符合当前情境和角色关系。严格用|分隔，不加编号。\n\n对话：\n${chatHistory}` }]);
      if (result.reply) {
        const items = result.reply.split(/[|、]/).map(s => s.replace(/^\s*\d+[\.\、\)）]\s*/, '').trim()).filter(Boolean).slice(0, 3);
        if (items.length > 0) setAiReplies(items);
      }
    } catch (err) { console.error('[AIGenerate]', err); }
    finally { setReplyLoading(false); }
  };

  return (
    <>
      {shortcutBar.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-1 px-2 py-0.5">
            <button onClick={() => setShortcutsExpanded(!shortcutsExpanded)} className="text-xs text-gray-600 hover:text-gray-400">
              {shortcutsExpanded ? '▼' : '▶'} 快捷
            </button>
          </div>
          {shortcutsExpanded && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap max-w-3xl mx-auto">
              {shortcutBar.map((s, i) => (
                <button key={i} onClick={() => { if (!isStreaming && activeConfigId) sendMessage(activeConfigId, s, failoverConfigId ?? undefined); }}
                  disabled={isStreaming} className="px-2.5 py-1 text-xs bg-gray-800 border border-gray-700 hover:border-purple-500/50 text-gray-400 hover:text-gray-200 rounded-full disabled:opacity-40">{s}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI reply suggestions */}
      {aiReplies.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
              <span>✨ AI 建议回复</span>
              <button onClick={handleAIGenerate} disabled={replyLoading} className="text-purple-400 hover:text-purple-300 disabled:text-gray-600">
                {replyLoading ? '⏳' : '🔄 换一批'}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {aiReplies.map((r, i) => (
                <button key={i} onClick={() => { setInputValue(r); setAiReplies([]); }}
                  className="px-3 py-1.5 text-xs bg-gray-800 border border-purple-500/30 hover:border-purple-400 text-gray-300 hover:text-gray-100 rounded-lg transition-colors text-left max-w-xs truncate">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={banghuiEnabled ? '输入消息或帮回指令...' : '输入消息... (Enter 发送)'}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-12"
            rows={1} disabled={isStreaming} />
          <button onClick={handleAIGenerate} disabled={replyLoading || isStreaming || !activeConfigId || recentMessages.length < 2}
            className="px-4 py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0 transition-colors" title="AI 写回复">
            {replyLoading ? '⏳ 生成中' : '✨ AI写'}
          </button>
          <button onClick={handleSend} disabled={!inputValue.trim() || isStreaming}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium flex-shrink-0">发送</button>
        </div>
      </div>
    </>
  );
}
