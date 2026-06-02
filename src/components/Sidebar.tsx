import { useState, useEffect } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';
import { useChatStore } from '@/stores/chatStore';
import { TokenBar } from '@/components/TokenBar';
import type { Page } from '@/types';

const navItems: { page: Page; label: string; icon: string }[] = [
  { page: 'scripts', label: '剧本管理', icon: '📜' },
  { page: 'characters', label: '角色管理', icon: '🎭' },
  { page: 'aiDiscuss', label: 'AI 剧本讨论', icon: '🤖' },
  { page: 'chat', label: '聊天', icon: '💬' },
  { page: 'history', label: '历史记录', icon: '📋' },
  { page: 'aiConfig', label: '设置', icon: '⚙️' },
];

export function Sidebar() {
  const currentPage = useNavStore((s) => s.currentPage);
  const theme = useNavStore((s) => s.theme);
  const navigate = useNavStore((s) => s.navigate);
  const toggleTheme = useNavStore((s) => s.toggleTheme);
  const setActiveConfig = useConfigStore((s) => s.setActiveConfig);
  const { configs, activeConfigId } = useConfigStore();
  const { tokenCount, totalTokensSession, estimatedCost, tokenLimit, refreshTokenLimit } = useChatStore();
  const [showModelPicker, setShowModelPicker] = useState(false);

  /** en: Sync token bar limit when active config changes / zh: 切换配置时同步 token 条上限 */
  useEffect(() => { refreshTokenLimit(); }, [activeConfigId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDark = theme === 'dark';

  return (
    <aside className={`w-56 flex flex-col h-full ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r`}>
      <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <h1 className="text-lg font-bold text-purple-500">叙世</h1>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>本地优先 · AI 驱动</p>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
              currentPage === item.page
                ? 'bg-purple-500/20 text-purple-500 border-r-2 border-purple-500'
                : isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Quick model selector */}
      {configs.length > 0 && (
        <div className={`px-3 pb-2 ${isDark ? '' : ''}`}>
          <button onClick={() => setShowModelPicker(!showModelPicker)}
            className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${isDark ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
            {showModelPicker ? '▲' : '▼'} 模型切换
          </button>
          {showModelPicker && (
            <div className="mt-1 space-y-0.5">
              {configs.map((c) => (
                <button key={c.id} onClick={() => { setActiveConfig(c.id); setShowModelPicker(false); }}
                  className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${activeConfigId === c.id ? (isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-600') : (isDark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100')}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mx-3 mb-2">
        <TokenBar used={tokenCount} limit={tokenLimit} totalInSession={totalTokensSession} estimatedCost={estimatedCost} compact />
      </div>

      <button onClick={toggleTheme}
        className={`mx-4 mb-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
          isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}>
        {isDark ? '☀️ 亮色模式' : '🌙 暗色模式'}
      </button>
      <div className={`p-4 border-t ${isDark ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'} text-xs`}>
        v1.3.0
      </div>
    </aside>
  );
}
