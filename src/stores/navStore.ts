import { create } from 'zustand';
import type { Page } from '@/types';

interface NavStore {
  currentPage: Page;
  selectedScriptId: string | null;
  selectedCharacterId: string | null;
  resumeConversationId: string | null;
  theme: 'dark' | 'light';
  /** Font size: xs=12px, sm=14px, normal=16px, lg=18px, xl=20px / 文字大小 */
  fontSize: 'xs' | 'sm' | 'normal' | 'lg' | 'xl';
  navigate: (page: Page) => void;
  selectScript: (id: string | null) => void;
  selectCharacter: (id: string | null) => void;
  setResumeConversation: (id: string | null) => void;
  toggleTheme: () => void;
  setFontSize: (size: 'xs' | 'sm' | 'normal' | 'lg' | 'xl') => void;
}

// Load persisted theme
const getInitialTheme = (): 'dark' | 'light' => {
  try {
    const stored = localStorage.getItem('app_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* localStorage unavailable */ }
  return 'dark';
};

const FONT_SIZES_LIST = ['xs', 'sm', 'normal', 'lg', 'xl'] as const;

const getInitialFontSize = () => {
  try {
    const v = localStorage.getItem('app_font_size');
    if (FONT_SIZES_LIST.includes(v as any)) return v as 'xs' | 'sm' | 'normal' | 'lg' | 'xl';
  } catch { /* ignore */ }
  return 'normal' as const;
};

export const useNavStore = create<NavStore>((set) => ({
  currentPage: 'scripts',
  selectedScriptId: null,
  selectedCharacterId: null,
  resumeConversationId: null,
  theme: getInitialTheme(),
  fontSize: getInitialFontSize(),

  navigate: (page) => set({ currentPage: page }),

  selectScript: (id) => set({ selectedScriptId: id }),

  selectCharacter: (id) => set({ selectedCharacterId: id }),

  setResumeConversation: (id) => set({ resumeConversationId: id }),

  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('app_theme', next); } catch { /* ignore */ }
    return { theme: next };
  }),

  setFontSize: (size) => set(() => {
    try { localStorage.setItem('app_font_size', size); } catch { /* ignore */ }
    return { fontSize: size };
  }),
}));
