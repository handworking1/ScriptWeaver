import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { setDb, saveDb } from './utils';
import { seedTemplates } from './seedTemplates';

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'script-chat.db');

  // en: 用 require.resolve 定位 sql.js 包根路径，比硬编码 ../ 层级更健壮
  // Use require.resolve to locate sql.js package root — more robust than hardcoded '../' levels
  let pkgDist = '';
  try {
    pkgDist = path.join(path.dirname(require.resolve('sql.js/package.json')), 'dist');
  } catch { /* require.resolve unavailable in some bundling setups — fall through */ }

  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (pkgDist) {
        const p = path.join(pkgDist, file);
        if (fs.existsSync(p)) return p;
      }
      // Fallback paths for dev / electron-builder asar-unpacked / 开发/打包场景的备选路径
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
  db.run(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, script_id TEXT NOT NULL, character_id TEXT DEFAULT NULL, parent_id TEXT DEFAULT NULL, title TEXT DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(script_id) REFERENCES scripts(id), FOREIGN KEY(character_id) REFERENCES characters(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant','system')), content TEXT NOT NULL, timestamp INTEGER NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS prompt_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', system_prompt TEXT NOT NULL, is_built_in INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`);

  db.run('CREATE INDEX IF NOT EXISTS idx_characters_script_id ON characters(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_script_id ON conversations(script_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_character_id ON conversations(character_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');

  /** Idempotent migration: always try to add legacy columns, regardless of user_version.
   *  幂等迁移：始终尝试添加遗留列，不依赖版本号。try/catch 在列已存在时静默跳过。 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  try { db.run('ALTER TABLE conversations ADD COLUMN parent_id TEXT DEFAULT NULL'); } catch (_e) { /* exists */ }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  try { db.run('ALTER TABLE scripts ADD COLUMN extra_data TEXT DEFAULT \'{}\''); } catch (_e) { /* exists */ }

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

