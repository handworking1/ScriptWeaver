import { ChatBubble } from '@/components/ChatBubble';
import { QuickReplies } from '@/components/QuickReplies';
import { SummaryCard } from '@/components/SummaryCard';
import type { Message } from '@/types';

interface Props {
  displayMessages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
  suggestions: { text: string }[];
  showSummary: boolean;
  summaryContent: string;
  summaryLoading: boolean;
  summaryError: string;
  characterName?: string;
  characterAvatar?: string;
  editingMessageId: string | null;
  editContent: string;
  setEditContent: (v: string) => void;
  onEditSave: (msg: Message) => void;
  onEditCancel: () => void;
  onQuickReply: (text: string) => void;
  onDismissSummary: () => void;
  onCopySummary: () => void;
}

export function ChatMessages({
  displayMessages, streamingContent, isStreaming, error, suggestions,
  showSummary, summaryContent, summaryLoading, summaryError,
  characterName, characterAvatar,
  editingMessageId, editContent, setEditContent, onEditSave, onEditCancel,
  onQuickReply, onDismissSummary, onCopySummary,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto">
        {showSummary && <SummaryCard summary={summaryContent} loading={summaryLoading} error={summaryError} onClose={onDismissSummary} onCopy={onCopySummary} />}
        {displayMessages.map((msg) => (
          <div key={msg.id} className="group relative">
            {editingMessageId === msg.id ? (
              <div className="flex gap-2 mb-4">
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 bg-gray-800 border border-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none resize-none h-20" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave(msg); } if (e.key === 'Escape') onEditCancel(); }} />
                <div className="flex flex-col gap-1">
                  <button onClick={() => onEditSave(msg)} className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg">保存</button>
                  <button onClick={onEditCancel} className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded-lg">取消</button>
                </div>
              </div>
            ) : (
              <div>
                <ChatBubble role={msg.role} content={msg.content} timestamp={msg.timestamp} characterName={characterName} characterAvatar={characterAvatar} />
                <div className={`flex gap-1 mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {msg.role === 'user' && <button onClick={() => {}} className="text-xs text-gray-600 hover:text-gray-400 px-1">✏️</button>}
                </div>
              </div>
            )}
          </div>
        ))}
        {isStreaming && streamingContent && <ChatBubble role="assistant" content={streamingContent} characterName={characterName} characterAvatar={characterAvatar} />}
        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300 mb-4">❌ {error}</div>}
        {suggestions.length > 0 && !isStreaming && <QuickReplies suggestions={suggestions.map((s) => s.text)} onSelect={onQuickReply} disabled={isStreaming} />}
      </div>
    </div>
  );
}
