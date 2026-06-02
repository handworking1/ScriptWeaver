import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcScriptData, IpcScriptUpdate,
  IpcCharacterData, IpcCharacterUpdate,
  IpcAIConfigData, IpcAIConfigUpdate,
  IpcConversationData, IpcConversationUpdate,
  IpcMessageData,
  IpcTemplateData, IpcTemplateUpdate,
  IpcImportData,
} from '../src/types';

const electronAPI = {
  // Scripts
  getScripts: () => ipcRenderer.invoke('script:getAll'),
  getScript: (id: string) => ipcRenderer.invoke('script:get', id),
  createScript: (data: IpcScriptData) => ipcRenderer.invoke('script:create', data),
  updateScript: (id: string, data: IpcScriptUpdate) => ipcRenderer.invoke('script:update', id, data),
  deleteScript: (id: string) => ipcRenderer.invoke('script:delete', id),

  // Characters
  getCharacters: (scriptId: string) => ipcRenderer.invoke('character:getAll', scriptId),
  getCharacter: (id: string) => ipcRenderer.invoke('character:get', id),
  createCharacter: (data: IpcCharacterData) => ipcRenderer.invoke('character:create', data),
  updateCharacter: (id: string, data: IpcCharacterUpdate) => ipcRenderer.invoke('character:update', id, data),
  deleteCharacter: (id: string) => ipcRenderer.invoke('character:delete', id),

  // AI Config
  getAIConfigs: () => ipcRenderer.invoke('aiConfig:getAll'),
  getAIConfig: (id: string) => ipcRenderer.invoke('aiConfig:get', id),
  createAIConfig: (data: IpcAIConfigData) => ipcRenderer.invoke('aiConfig:create', data),
  updateAIConfig: (id: string, data: IpcAIConfigUpdate) => ipcRenderer.invoke('aiConfig:update', id, data),
  deleteAIConfig: (id: string) => ipcRenderer.invoke('aiConfig:delete', id),

  // Conversations
  getConversations: (scriptId?: string, characterId?: string) =>
    ipcRenderer.invoke('conversation:getAll', scriptId, characterId),
  getConversation: (id: string) => ipcRenderer.invoke('conversation:get', id),
  createConversation: (data: IpcConversationData) => ipcRenderer.invoke('conversation:create', data),
  updateConversation: (id: string, data: IpcConversationUpdate) => ipcRenderer.invoke('conversation:update', id, data),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversation:delete', id),
  getConversationBranches: (conversationId: string) =>
    ipcRenderer.invoke('conversation:branches', conversationId),

  // Messages
  getMessages: (conversationId: string) => ipcRenderer.invoke('message:getAll', conversationId),
  createMessage: (data: IpcMessageData) => ipcRenderer.invoke('message:create', data),
  updateMessage: (id: string, content: string) => ipcRenderer.invoke('message:update', id, content),
  deleteMessagesAfter: (conversationId: string, afterTimestamp: number) =>
    ipcRenderer.invoke('message:deleteAfter', conversationId, afterTimestamp),

  // Prompt Templates
  getPromptTemplates: () => ipcRenderer.invoke('template:getAll'),
  getPromptTemplate: (id: string) => ipcRenderer.invoke('template:get', id),
  createPromptTemplate: (data: IpcTemplateData) => ipcRenderer.invoke('template:create', data),
  updatePromptTemplate: (id: string, data: IpcTemplateUpdate) => ipcRenderer.invoke('template:update', id, data),
  deletePromptTemplate: (id: string) => ipcRenderer.invoke('template:delete', id),

  // Chat streaming — fire-and-forget; completion via onChatDone/onChatError events
  // en: 聊天流式传输 — 单向发送；完成状态通过 onChatDone/onChatError 事件获取
  chatSend: (configId: string, messages: { role: string; content: string; _conversationId?: string }[], failoverConfigId?: string) => {
    ipcRenderer.send('chat:send', configId, messages, failoverConfigId);
  },
  chatStop: () => ipcRenderer.invoke('chat:stop'),
  chatSummary: (configId: string, messages: { role: string; content: string }[], characterName: string) =>
    ipcRenderer.invoke('chat:summary', configId, messages, characterName),
  onChatToken: (callback: (data: { token: string; conversationId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { token: string; conversationId: string }) =>
      callback(data);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },
  onChatDone: (callback: (data: { conversationId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { conversationId: string }) =>
      callback(data);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
  },
  onChatError: (callback: (data: { error: string; conversationId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { error: string; conversationId: string }) =>
      callback(data);
    ipcRenderer.on('chat:error', handler);
    return () => ipcRenderer.removeListener('chat:error', handler);
  },
  onChatSummaryResult: (callback: (data: { summary: string; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { summary: string; error?: string }) =>
      callback(data);
    ipcRenderer.on('chat:summaryResult', handler);
    return () => ipcRenderer.removeListener('chat:summaryResult', handler);
  },

  // AI Discuss
  discussSettings: (configId: string, type: string, fields: Record<string, string>, history: { role: string; content: string }[]) =>
    ipcRenderer.invoke('ai:discuss', configId, type, fields, history),

  // API Test
  testApi: (configId: string) => ipcRenderer.invoke('api:test', configId),

  // AI Complete
  aiComplete: (configId: string, type: 'script' | 'character', partial: Record<string, string>) =>
    ipcRenderer.invoke('ai:complete', configId, type, partial),

  // Global Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // Encryption check
  isEncryptionAvailable: () => ipcRenderer.invoke('safeStorage:isAvailable'),

  // Import/Export
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: (data: IpcImportData) => ipcRenderer.invoke('data:import', data),
  exportScript: (scriptId: string) => ipcRenderer.invoke('data:exportScript', scriptId),
  importScript: (data: any) => ipcRenderer.invoke('data:importScript', data),

  // File dialog for avatar
  pickAvatar: () => ipcRenderer.invoke('dialog:pickAvatar'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
