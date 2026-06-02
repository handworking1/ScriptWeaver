import { execAll, getDb, saveDb } from './utils';

export function exportAllData() {
  return {
    scripts: execAll('SELECT * FROM scripts'),
    characters: execAll('SELECT * FROM characters'),
    conversations: execAll('SELECT * FROM conversations'),
    messages: execAll('SELECT * FROM messages'),
    aiConfigs: execAll('SELECT id, name, api_url, \'\' as api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty FROM ai_configs'),
    promptTemplates: execAll('SELECT * FROM prompt_templates'),
  };
}

export function importAllData(data: { scripts: any[]; characters: any[]; conversations: any[]; messages: any[]; aiConfigs: any[]; promptTemplates?: any[] }) {
  if (!Array.isArray(data.scripts) || !Array.isArray(data.characters) || !Array.isArray(data.conversations) || !Array.isArray(data.messages) || !Array.isArray(data.aiConfigs)) {
    throw new Error('导入数据格式无效：缺少必要的数据表');
  }
  const d = getDb();
  try {
  d.run('BEGIN TRANSACTION');
  d.run('DELETE FROM messages'); d.run('DELETE FROM conversations'); d.run('DELETE FROM characters'); d.run('DELETE FROM scripts'); d.run('DELETE FROM ai_configs');
  for (const s of data.scripts) d.run('INSERT INTO scripts (id, title, world_setting, background, extra_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [s.id, s.title, s.world_setting ?? '', s.background ?? '', s.extra_data ?? '{}', s.created_at, s.updated_at]);
  for (const c of data.characters) d.run('INSERT INTO characters (id, script_id, name, personality, background, speaking_style, appearance, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [c.id, c.script_id, c.name, c.personality ?? '', c.background ?? '', c.speaking_style ?? '', c.appearance ?? '', c.avatar ?? '', c.created_at]);
  for (const c of data.conversations) d.run('INSERT INTO conversations (id, script_id, character_id, parent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [c.id, c.script_id, c.character_id, c.parent_id ?? null, c.title ?? '', c.created_at, c.updated_at]);
  for (const m of data.messages) d.run('INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)', [m.id, m.conversation_id, m.role, m.content, m.timestamp]);
  for (const c of data.aiConfigs) d.run('INSERT INTO ai_configs (id, name, api_url, api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [c.id, c.name, c.api_url, c.api_key_encrypted ?? '', c.model, c.temperature ?? 0.8, c.max_tokens ?? 2048, c.top_p ?? 1.0, c.frequency_penalty ?? 0, c.presence_penalty ?? 0]);
  if (data.promptTemplates) for (const t of data.promptTemplates) d.run('INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, ?, ?)', [t.id, t.name, t.description ?? '', t.system_prompt ?? t.systemPrompt, t.is_built_in ?? 0, t.created_at ?? Date.now()]);
  d.run('COMMIT');
  } catch (err: any) {
    d.run('ROLLBACK');
    throw err;
  }
  saveDb();
}
