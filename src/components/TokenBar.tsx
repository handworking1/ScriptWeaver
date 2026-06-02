import React from 'react';

interface TokenBarProps {
  used: number;
  limit: number;
  totalInSession: number;
  estimatedCost: string;
  compact?: boolean;
}

export const TokenBar = React.memo(function TokenBar({ used, limit, totalInSession, estimatedCost, compact }: TokenBarProps) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isWarning = pct > 70;
  const isDanger = pct > 90;

  if (compact) {
    return (
      <div className="px-2 py-1.5 rounded-lg text-xs bg-gray-800/50">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-gray-500">总量</span>
          <span className="font-mono text-gray-400">{totalInSession}</span>
        </div>
        <div className="text-[10px] text-right" style={{ color: '#666' }}>{estimatedCost}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900/80 border-b border-gray-800 text-xs">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-gray-500">上下文</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[120px]">
          <div
            className={`h-full rounded-full transition-all ${
              isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-purple-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono ${isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-400'}`}>
          {used}/{limit}
        </span>
      </div>
      <span className="text-gray-600">|</span>
      <span className="text-gray-500">
        累计 {totalInSession} tokens
      </span>
      <span className="text-gray-600">|</span>
      <span className="text-gray-500">{estimatedCost}</span>
    </div>
  );
});
