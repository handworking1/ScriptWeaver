import { create } from 'zustand';
import type { Page } from '@/types';

interface NavStore {
  currentPage: Page;
  selectedScriptId: string | null;
  selectedCharacterId: string | null;
  resumeConversationId: string | null;
  theme: 'dark' | 'light';
  navigate: (page: Page) => void;
  selectScript: (id: string | null) => void;
  selectCharacter: (id: string | null) => void;
  setResumeConversation: (id: string | null) => void;
  toggleTheme: () => void;
}

// Load persisted theme
const getInitialTheme = (): 'dark' | 'light' => {
  try {
    const stored = localStorage.getItem('app_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* localStorage unavailable */ }
  return 'dark';
};

export const useNavStore = create<NavStore>((set) => ({
  currentPage: 'scripts',
  selectedScriptId: null,
  selectedCharacterId: null,
  resumeConversationId: null,
  theme: getInitialTheme(),

  navigate: (page) => set({ currentPage: page }),

  selectScript: (id) => set({ selectedScriptId: id }),

  selectCharacter: (id) => set({ selectedCharacterId: id }),

  setResumeConversation: (id) => set({ resumeConversationId: id }),

  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('app_theme', next); } catch { /* ignore */ }
    return { theme: next };
  }),
}));
