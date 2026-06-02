import { create } from 'zustand';
import type { PromptTemplate } from '@/types';

interface TemplateStore {
  templates: PromptTemplate[];
  activeTemplateId: string | null;
  loading: boolean;
  loadTemplates: () => Promise<void>;
  addTemplate: (data: Omit<PromptTemplate, 'isBuiltIn'>) => Promise<PromptTemplate>;
  editTemplate: (id: string, data: Partial<PromptTemplate>) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
  setActiveTemplate: (id: string | null) => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  activeTemplateId: null,
  loading: false,

  loadTemplates: async () => {
    set({ loading: true });
    try {
      const templates = await window.electronAPI.getPromptTemplates();
      set({
        templates,
        loading: false,
        activeTemplateId: get().activeTemplateId ?? (templates.length > 0 ? templates[0].id : null),
      });
    } catch (err) {
      console.error('[templateStore] loadTemplates error:', err);
      set({ loading: false });
    }
  },

  addTemplate: async (data) => {
    const tpl = await window.electronAPI.createPromptTemplate(data);
    set({ templates: [...get().templates, tpl] });
    return tpl;
  },

  editTemplate: async (id, data) => {
    const updated = await window.electronAPI.updatePromptTemplate(id, data);
    if (updated) {
      set({ templates: get().templates.map((t) => (t.id === id ? updated : t)) });
    }
  },

  removeTemplate: async (id) => {
    await window.electronAPI.deletePromptTemplate(id);
    const templates = get().templates.filter((t) => t.id !== id);
    set({
      templates,
      activeTemplateId: get().activeTemplateId === id ? (templates[0]?.id ?? null) : get().activeTemplateId,
    });
  },

  setActiveTemplate: (id) => set({ activeTemplateId: id }),
}));
