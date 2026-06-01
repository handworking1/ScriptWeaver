interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ suggestions, onSelect, disabled }: QuickRepliesProps) {
  if (!suggestions.length) return null;

  return (
    <div className="mb-4 mt-1">
      <div className="text-xs text-gray-500 mb-2">📋 可选行动：</div>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="w-full text-left px-4 py-2.5 bg-gray-800 border border-gray-700 hover:border-purple-500/50 hover:bg-gray-750 text-sm text-gray-200 rounded-xl transition-all disabled:opacity-50 flex items-center gap-3 group"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 group-hover:bg-purple-900/50 text-xs flex items-center justify-center text-gray-400 group-hover:text-purple-300 transition-colors">
              {i + 1}
            </span>
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
