interface Props {
  characterName?: string;
  characterAvatar?: string;
  scriptTitle?: string;
  chatMode: '1v1' | 'world';
  isStreaming: boolean;
  displayMessagesLen: number;
  onBack: () => void;
  onStop: () => void;
  onSummary: () => void;
  onBranch: () => void;
  onRegenerate: () => void;
  onConvList: () => void;
  onCompendium: () => void;
  showCompendium: boolean;
  selectedScriptId: string | null;
}

export function ChatHeader({
  characterName, characterAvatar, scriptTitle, chatMode, isStreaming,
  displayMessagesLen, onBack, onStop, onSummary, onBranch, onRegenerate,
  onConvList, onCompendium, showCompendium, selectedScriptId,
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
          <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
            {characterAvatar ? <img src={`file://${characterAvatar}`} className="w-full h-full object-cover" /> : <span className="text-xs">{characterName?.charAt(0) ?? '?'}</span>}
          </div>
          <div className="text-sm font-medium text-gray-200">{characterName ?? '未知'}</div>
          <div className="text-xs text-gray-500">{scriptTitle ?? ''}</div>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {isStreaming && <><span className="text-xs text-purple-400 animate-pulse">回复中...</span><button onClick={onStop} className="px-2 py-0.5 text-xs bg-red-900/50 text-red-300 rounded">停止</button></>}
        <button onClick={onSummary} disabled={isStreaming || displayMessagesLen === 0} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="总结">📋 总结</button>
        <button onClick={onBranch} disabled={isStreaming || displayMessagesLen === 0} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="分支">🔀 分支</button>
        <button onClick={onRegenerate} disabled={isStreaming || displayMessagesLen === 0} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded" title="重新生成">🔄 重新生成</button>
        {selectedScriptId && <><button onClick={onConvList} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">💬 对话</button>
        <button onClick={onCompendium} className={`px-2 py-1 text-xs rounded ${showCompendium ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>📖 图鉴</button></>}
      </div>
    </div>
  );
}
