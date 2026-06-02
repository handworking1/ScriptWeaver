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
}

export function ChatInput({
  inputValue, setInputValue, isStreaming, shortcutBar, shortcutsExpanded,
  setShortcutsExpanded, activeConfigId, failoverConfigId, sendMessage,
}: Props) {
  const handleSend = () => {
    const c = inputValue.trim();
    if (!c || isStreaming || !activeConfigId) return;
    setInputValue('');
    sendMessage(activeConfigId, c, failoverConfigId ?? undefined);
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
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="输入消息... (Enter 发送)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-12"
            rows={1} disabled={isStreaming} />
          <button onClick={handleSend} disabled={!inputValue.trim() || isStreaming}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium flex-shrink-0">发送</button>
        </div>
      </div>
    </>
  );
}
