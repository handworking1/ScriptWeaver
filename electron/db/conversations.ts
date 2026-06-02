import { execAll, execOne, run } from './utils';
import type { ConversationRow } from './types';

export function getAllConversations(scriptId?: string, characterId?: string): ConversationRow[] {
  let sql = 'SELECT * FROM conversations WHERE 1=1'; const params: any[] = [];
  if (scriptId) { sql += ' AND script_id = ?'; params.push(scriptId); }
  if (characterId) { sql += ' AND character_id = ?'; params.push(characterId); }
  sql += ' ORDER BY updated_at DESC';
  return execAll<ConversationRow>(sql, params.length ? params : undefined);
}
export function getConversation(id: string): ConversationRow | null { return execOne<ConversationRow>('SELECT * FROM conversations WHERE id = ?', [id]); }

/** Create a conversation. World-mode (no character) passes empty string for characterId → stored as NULL.
 *  创建对话。世界模式（无角色）传入空字符串 characterId → 存储为 NULL。 */
export function createConversation(data: { id: string; scriptId: string; characterId: string; parentId?: string | null; title?: string; createdAt: number; updatedAt: number }) {
  const cid = data.characterId || null; // world mode '' → NULL
  run('INSERT INTO conversations (id, script_id, character_id, parent_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scriptId, cid, data.parentId ?? null, data.title ?? '', data.createdAt, data.updatedAt]);
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
