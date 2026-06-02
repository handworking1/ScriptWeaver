/**
 * Bottom action bar for AI Discuss page.
 * Contains: textarea, undo, extract characters, apply/generate, send buttons.
 *
 * AI 讨论页底部操作栏。包含输入框、撤回、提取角色、应用/生成、发送按钮。
 */

interface DiscussActionBarProps {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  generating: boolean;
  extracting: boolean;
  applying: boolean;
  targetScriptId: string;
  /** Whether targetScriptId is a real script (not new_* discussion) / 是否为真实剧本（非新建讨论） */
  isRealScript: boolean;
  messagesLen: number;
  activeConfigId: string | null;
  onSend: () => void;
  onUndo: () => void;
  onExtractChars: () => void;
  onApply: () => void;
  onGenerate: () => void;
}

export function DiscussActionBar({
  input, setInput, loading, generating, extracting, applying,
  targetScriptId: _targetScriptId, isRealScript, messagesLen, activeConfigId,
  onSend, onUndo, onExtractChars, onApply, onGenerate,
}: DiscussActionBarProps) {
  return (
    <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
      <div className="max-w-3xl mx-auto flex gap-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="输入你的剧本想法... (Enter 发送)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-12"
          rows={1}
          disabled={loading || !activeConfigId}
        />
        <button onClick={onUndo} disabled={messagesLen < 2 || loading}
          className="px-4 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-300 rounded-xl text-sm font-medium flex-shrink-0 flex items-center"
          title="撤回最后一轮对话">↩ 撤回</button>
        <button onClick={onExtractChars} disabled={extracting || messagesLen === 0 || !activeConfigId}
          className="px-4 h-12 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0 flex items-center">
          {extracting ? '⏳' : '👥 角色'}
        </button>
        {isRealScript ? (
          <button onClick={onApply} disabled={applying || messagesLen === 0 || !activeConfigId}
            className="px-4 h-12 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0 flex items-center">
            {applying ? '⏳' : '📥 应用'}
          </button>
        ) : (
          <button onClick={onGenerate} disabled={generating || messagesLen === 0 || !activeConfigId}
            className="px-4 h-12 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0 flex items-center">
            {generating ? '⏳' : '📝 生成'}
          </button>
        )}
        <button onClick={onSend} disabled={!input.trim() || loading || !activeConfigId}
          className="px-5 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0 flex items-center">
          发送
        </button>
      </div>
    </div>
  );
}
