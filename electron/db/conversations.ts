import { execAll, execOne, run } from './utils';

export function getAllConversations(scriptId?: string, characterId?: string) {
  let sql = 'SELECT * FROM conversations WHERE 1=1'; const params: any[] = [];
  if (scriptId) { sql += ' AND script_id = ?'; params.push(scriptId); }
  if (characterId) { sql += ' AND character_id = ?'; params.push(characterId); }
  sql += ' ORDER BY updated_at DESC';
  return execAll(sql, params.length ? params : undefined);
}
export function getConversation(id: string) { return execOne('SELECT * FROM conversations WHERE id = ?', [id]); }

export function createConversation(data: { id: string; scriptId: string; characterId: string; parentId?: string | null; title?: string; createdAt: number; updatedAt: number }) {
  run('INSERT INTO conversations (id, script_id, character_id, parent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scriptId, data.characterId, data.parentId ?? null, data.title ?? '', data.createdAt, data.updatedAt]);
  return getConversation(data.id);
}

export function getConversationBranches(id: string) { return execAll('SELECT id, title, created_at FROM conversations WHERE parent_id = ? ORDER BY created_at ASC', [id]); }

export function updateConversation(id: string, data: { title?: string }) {
  const sets: string[] = []; const params: any[] = [];
  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  sets.push('updated_at = ?'); params.push(Date.now()); params.push(id);
  run(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`, params);
  return getConversation(id);
}

export function deleteConversation(id: string) { run('DELETE FROM conversations WHERE id = ?', [id]); }
