import { useState, useRef, useEffect, memo } from 'react';

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
  chatMode?: '1v1' | 'world';
  scriptId?: string;
}

export const ChatInput = memo(function ChatInput({
  inputValue, setInputValue, isStreaming, shortcutBar, shortcutsExpanded,
  setShortcutsExpanded, activeConfigId, failoverConfigId, sendMessage,
  recentMessages, characterName, banghuiEnabled, chatMode, scriptId,
}: Props) {
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionChars, setMentionChars] = useState<{ id: string; name: string }[]>([]);
  const [showMention, setShowMention] = useState(false);

  /** Debounce timer for @mention query to avoid excessive DB reads on fast typing.
   *  防抖定时器——快速输入时减少数据库查询次数。 */
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Watch input for '@' — load matching characters from the script roster for autocomplete.
   *  监听输入中的@符号，从剧本角色列表加载匹配角色名供补全。
   *  Debounced at 300ms + stale-query guard to prevent thundering-herd on fast typing.
   *  300ms 防抖 + 过期查询防护，避免快速输入时的数据库风暴。 */
  useEffect(() => {
    if (chatMode !== 'world' || !scriptId) return;
    const atIdx = inputValue.lastIndexOf('@');
    if (atIdx < 0) { setShowMention(false); return; }

    const q = inputValue.slice(atIdx + 1);
    if (q.includes(' ')) { setShowMention(false); return; }

    // Clear previous timer — debounce / 清除上一次定时器
    if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);

    mentionTimerRef.current = setTimeout(() => {
      setMentionQuery(q);
      (async () => {
        try {
          const chars = await window.electronAPI.getCharacters(scriptId);
          const filtered = chars.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
          // Only show results if the query hasn't changed / 只在查询未变时展示结果
          if (inputValue.includes('@' + q)) {
            if (filtered.length > 0) { setMentionChars(filtered.slice(0, 5)); setShowMention(true); }
            else { setShowMention(false); }
          }
        } catch { setShowMention(false); }
      })();
    }, 300);

    return () => { if (mentionTimerRef.current) { clearTimeout(mentionTimerRef.current); mentionTimerRef.current = null; } };
  }, [inputValue, chatMode, scriptId]);

  const handleSend = () => {
    let c = inputValue.trim();
    if (!c || isStreaming || !activeConfigId) return;
    // ⚡ @私聊: wrap message as a private-chat instruction for that NPC / 将消息包装为私聊指令
    if (chatMode === 'world') {
      // en: Match @name — Chinese 2-4 chars or Latin word, stops at space / 匹配@角色名（中文2-4字或拉丁词，空格截止）
      const atMatch = c.match(/@([\u4e00-\u9fff]{2,4}|[\p{L}\p{N}_]+)/u);
      if (atMatch) {
        const name = atMatch[1];
        // en: Remove only the @name prefix, keep the message / 只删除@角色名前缀，保留消息内容
        const message = c.replace(atMatch[0], '').trim();
        c = `[私聊] 现在你暂时扮演 ${name}，请以该角色的性格语气回复。\n\n${message ? `我：${message}` : ''}`;
      }
    }
    setInputValue('');
    sendMessage(activeConfigId, c, failoverConfigId ?? undefined);
  };

  const selectMention = (name: string) => {
    const atIdx = inputValue.lastIndexOf('@');
    if (atIdx >= 0) {
      setInputValue(inputValue.slice(0, atIdx) + '@' + name + ' ');
    }
    setShowMention(false);
  };

  const handleAIGenerate = async () => {
    if (replyLoading || !activeConfigId || recentMessages.length < 2) return;
    setReplyLoading(true);
    try {
      const chatHistory = recentMessages.map(m => `[${m.role === 'user' ? '主角' : characterName || 'NPC'}]: ${m.content}`).join('\n');
      const result = await window.electronAPI.discussSettings(activeConfigId, 'character',
        { name: characterName || '', personality: '', background: '', speakingStyle: '', appearance: '' },
        [{ role: 'system', content: `根据以下对话，为用户主角生成3个自然流畅的回复选项。每个选项10-30字左右，符合当前情境和角色关系。严格用|分隔，不加编号。\n\n对话：\n${chatHistory}` }]);
      if (result.error) {
        console.error('[AIGenerate] API error:', result.error);
        setAiReplies(['❌ ' + result.error]);
      } else if (result.reply) {
        const items = result.reply.split(/[|、]/).map(s => s.replace(/^\s*\d+[\.\、\)）]\s*/, '').trim()).filter(Boolean).slice(0, 3);
        if (items.length > 0) setAiReplies(items);
        else setAiReplies(['AI 未生成有效回复，请重试']);
      } else {
        setAiReplies(['AI 无响应，请检查网络或API配置']);
      }
    } catch (err: any) {
      console.error('[AIGenerate]', err);
      setAiReplies(['❌ ' + (err.message || '未知错误')]);
    }
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

      {showMention && mentionChars.length > 0 && (
        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700">
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <div className="flex gap-1.5 flex-wrap">
              {mentionChars.map(c => (
                <button key={c.id} onClick={() => selectMention(c.name)}
                  className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-purple-900/40 border border-gray-600 hover:border-purple-500 text-gray-300 hover:text-purple-300 rounded-full transition-colors">
                  @{c.name}
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
            className="w-12 h-12 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" title="AI 写回复">
            <span className="text-sm">{replyLoading ? '⏳' : '✨'}</span>
          </button>
          <button onClick={handleSend} disabled={!inputValue.trim() || isStreaming}
            className="px-6 h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium flex-shrink-0 flex items-center transition-opacity">发送</button>
        </div>
      </div>
    </>
  );
});
