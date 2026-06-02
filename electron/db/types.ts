// Database row interfaces — replace `any` in rowTo* functions

export interface ScriptRow {
  id: string;
  title: string;
  world_setting: string;
  background: string;
  extra_data?: string;
  created_at: number;
  updated_at: number;
}

export interface CharacterRow {
  id: string;
  script_id: string;
  name: string;
  personality: string;
  background: string;
  speaking_style: string;
  appearance: string;
  avatar: string;
  created_at: number;
}

export interface AIConfigRow {
  id: string;
  name: string;
  api_url: string;
  api_key_encrypted: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export interface ConversationRow {
  id: string;
  script_id: string;
  character_id: string;
  parent_id: string | null;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  timestamp: number;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  is_built_in: number;
  created_at: number;
}
