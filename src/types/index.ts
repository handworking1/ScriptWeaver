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
  banghuiEnabled: string;
}

export interface Script {
  id: string;
  title: string;
  worldSetting: string;
  background: string;
  extraData: ScriptExtra;
  /** 标记 extra_data JSON 解析失败（导致回退到默认值）/ parse failure flag */
  _parseError?: boolean;
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
  /** NULL for world-mode conversations / 世界模式对话为 NULL */
  characterId: string | null;
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

// ─── IPC parameter types — replace `any` in preload.ts / IPC 参数类型 ───

/** en: Data passed from renderer to create/update scripts via IPC.
 *  zh: 渲染进程通过 IPC 创建/更新剧本时传递的数据。 */
export interface IpcScriptData {
  id: string;
  title: string;
  worldSetting?: string;
  background?: string;
  extraData?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface IpcScriptUpdate {
  title?: string;
  worldSetting?: string;
  background?: string;
  extraData?: Record<string, string>;
}

export interface IpcCharacterData {
  id: string;
  scriptId: string;
  name: string;
  personality?: string;
  background?: string;
  speakingStyle?: string;
  appearance?: string;
  avatar?: string;
  createdAt: number;
}

export interface IpcCharacterUpdate {
  name?: string;
  personality?: string;
  background?: string;
  speakingStyle?: string;
  appearance?: string;
  avatar?: string;
}

export interface IpcAIConfigData {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface IpcAIConfigUpdate {
  name?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface IpcConversationData {
  id: string;
  scriptId: string;
  /** Empty string allowed for world mode — stored as NULL / 世界模式可为空串 */
  characterId: string;
  parentId?: string | null;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IpcConversationUpdate {
  title?: string;
}

export interface IpcMessageData {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface IpcTemplateData {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  createdAt: number;
}

export interface IpcTemplateUpdate {
  name?: string;
  description?: string;
  systemPrompt?: string;
}

/** en: Import bundle shape / zh: 导入数据包结构 */
export interface IpcImportData {
  scripts: unknown[];
  characters: unknown[];
  conversations: unknown[];
  messages: unknown[];
  aiConfigs: unknown[];
  promptTemplates?: unknown[];
}
