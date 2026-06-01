export interface ScriptExtra {
  mainQuests: string;
  sideQuests: string;
  environment: string;
  map: string;
  data: string;
  tags: string;
  referenceWorks: string;
  eraBackground: string;
  protagonistDilemma: string;
  coreCheat: string;
  ageRule: string;
  narrativeMode: string;
  strictMode: string;
  workflowMode: string;
  recapMode: string;
  periodicSummary: string;
  ruleSelfCheck: string;
  timeline: string;
  chapters: string;
}

export interface Script {
  id: string;
  title: string;
  worldSetting: string;
  background: string;
  extraData: ScriptExtra;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  scriptId: string;
  name: string;
  personality: string;
  background: string;
  speakingStyle: string;
  appearance: string;
  avatar: string;
  createdAt: number;
}

export interface AIConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKeyEncrypted: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface Conversation {
  id: string;
  scriptId: string;
  characterId: string;
  parentId: string | null;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isBuiltIn: boolean;
  createdAt: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface QuickSuggestion {
  text: string;
}

export interface BranchInfo {
  id: string;
  title: string;
  createdAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  _conversationId?: string;
}

export type Page =
  | 'scripts'
  | 'characters'
  | 'aiConfig'
  | 'chat'
  | 'history'
  | 'aiDiscuss';
