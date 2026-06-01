import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  selectedId?: string | null;
}

export function ConversationList({ conversations, onSelect, onDelete, selectedId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        暂无对话记录
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`bg-gray-800 rounded-lg border p-3 cursor-pointer transition-all hover:border-purple-500/50 flex items-center justify-between ${
            selectedId === conv.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-gray-700'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-200 truncate">
              {conv.title || '未命名对话'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(conv.updatedAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
            className="text-gray-600 hover:text-red-400 p-1 ml-2 text-xs flex-shrink-0"
            title="删除"
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}
