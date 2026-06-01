interface SummaryCardProps {
  summary: string;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onCopy: () => void;
}

export function SummaryCard({ summary, loading, error, onClose, onCopy }: SummaryCardProps) {
  return (
    <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-300">📋 剧情总结</h3>
        <div className="flex gap-2">
          {summary && (
            <button
              onClick={onCopy}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              📋 复制
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
          正在生成总结...
        </div>
      ) : error ? (
        <div className="text-sm text-red-400">❌ {error}</div>
      ) : (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</div>
      )}
    </div>
  );
}
