import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  characterName?: string;
  characterAvatar?: string;
  /** Search query for highlighting / 搜索高亮 */
  searchQuery?: string;
  /** Starred highlight / 精彩标注 */
  starred?: boolean;
  onStar?: () => void;
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  // Escape HTML in content first / 先转义HTML
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
}

export function ChatBubble({ role, content, timestamp, characterName, characterAvatar, searchQuery, starred, onStar }: ChatBubbleProps) {
  if (role === 'system') return null;

  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-sm">
        {isUser ? (
          <span>🧑</span>
        ) : characterAvatar ? (
          <img src={`file://${characterAvatar}`} alt={characterName} className="w-full h-full object-cover" />
        ) : (
          <span>🤖</span>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && characterName && (
          <div className="text-xs text-gray-400 mb-1 ml-1">{characterName}</div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-purple-600 text-white rounded-tr-md'
              : 'bg-gray-800 text-gray-100 rounded-tl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: searchQuery ? highlightText(content, searchQuery) : content }} />
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
        {timestamp && (
          <div className={`text-xs text-gray-500 mt-1 flex items-center gap-1 ${isUser ? 'justify-end mr-1' : 'ml-1'}`}>
            <span>{new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            {onStar && (
              <button onClick={onStar} className={`text-xs hover:scale-110 transition-transform ${starred ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-500'}`} title={starred ? '取消标注' : '标注精彩片段'}>
                ⭐
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
