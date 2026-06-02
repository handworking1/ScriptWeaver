import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  characterName?: string;
  characterAvatar?: string;
  /** Search query for highlighting / 搜索高亮 */
  searchQuery?: string;
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
}

export function ChatBubble({ role, content, timestamp, characterName, characterAvatar, searchQuery }: ChatBubbleProps) {
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
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
            {new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
