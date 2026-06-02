import type { Script, Character, AIConfig, Conversation, Message, ChatMessage, PromptTemplate, BranchInfo } from '@/types';

export interface ElectronAPI {
  getScripts: () => Promise<Script[]>;
  getScript: (id: string) => Promise<Script | null>;
  createScript: (data: Script) => Promise<Script>;
  updateScript: (id: string, data: Partial<Script>) => Promise<Script | null>;
  deleteScript: (id: string) => Promise<void>;

  getCharacters: (scriptId: string) => Promise<Character[]>;
  getCharacter: (id: string) => Promise<Character | null>;
  createCharacter: (data: Character) => Promise<Character>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<Character | null>;
  deleteCharacter: (id: string) => Promise<void>;

  getAIConfigs: () => Promise<AIConfig[]>;
  getAIConfig: (id: string) => Promise<AIConfig | null>;
  createAIConfig: (data: Omit<AIConfig, 'id' | 'apiKeyEncrypted'> & { apiKey: string }) => Promise<AIConfig>;
  updateAIConfig: (id: string, data: Partial<Omit<AIConfig, 'apiKeyEncrypted'>> & { apiKey?: string }) => Promise<AIConfig | null>;
  deleteAIConfig: (id: string) => Promise<void>;

  getConversations: (scriptId?: string, characterId?: string) => Promise<Conversation[]>;
  getConversation: (id: string) => Promise<Conversation | null>;
  createConversation: (data: Conversation) => Promise<Conversation>;
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<void>;
  getConversationBranches: (conversationId: string) => Promise<BranchInfo[]>;

  getMessages: (conversationId: string) => Promise<Message[]>;
  createMessage: (data: Message) => Promise<Message>;
  updateMessage: (id: string, content: string) => Promise<void>;
  deleteMessagesAfter: (conversationId: string, afterTimestamp: number) => Promise<void>;

  getPromptTemplates: () => Promise<PromptTemplate[]>;
  getPromptTemplate: (id: string) => Promise<PromptTemplate | null>;
  createPromptTemplate: (data: Omit<PromptTemplate, 'id' | 'isBuiltIn'>) => Promise<PromptTemplate>;
  updatePromptTemplate: (id: string, data: Partial<PromptTemplate>) => Promise<PromptTemplate | null>;
  deletePromptTemplate: (id: string) => Promise<void>;

  /** en: 发送聊天消息（单向，完成通过 onChatDone/onChatError 事件获取） / Fire-and-forget; completion via onChatDone/onChatError */
  chatSend: (configId: string, messages: ChatMessage[], failoverConfigId?: string) => void;
  chatStop: () => Promise<void>;
  chatSummary: (configId: string, messages: ChatMessage[], characterName: string) => Promise<void>;
  onChatToken: (callback: (data: { token: string; conversationId: string }) => void) => () => void;
  onChatDone: (callback: (data: { conversationId: string }) => void) => () => void;
  onChatError: (callback: (data: { error: string; conversationId: string }) => void) => () => void;
  onChatSummaryResult: (callback: (data: { summary: string; error?: string }) => void) => () => void;

  discussSettings: (configId: string, type: string, fields: any, history: any[]) => Promise<{ reply?: string; error?: string }>;
  testApi: (configId: string) => Promise<{ ok: boolean; reply?: string; error?: string; model?: string }>;
  aiComplete: (configId: string, type: 'script' | 'character', partial: any) => Promise<any>;

  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;

  exportData: () => Promise<any>;
  importData: (data: any) => Promise<{ success: boolean }>;

  pickAvatar: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
