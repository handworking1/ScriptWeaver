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

/** Export a single script with its characters / 导出单个剧本及其角色 */
export function exportScript(scriptId: string) {
  const d = getDb();
  const stmt = d.prepare('SELECT * FROM scripts WHERE id = ?');
  stmt.bind([scriptId]);
  let script: any = null;
  if (stmt.step()) script = stmt.getAsObject();
  stmt.free();
  if (!script) throw new Error('剧本不存在');

  const chars = execAll('SELECT * FROM characters WHERE script_id = ?', [scriptId]);
  return {
    type: 'scriptweaver-script-export',
    version: 1,
    script,
    characters: chars,
  };
}

/** Import a single script export (merge, don't wipe) / 导入单个剧本导出（合并，不覆盖现有数据） */
export function importScript(data: any) {
  if (data?.type !== 'scriptweaver-script-export') throw new Error('无效的剧本导出文件格式');
  if (!data.script || !data.script.id || !data.script.title) throw new Error('导出文件中缺少剧本数据');
  if (!Array.isArray(data.characters)) throw new Error('导出文件中缺少角色数据');

  const d = getDb();
  try {
    d.run('BEGIN TRANSACTION');
    const s = data.script;
    // UPSERT: replace if same id exists, or insert new / 同名ID则替换，否则插入
    d.run('INSERT OR REPLACE INTO scripts (id, title, world_setting, background, extra_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.title, s.world_setting ?? '', s.background ?? '', s.extra_data ?? '{}', s.created_at || Date.now(), s.updated_at || Date.now()]);
    for (const c of data.characters) {
      if (!c.id || !c.name) continue;
      const exists = d.exec('SELECT COUNT(*) as c FROM characters WHERE id = ?', [c.id]);
      const count = exists.length ? (exists[0].values[0] as number[])[0] : 0;
      if (count > 0) {
        d.run('UPDATE characters SET name=?, personality=?, background=?, speaking_style=?, appearance=?, avatar=? WHERE id=?',
          [c.name, c.personality ?? '', c.background ?? '', c.speakingStyle ?? c.speaking_style ?? '', c.appearance ?? '', c.avatar ?? '', c.id]);
      } else {
        d.run('INSERT INTO characters (id, script_id, name, personality, background, speaking_style, appearance, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [c.id, s.id, c.name, c.personality ?? '', c.background ?? '', c.speakingStyle ?? c.speaking_style ?? '', c.appearance ?? '', c.avatar ?? '', c.created_at || Date.now()]);
      }
    }
    d.run('COMMIT');
  } catch (err: any) {
    d.run('ROLLBACK');
    throw err;
  }
  saveDb();
}

/** Field-level validation for imported data / 导入数据字段级校验 */
function validateField(row: any, field: string, type: string, idx: number, table: string): void {
  if (row[field] === undefined || row[field] === null) {
    throw new Error(`导入数据无效: ${table}[${idx}].${field} 缺少必填字段 (type: ${type})`);
  }
  if (type === 'string' && typeof row[field] !== 'string') {
    throw new Error(`导入数据无效: ${table}[${idx}].${field} 应为字符串，实际为 ${typeof row[field]}`);
  }
  if (type === 'number') {
    if (typeof row[field] !== 'number' || Number.isNaN(row[field])) {
      throw new Error(`导入数据无效: ${table}[${idx}].${field} 应为有效数字，实际为 ${typeof row[field]}${Number.isNaN(row[field]) ? ' (NaN)' : ''}`);
    }
  }
}

/** Validates role is one of user/assistant/system / 校验角色枚举值 */
const VALID_ROLES = ['user', 'assistant', 'system'];

export function importAllData(data: { scripts: any[]; characters: any[]; conversations: any[]; messages: any[]; aiConfigs: any[]; promptTemplates?: any[] }) {
  if (!Array.isArray(data.scripts) || !Array.isArray(data.characters) || !Array.isArray(data.conversations) || !Array.isArray(data.messages) || !Array.isArray(data.aiConfigs)) {
    throw new Error('导入数据格式无效：缺少必要的数据表');
  }
  // en: 逐行校验必填字段+类型 / Validate required fields + types row by row
  data.scripts.forEach((s, i) => { validateField(s, 'id', 'string', i, 'scripts'); validateField(s, 'title', 'string', i, 'scripts'); validateField(s, 'created_at', 'number', i, 'scripts'); validateField(s, 'updated_at', 'number', i, 'scripts'); });
  data.characters.forEach((c, i) => { validateField(c, 'id', 'string', i, 'characters'); validateField(c, 'script_id', 'string', i, 'characters'); validateField(c, 'name', 'string', i, 'characters'); validateField(c, 'created_at', 'number', i, 'characters'); });
  data.conversations.forEach((c, i) => { validateField(c, 'id', 'string', i, 'conversations'); validateField(c, 'script_id', 'string', i, 'conversations'); if (c.character_id !== null && c.character_id !== '') validateField(c, 'character_id', 'string', i, 'conversations'); validateField(c, 'created_at', 'number', i, 'conversations'); validateField(c, 'updated_at', 'number', i, 'conversations'); });
  data.messages.forEach((m, i) => { validateField(m, 'id', 'string', i, 'messages'); validateField(m, 'conversation_id', 'string', i, 'messages'); validateField(m, 'role', 'string', i, 'messages'); validateField(m, 'content', 'string', i, 'messages'); validateField(m, 'timestamp', 'number', i, 'messages'); if (!VALID_ROLES.includes(m.role)) throw new Error(`导入数据无效: messages[${i}].role 值 "${m.role}" 不在允许范围 [${VALID_ROLES.join(', ')}]`); });
  data.aiConfigs.forEach((c, i) => { validateField(c, 'id', 'string', i, 'aiConfigs'); validateField(c, 'name', 'string', i, 'aiConfigs'); validateField(c, 'api_url', 'string', i, 'aiConfigs'); validateField(c, 'model', 'string', i, 'aiConfigs'); });
  if (data.promptTemplates) {
    data.promptTemplates.forEach((t, i) => { validateField(t, 'id', 'string', i, 'promptTemplates'); validateField(t, 'name', 'string', i, 'promptTemplates'); if (t.system_prompt === undefined && t.systemPrompt === undefined) throw new Error(`导入数据无效: promptTemplates[${i}].system_prompt 缺少必填字段`); });
  }
  const d = getDb();
  try {
  d.run('BEGIN TRANSACTION');
  // en: 不删除 prompt_templates——保留内置模板；导入的模板追加或覆盖 / Don't delete prompt_templates — keep built-in seeds; imported templates append/overwrite
  d.run('DELETE FROM messages'); d.run('DELETE FROM conversations'); d.run('DELETE FROM characters'); d.run('DELETE FROM scripts'); d.run('DELETE FROM ai_configs');
  // Delete only non-built-in templates before import to allow overwrite / 只删非内置模板
  d.run('DELETE FROM prompt_templates WHERE is_built_in = 0');
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
