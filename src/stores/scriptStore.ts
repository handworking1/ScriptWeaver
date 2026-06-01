import { create } from 'zustand';
import type { Script } from '@/types';

interface ScriptStore {
  scripts: Script[];
  loading: boolean;
  error: string | null;
  loadScripts: () => Promise<void>;
  addScript: (data: Script) => Promise<Script>;
  editScript: (id: string, data: Partial<Script>) => Promise<void>;
  removeScript: (id: string) => Promise<void>;
}

export const useScriptStore = create<ScriptStore>((set, get) => ({
  scripts: [],
  loading: false,
  error: null,

  loadScripts: async () => {
    set({ loading: true, error: null });
    try {
      const scripts = await window.electronAPI.getScripts();
      set({ scripts, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addScript: async (data) => {
    const script = await window.electronAPI.createScript(data);
    set({ scripts: [script, ...get().scripts] });
    return script;
  },

  editScript: async (id, data) => {
    const updated = await window.electronAPI.updateScript(id, data);
    if (updated) {
      set({
        scripts: get().scripts.map((s) => (s.id === id ? updated : s)),
      });
    }
  },

  removeScript: async (id) => {
    await window.electronAPI.deleteScript(id);
    set({ scripts: get().scripts.filter((s) => s.id !== id) });
  },
}));
