import { useNavStore } from '@/stores/navStore';
import { Sidebar } from '@/components/Sidebar';
import { ScriptsPage } from '@/pages/ScriptsPage';
import { CharactersPage } from '@/pages/CharactersPage';
import { AIConfigPage } from '@/pages/AIConfigPage';
import { ChatPage } from '@/pages/ChatPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AIDiscussPage } from '@/pages/AIDiscussPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const pages = {
  scripts: ScriptsPage,
  characters: CharactersPage,
  aiConfig: AIConfigPage,
  chat: ChatPage,
  history: HistoryPage,
  aiDiscuss: AIDiscussPage,
};

export function App() {
  const currentPage = useNavStore((s) => s.currentPage);
  const theme = useNavStore((s) => s.theme);
  const PageComponent = pages[currentPage];

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
