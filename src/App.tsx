import { useEffect } from 'react';
import { useNavStore } from '@/stores/navStore';
import { Sidebar } from '@/components/Sidebar';
import { ScriptsPage } from '@/pages/ScriptsPage';
import { CharactersPage } from '@/pages/CharactersPage';
import { AIConfigPage } from '@/pages/AIConfigPage';
import { ChatPage } from '@/pages/ChatPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AIDiscussPage } from '@/pages/AIDiscussPage';
import DNDPage from '@/pages/DNDPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const pages = {
  scripts: ScriptsPage,
  characters: CharactersPage,
  aiConfig: AIConfigPage,
  chat: ChatPage,
  dnd: DNDPage,
  history: HistoryPage,
  aiDiscuss: AIDiscussPage,
};

const FONT_SIZES: Record<string, string> = { xs: '12px', sm: '14px', normal: '16px', lg: '18px', xl: '20px' };

export function App() {
  const currentPage = useNavStore((s) => s.currentPage);
  const theme = useNavStore((s) => s.theme);
  const fontSize = useNavStore((s) => s.fontSize);
  const PageComponent = pages[currentPage];

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize] || '16px';
  }, [fontSize]);

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ErrorBoundary>
          <PageComponent />
        </ErrorBoundary>
      </main>
    </div>
  );
}
