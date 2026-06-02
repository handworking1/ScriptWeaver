import { execAll, execOne, run } from './utils';
import type { ScriptRow } from './types';

export function getAllScripts(): ScriptRow[] { return execAll<ScriptRow>('SELECT * FROM scripts ORDER BY updated_at DESC'); }
export function getScript(id: string): ScriptRow | null { return execOne<ScriptRow>('SELECT * FROM scripts WHERE id = ?', [id]); }

export function createScript(data: { id: string; title: string; worldSetting?: string; background?: string; extraData?: string; createdAt: number; updatedAt: number }) {
  run('INSERT INTO scripts (id, title, world_setting, background, extra_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.title, data.worldSetting ?? '', data.background ?? '', data.extraData ?? '{}', data.createdAt, data.updatedAt]);
  return getScript(data.id);
}

export function updateScript(id: string, data: { title?: string; worldSetting?: string; background?: string; extraData?: string }) {
  const sets: string[] = []; const params: any[] = [];
  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.worldSetting !== undefined) { sets.push('world_setting = ?'); params.push(data.worldSetting); }
  if (data.background !== undefined) { sets.push('background = ?'); params.push(data.background); }
  if (data.extraData !== undefined) { sets.push('extra_data = ?'); params.push(data.extraData); }
  if (sets.length > 0) { sets.push('updated_at = ?'); params.push(Date.now()); params.push(id); run(`UPDATE scripts SET ${sets.join(', ')} WHERE id = ?`, params); }
  return getScript(id);
}

export function deleteScript(id: string) {
  // en: 级联清理关联数据 / Cascade cleanup related data
  const convs = execAll<{ id: string }>('SELECT id FROM conversations WHERE script_id = ?', [id]);
  for (const c of convs) run('DELETE FROM messages WHERE conversation_id = ?', [c.id]);
  run('DELETE FROM conversations WHERE script_id = ?', [id]);
  run('DELETE FROM characters WHERE script_id = ?', [id]);
  run('DELETE FROM scripts WHERE id = ?', [id]);
}
