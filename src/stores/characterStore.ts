import { create } from 'zustand';
import type { Character } from '@/types';

interface CharacterStore {
  characters: Character[];
  loading: boolean;
  error: string | null;
  loadCharacters: (scriptId: string) => Promise<void>;
  addCharacter: (data: Character) => Promise<Character>;
  editCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  loading: false,
  error: null,

  loadCharacters: async (scriptId) => {
    set({ loading: true, error: null });
    try {
      const characters = await window.electronAPI.getCharacters(scriptId);
      set({ characters, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addCharacter: async (data) => {
    const character = await window.electronAPI.createCharacter(data);
    set({ characters: [...get().characters, character] });
    return character;
  },

  editCharacter: async (id, data) => {
    const updated = await window.electronAPI.updateCharacter(id, data);
    if (updated) {
      set({
        characters: get().characters.map((c) => (c.id === id ? updated : c)),
      });
    }
  },

  removeCharacter: async (id) => {
    await window.electronAPI.deleteCharacter(id);
    set({ characters: get().characters.filter((c) => c.id !== id) });
  },
}));
