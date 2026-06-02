interface Props {
  characterName?: string;
  characterAvatar?: string;
  scriptTitle?: string;
  chatMode: '1v1' | 'world';
  isStreaming: boolean;
  displayMessagesLen: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onBack: () => void;
  onStop: () => void;
  onSummary: () => void;
  onBranch: () => void;
  onRegenerate: () => void;
  onUndo: () => void;
  onConvList: () => void;
  onCompendium: () => void;
  showCompendium: boolean;
  onScriptPreview: () => void;
  showScriptPreview: boolean;
  onQuestList: () => void;
  showQuestList: boolean;
  hasQuests: boolean;
  selectedScriptId: string | null;
}

export function ChatHeader({
  characterName, characterAvatar, scriptTitle, chatMode, isStreaming,
  displayMessagesLen, searchQuery, onSearchChange,
  onBack, onStop, onSummary, onBranch, onRegenerate, onUndo,
  onConvList, onCompendium, showCompendium,
  onScriptPreview, showScriptPreview,
  onQuestList, showQuestList, hasQuests,
  selectedScriptId,
}: Props) {
  return (
    <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 flex-wrap">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm">← 返回</button>
      {chatMode === 'world' ? (
        <>
          <span className="text-lg">🌍</span>
          <div>
            <div className="text-sm font-medium text-gray-200">{scriptTitle ?? '未知'}</div>
            <div className="text-xs text-purple-400">世界参与模式</div>
          </div>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: characterAvatar ? 'transparent' : (characterName ? `hsl(${characterName.charCodeAt(0) * 37 % 360}, 40%, 30%)` : '#374151') }}>
            {characterAvatar ? <img src={`file://${characterAvatar}`} className="w-full h-full object-cover" /> : <span className="text-base font-medium text-white">{characterName?.charAt(0) ?? '?'}</span>}
          </div>
          <div className="text-sm font-medium text-gray-200">{characterName ?? '未知'}</div>
          <div className="text-xs text-gray-500">{scriptTitle ?? ''}</div>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {/* Search bar / 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 搜索对话..."
            className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs">✕</button>
          )}
        </div>
        {isStreaming && <><span className="text-xs text-purple-400 animate-pulse">回复中...</span><button onClick={onStop} className="px-2 py-0.5 text-xs bg-red-900/50 text-red-300 rounded">停止</button></>}
        {!isStreaming && displayMessagesLen > 0 && <button onClick={onSummary} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="总结">📋</button>}
        {!isStreaming && displayMessagesLen > 0 && <button onClick={onBranch} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="分支">🔀</button>}
        {!isStreaming && displayMessagesLen > 0 && <button onClick={onRegenerate} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="重新生成">🔄</button>}
        {!isStreaming && displayMessagesLen > 0 && <button onClick={onUndo} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="撤销最后一条消息">↩</button>}
        {selectedScriptId && <><button onClick={onConvList} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">💬 对话</button>
        <button onClick={onScriptPreview} className={`px-2 py-1 text-xs rounded ${showScriptPreview ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>📜 剧本</button>
        {hasQuests && <button onClick={onQuestList} className={`px-2 py-1 text-xs rounded ${showQuestList ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>📋 任务</button>}
        <button onClick={onCompendium} className={`px-2 py-1 text-xs rounded ${showCompendium ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>📖 图鉴</button></>}
      </div>
    </div>
  );
}
