import { create } from 'zustand';
import type { AIConfig } from '@/types';

interface ConfigStore {
  configs: AIConfig[];
  activeConfigId: string | null;
  failoverConfigId: string | null;
  loading: boolean;
  error: string | null;
  loadConfigs: () => Promise<void>;
  addConfig: (data: { id: string; name: string; apiUrl: string; apiKey: string; model: string; temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number }) => Promise<AIConfig>;
  editConfig: (id: string, data: Partial<AIConfig> & { apiKey?: string }) => Promise<void>;
  removeConfig: (id: string) => Promise<void>;
  setActiveConfig: (id: string | null) => void;
  setFailoverConfig: (id: string | null) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  configs: [],
  activeConfigId: null,
  failoverConfigId: null,
  loading: false,
  error: null,

  loadConfigs: async () => {
    set({ loading: true, error: null });
    try {
      const configs = await window.electronAPI.getAIConfigs();
      // en: 验证当前 active config 仍在列表中，否则回退到第一个 / Validate active config still exists, fallback to first
      const currentId = get().activeConfigId;
      const stillExists = currentId && configs.some(c => c.id === currentId);
      set({
        configs,
        loading: false,
        activeConfigId: configs.length > 0 && !stillExists ? configs[0].id : currentId,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addConfig: async (data) => {
    const config = await window.electronAPI.createAIConfig(data);
    const configs = [...get().configs, config];
    set({
      configs,
      activeConfigId: get().activeConfigId ?? config.id,
    });
    return config;
  },

  editConfig: async (id, data) => {
    const updated = await window.electronAPI.updateAIConfig(id, data);
    if (updated) {
      set({
        configs: get().configs.map((c) => (c.id === id ? updated : c)),
      });
    }
  },

  removeConfig: async (id) => {
    await window.electronAPI.deleteAIConfig(id);
    const configs = get().configs.filter((c) => c.id !== id);
    set({
      configs,
      activeConfigId: get().activeConfigId === id ? (configs[0]?.id ?? null) : get().activeConfigId,
    });
  },

  setActiveConfig: (id) => set({ activeConfigId: id }),
  setFailoverConfig: (id) => set({ failoverConfigId: id }),
}));

