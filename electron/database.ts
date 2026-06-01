import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { NARRATIVE_TEMPLATE } from '../src/data/narrativeTemplate';

let SQL: SqlJsStatic | null = null;
let db: SqlJsDatabase | null = null;
let dbPath: string;

function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Convert sql.js exec result to array of objects
function execAll(sql: string, params?: any[]): any[] {
  const d = getDb();
  if (params) {
    const stmt = d.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
  const results = d.exec(sql);
  if (!results.length) return [];
  const [{ columns, values }] = results;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function execOne(sql: string, params: any[]): any | null {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  let row: any = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function run(sql: string, params?: any[]): void {
  if (params) {
    getDb().run(sql, params);
  } else {
    getDb().run(sql);
  }
  saveDb();
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'script-chat.db');

  // sql.js needs help finding its WASM file in packaged Electron apps
  SQL = await initSqlJs({
    locateFile: (file: string) => {
      // Try multiple paths for dev and production
      const paths = [
        path.join(__dirname, 'node_modules', 'sql.js', 'dist', file),
        path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
        path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file),
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
      return file; // fallback to default
    },
  });

  // Load existing database or create new
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      world_setting TEXT DEFAULT '',
      background TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      personality TEXT DEFAULT '',
      background TEXT DEFAULT '',
      speaking_style TEXT DEFAULT '',
      appearance TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL,
      api_key_encrypted TEXT DEFAULT '',
      model TEXT NOT NULL,
      temperature REAL DEFAULT 0.8,
      max_tokens INTEGER DEFAULT 2048,
      top_p REAL DEFAULT 1.0,
      frequency_penalty REAL DEFAULT 0,
      presence_penalty REAL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      title TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(script_id) REFERENCES scripts(id),
      FOREIGN KEY(character_id) REFERENCES characters(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_characters_script_id ON characters(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_script_id ON conversations(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_character_id ON conversations(character_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');

  // Global settings (key-value store)
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Prompt templates
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      system_prompt TEXT NOT NULL,
      is_built_in INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  // Migration: add parent_id column if it doesn't exist (for existing DBs)
  try {
    db.run('ALTER TABLE conversations ADD COLUMN parent_id TEXT DEFAULT NULL');
  } catch (_) { /* column exists */ }

  // Migration: add extra_data column for script extended fields
  try {
    db.run('ALTER TABLE scripts ADD COLUMN extra_data TEXT DEFAULT \'{}\'');
  } catch (_) { /* column exists */ }

  // Seed built-in templates if none exist
  const templateCount = db.exec('SELECT COUNT(*) as c FROM prompt_templates');
  if (!templateCount.length || (templateCount[0].values[0] as number[])[0] === 0) {
    seedTemplates();
  }

  saveDb();
}

function seedTemplates(): void {
  const d = getDb();
  const now = Date.now();
  const templates = [
    {
      id: 'tpl_default',
      name: '默认',
      description: '标准角色扮演提示词',
      prompt: '你是{name}，下面是你的人设：\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上人设进行角色扮演。你需要：\n1. 始终以{name}的身份说话，不要跳出角色。\n2. 保持符合角色性格和背景的语气、用词和说话风格。\n3. 不要提及你是AI或语言模型，你就是{name}本人。\n4. 回答应自然流畅，符合角色设定。',
    },
    {
      id: 'tpl_ancient',
      name: '古风角色',
      description: '适合仙侠、武侠、古装剧角色',
      prompt: '你是{name}，一位身处古风世界的角色。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景**：{background}\n**说话风格**：请使用文雅的古风用语，多用成语典故，语气需符合角色身份与时代背景。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上设定。你的每一句话都应有古风韵味，可以适当引用诗词典故，语气需符合古代礼数和角色身份地位。\n\n此外，请在每轮对话末尾用 `[SUGGESTIONS: 选项1 | 选项2 | 选项3]` 格式提供三个可能的用户回应或行动选项。',
    },
    {
      id: 'tpl_modern',
      name: '现代角色',
      description: '适合都市、校园、职场剧角色',
      prompt: '你是{name}，一个生活在现代的人。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：请使用现代口语化的表达，自然流畅。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上设定。你的对话应该自然、生活化，像真人一样思考与表达。',
    },
    {
      id: 'tpl_rpg',
      name: 'RPG 旁白',
      description: '适合跑团、冒险类剧本',
      prompt: '你是{name}，一名冒险者。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**外貌**：{appearance}\n\n**世界观**：{scriptBackground}\n\n你正在进行一场冒险。请以角色扮演的方式回应，描述角色的动作、表情和心理活动可以使用 `*动作描述*` 的格式。说话风格：{speakingStyle}\n\n请以第二人称视角推进剧情，在关键节点提供选择，并用 `[SUGGESTIONS: 选项1 | 选项2 | 选项3]` 格式给出三个可选行动。',
    },
    {
      id: 'tpl_intimate',
      name: '亲密关系',
      description: '适合恋爱、亲密关系类角色',
      prompt: '你是{name}，与对方有着特殊的关系。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：请使用温柔、亲密的语气。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请以{name}的身份进行自然、亲密的对话。注意情感的渐进发展，不要过于突兀。表达应细腻真实，体现角色的个性和情感深度。',
    },
    {
      id: 'tpl_narrative',
      name: '叙事创作系统',
      description: '三位一体叙事空间创作系统v3.0 — 商业网文策划+代笔+AI',
      prompt: NARRATIVE_TEMPLATE,
    },
  ];

  for (const tpl of templates) {
    d.run(
      'INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [tpl.id, tpl.name, tpl.description, tpl.prompt, now],
    );
  }
  saveDb();
}

// ─── Global Settings ────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = execOne('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}

// ─── Script CRUD ────────────────────────────────────────────

export function getAllScripts() {
  return execAll('SELECT * FROM scripts ORDER BY updated_at DESC');
}

export function getScript(id: string) {
  return execOne('SELECT * FROM scripts WHERE id = ?', [id]);
}

export function createScript(data: { id: string; title: string; worldSetting?: string; background?: string; extraData?: string; createdAt: number; updatedAt: number }) {
  run(
    'INSERT INTO scripts (id, title, world_setting, background, extra_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.title, data.worldSetting ?? '', data.background ?? '', data.extraData ?? '{}', data.createdAt, data.updatedAt],
  );
  return getScript(data.id);
}

export function updateScript(id: string, data: { title?: string; worldSetting?: string; background?: string; extraData?: string }) {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.worldSetting !== undefined) { sets.push('world_setting = ?'); params.push(data.worldSetting); }
  if (data.background !== undefined) { sets.push('background = ?'); params.push(data.background); }
  if (data.extraData !== undefined) { sets.push('extra_data = ?'); params.push(data.extraData); }

  if (sets.length > 0) {
    sets.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);
    run(`UPDATE scripts SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getScript(id);
}

export function deleteScript(id: string) {
  run('DELETE FROM scripts WHERE id = ?', [id]);
}

// ─── Character CRUD ─────────────────────────────────────────

export function getAllCharacters(scriptId: string) {
  return execAll('SELECT * FROM characters WHERE script_id = ? ORDER BY created_at ASC', [scriptId]);
}

export function getCharacter(id: string) {
  return execOne('SELECT * FROM characters WHERE id = ?', [id]);
}

export function createCharacter(data: {
  id: string; scriptId: string; name: string; personality?: string;
  background?: string; speakingStyle?: string; appearance?: string; avatar?: string; createdAt: number;
}) {
  run(
    'INSERT INTO characters (id, script_id, name, personality, background, speaking_style, appearance, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scriptId, data.name, data.personality ?? '', data.background ?? '', data.speakingStyle ?? '', data.appearance ?? '', data.avatar ?? '', data.createdAt],
  );
  return getCharacter(data.id);
}

export function updateCharacter(id: string, data: {
  name?: string; personality?: string; background?: string;
  speakingStyle?: string; appearance?: string; avatar?: string;
}) {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.personality !== undefined) { sets.push('personality = ?'); params.push(data.personality); }
  if (data.background !== undefined) { sets.push('background = ?'); params.push(data.background); }
  if (data.speakingStyle !== undefined) { sets.push('speaking_style = ?'); params.push(data.speakingStyle); }
  if (data.appearance !== undefined) { sets.push('appearance = ?'); params.push(data.appearance); }
  if (data.avatar !== undefined) { sets.push('avatar = ?'); params.push(data.avatar); }

  if (sets.length > 0) {
    params.push(id);
    run(`UPDATE characters SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getCharacter(id);
}

export function deleteCharacter(id: string) {
  run('DELETE FROM characters WHERE id = ?', [id]);
}

// ─── AI Config CRUD ─────────────────────────────────────────

export function getAllAIConfigs() {
  return execAll('SELECT * FROM ai_configs ORDER BY rowid ASC');
}

export function getAIConfig(id: string) {
  return execOne('SELECT * FROM ai_configs WHERE id = ?', [id]);
}

export function createAIConfig(data: {
  id: string; name: string; apiUrl: string; apiKeyEncrypted: string; model: string;
  temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number;
}) {
  run(
    'INSERT INTO ai_configs (id, name, api_url, api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.name, data.apiUrl, data.apiKeyEncrypted, data.model, data.temperature, data.maxTokens, data.topP, data.frequencyPenalty, data.presencePenalty],
  );
  return getAIConfig(data.id);
}

export function updateAIConfig(id: string, data: Partial<{
  name: string; apiUrl: string; apiKeyEncrypted: string; model: string;
  temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number;
}>) {
  const fieldMap: Record<string, string> = {
    name: 'name', apiUrl: 'api_url', apiKeyEncrypted: 'api_key_encrypted', model: 'model',
    temperature: 'temperature', maxTokens: 'max_tokens', topP: 'top_p',
    frequencyPenalty: 'frequency_penalty', presencePenalty: 'presence_penalty',
  };
  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key as keyof typeof data] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(data[key as keyof typeof data]);
    }
  }

  if (sets.length > 0) {
    params.push(id);
    run(`UPDATE ai_configs SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getAIConfig(id);
}

export function deleteAIConfig(id: string) {
  run('DELETE FROM ai_configs WHERE id = ?', [id]);
}

// ─── Conversation CRUD ──────────────────────────────────────

export function getAllConversations(scriptId?: string, characterId?: string) {
  let sql = 'SELECT * FROM conversations WHERE 1=1';
  const params: any[] = [];
  if (scriptId) { sql += ' AND script_id = ?'; params.push(scriptId); }
  if (characterId) { sql += ' AND character_id = ?'; params.push(characterId); }
  sql += ' ORDER BY updated_at DESC';
  return execAll(sql, params.length ? params : undefined);
}

export function getConversation(id: string) {
  return execOne('SELECT * FROM conversations WHERE id = ?', [id]);
}

export function createConversation(data: {
  id: string; scriptId: string; characterId: string; parentId?: string | null; title?: string; createdAt: number; updatedAt: number;
}) {
  run(
    'INSERT INTO conversations (id, script_id, character_id, parent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scriptId, data.characterId, data.parentId ?? null, data.title ?? '', data.createdAt, data.updatedAt],
  );
  return getConversation(data.id);
}

export function getConversationBranches(conversationId: string) {
  return execAll('SELECT id, title, created_at FROM conversations WHERE parent_id = ? ORDER BY created_at ASC', [conversationId]);
}

export function updateConversation(id: string, data: { title?: string }) {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }

  // Always bump timestamp
  sets.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);
  run(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`, params);

  return getConversation(id);
}

export function deleteConversation(id: string) {
  run('DELETE FROM conversations WHERE id = ?', [id]);
}

// ─── Message CRUD ───────────────────────────────────────────

export function getAllMessages(conversationId: string) {
  return execAll('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [conversationId]);
}

export function createMessage(data: { id: string; conversationId: string; role: string; content: string; timestamp: number }) {
  run(
    'INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    [data.id, data.conversationId, data.role, data.content, data.timestamp],
  );
  return { id: data.id, conversationId: data.conversationId, role: data.role, content: data.content, timestamp: data.timestamp };
}

export function updateMessage(id: string, content: string) {
  run('UPDATE messages SET content = ? WHERE id = ?', [content, id]);
}

export function deleteMessagesAfter(conversationId: string, afterTimestamp: number) {
  run('DELETE FROM messages WHERE conversation_id = ? AND timestamp > ?', [conversationId, afterTimestamp]);
}

// ─── Prompt Templates CRUD ──────────────────────────────────

export function getAllPromptTemplates() {
  return execAll('SELECT * FROM prompt_templates ORDER BY is_built_in DESC, created_at ASC');
}

export function getPromptTemplate(id: string) {
  return execOne('SELECT * FROM prompt_templates WHERE id = ?', [id]);
}

export function createPromptTemplate(data: { id: string; name: string; description?: string; systemPrompt: string; isBuiltIn?: boolean; createdAt: number }) {
  run(
    'INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.name, data.description ?? '', data.systemPrompt, data.isBuiltIn ? 1 : 0, data.createdAt],
  );
  return getPromptTemplate(data.id);
}

export function updatePromptTemplate(id: string, data: { name?: string; description?: string; systemPrompt?: string }) {
  const sets: string[] = [];
  const params: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.systemPrompt !== undefined) { sets.push('system_prompt = ?'); params.push(data.systemPrompt); }
  if (sets.length > 0) {
    params.push(id);
    run(`UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getPromptTemplate(id);
}

export function deletePromptTemplate(id: string) {
  run('DELETE FROM prompt_templates WHERE id = ?', [id]);
}

// ─── Import / Export ────────────────────────────────────────

export function exportAllData() {
  return {
    scripts: execAll('SELECT * FROM scripts'),
    characters: execAll('SELECT * FROM characters'),
    conversations: execAll('SELECT * FROM conversations'),
    messages: execAll('SELECT * FROM messages'),
    aiConfigs: execAll('SELECT id, name, api_url, api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty FROM ai_configs'),
    promptTemplates: execAll('SELECT * FROM prompt_templates'),
  };
}

export function importAllData(data: {
  scripts: any[]; characters: any[]; conversations: any[]; messages: any[]; aiConfigs: any[]; promptTemplates?: any[];
}) {
  const d = getDb();

  // Clear
  d.run('DELETE FROM messages');
  d.run('DELETE FROM conversations');
  d.run('DELETE FROM characters');
  d.run('DELETE FROM scripts');
  d.run('DELETE FROM ai_configs');

  // Insert scripts
  for (const s of data.scripts) {
    d.run('INSERT INTO scripts (id, title, world_setting, background, extra_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.title, s.world_setting ?? '', s.background ?? '', s.extra_data ?? '{}', s.created_at, s.updated_at]);
  }

  // Insert characters
  for (const c of data.characters) {
    d.run('INSERT INTO characters (id, script_id, name, personality, background, speaking_style, appearance, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.script_id, c.name, c.personality ?? '', c.background ?? '', c.speaking_style ?? '', c.appearance ?? '', c.avatar ?? '', c.created_at]);
  }

  // Insert conversations
  for (const c of data.conversations) {
    d.run('INSERT INTO conversations (id, script_id, character_id, parent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.script_id, c.character_id, c.parent_id ?? null, c.title ?? '', c.created_at, c.updated_at]);
  }

  // Insert messages
  for (const m of data.messages) {
    d.run('INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [m.id, m.conversation_id, m.role, m.content, m.timestamp]);
  }

  // Insert AI configs
  for (const c of data.aiConfigs) {
    d.run('INSERT INTO ai_configs (id, name, api_url, api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.api_url, c.api_key_encrypted ?? '', c.model, c.temperature ?? 0.8, c.max_tokens ?? 2048, c.top_p ?? 1.0, c.frequency_penalty ?? 0, c.presence_penalty ?? 0]);
  }

  // Insert prompt templates
  if (data.promptTemplates) {
    for (const t of data.promptTemplates) {
      d.run('INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [t.id, t.name, t.description ?? '', t.system_prompt ?? t.systemPrompt, t.is_built_in ?? 0, t.created_at ?? Date.now()]);
    }
  }

  saveDb();
}
