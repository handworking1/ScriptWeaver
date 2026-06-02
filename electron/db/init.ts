import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { setDb, saveDb } from './utils';
import { NARRATIVE_TEMPLATE } from '../../src/data/narrativeTemplate';

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'script-chat.db');

  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const paths = [
        path.join(__dirname, 'node_modules', 'sql.js', 'dist', file),
        path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
        path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file),
      ];
      for (const p of paths) { if (fs.existsSync(p)) return p; }
      return file;
    },
  });

  const db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  setDb(db, dbPath);

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS scripts (id TEXT PRIMARY KEY, title TEXT NOT NULL, world_setting TEXT DEFAULT '', background TEXT DEFAULT '', extra_data TEXT DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE, name TEXT NOT NULL, personality TEXT DEFAULT '', background TEXT DEFAULT '', speaking_style TEXT DEFAULT '', appearance TEXT DEFAULT '', avatar TEXT DEFAULT '', created_at INTEGER NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS ai_configs (id TEXT PRIMARY KEY, name TEXT NOT NULL, api_url TEXT NOT NULL, api_key_encrypted TEXT DEFAULT '', model TEXT NOT NULL, temperature REAL DEFAULT 0.8, max_tokens INTEGER DEFAULT 2048, top_p REAL DEFAULT 1.0, frequency_penalty REAL DEFAULT 0, presence_penalty REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, script_id TEXT NOT NULL, character_id TEXT NOT NULL, parent_id TEXT DEFAULT NULL, title TEXT DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(script_id) REFERENCES scripts(id), FOREIGN KEY(character_id) REFERENCES characters(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant','system')), content TEXT NOT NULL, timestamp INTEGER NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS prompt_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', system_prompt TEXT NOT NULL, is_built_in INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`);

  db.run('CREATE INDEX IF NOT EXISTS idx_characters_script_id ON characters(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_script_id ON conversations(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_character_id ON conversations(character_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');

  /** Idempotent migration: always try to add legacy columns, regardless of user_version.
   *  try/catch silently skips if column already exists — safe to run every startup. */
  try { db.run('ALTER TABLE conversations ADD COLUMN parent_id TEXT DEFAULT NULL'); } catch (_) { /* exists */ }
  try { db.run('ALTER TABLE scripts ADD COLUMN extra_data TEXT DEFAULT \'{}\''); } catch (_) { /* exists */ }

  // Version-based migration for future schema changes
  const currentVersion = db.exec('PRAGMA user_version');
  const version = currentVersion.length ? (currentVersion[0].values[0] as number[])[0] : 0;
  if (version < 1) {
    db.run('PRAGMA user_version = 1');
  }

  // Seed templates
  const tc = db.exec('SELECT COUNT(*) as c FROM prompt_templates');
  if (!tc.length || (tc[0].values[0] as number[])[0] === 0) {
    seedTemplates(db);
  }

  saveDb();
}

function seedTemplates(db: any): void {
  const now = Date.now();
  const tpls = [
    { id: 'tpl_default', name: '默认', desc: '标准角色扮演提示词', prompt: '你是{name}，下面是你的人设：\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上人设进行角色扮演。你需要：\n1. 始终以{name}的身份说话，不要跳出角色。\n2. 保持符合角色性格和背景的语气、用词和说话风格。\n3. 不要提及你是AI或语言模型，你就是{name}本人。\n4. 回答应自然流畅，符合角色设定。' },
    { id: 'tpl_ancient', name: '古风角色', desc: '适合仙侠、武侠、古装剧角色', prompt: '你是{name}，一位身处古风世界的角色。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景**：{background}\n**说话风格**：请使用文雅的古风用语，多用成语典故，语气需符合角色身份与时代背景。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上设定。你的每一句话都应有古风韵味，可以适当引用诗词典故，语气需符合古代礼数和角色身份地位。\n\n此外，请在每轮对话末尾用 \`[SUGGESTIONS: 选项1 | 选项2 | 选项3]\` 格式提供三个可能的用户回应或行动选项。' },
    { id: 'tpl_modern', name: '现代角色', desc: '适合都市、校园、职场剧角色', prompt: '你是{name}，一个生活在现代的人。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：请使用现代口语化的表达，自然流畅。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请严格遵循以上设定。你的对话应该自然、生活化，像真人一样思考与表达。' },
    { id: 'tpl_rpg', name: 'RPG 旁白', desc: '适合跑团、冒险类剧本', prompt: '你是{name}，一名冒险者。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**外貌**：{appearance}\n\n**世界观**：{scriptBackground}\n\n你正在进行一场冒险。请以角色扮演的方式回应，描述角色的动作、表情和心理活动可以使用 \`*动作描述*\` 的格式。说话风格：{speakingStyle}\n\n请以第二人称视角推进剧情，在关键节点提供选择，并用 \`[SUGGESTIONS: 选项1 | 选项2 | 选项3]\` 格式给出三个可选行动。' },
    { id: 'tpl_intimate', name: '亲密关系', desc: '适合恋爱、亲密关系类角色', prompt: '你是{name}，与对方有着特殊的关系。\n\n**姓名**：{name}\n**性格**：{personality}\n**背景故事**：{background}\n**说话风格**：请使用温柔、亲密的语气。{speakingStyle}\n**外貌**：{appearance}\n\n{scriptBackground}\n\n请以{name}的身份进行自然、亲密的对话。注意情感的渐进发展，不要过于突兀。表达应细腻真实，体现角色的个性和情感深度。' },
    { id: 'tpl_narrative', name: '叙事创作系统', desc: '三位一体叙事空间创作系统v3.0 — 商业网文策划+代笔+AI', prompt: NARRATIVE_TEMPLATE },
  ];
  for (const t of tpls) {
    db.run('INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, 1, ?)', [t.id, t.name, t.desc, t.prompt, now]);
  }
}
