import { execAll, execOne, run } from './utils';
import type { CharacterRow } from './types';

export function getAllCharacters(scriptId: string): CharacterRow[] { return execAll<CharacterRow>('SELECT * FROM characters WHERE script_id = ? ORDER BY created_at ASC', [scriptId]); }
export function getCharacter(id: string): CharacterRow | null { return execOne<CharacterRow>('SELECT * FROM characters WHERE id = ?', [id]); }

export function createCharacter(data: { id: string; scriptId: string; name: string; personality?: string; background?: string; speakingStyle?: string; appearance?: string; avatar?: string; createdAt: number }) {
  run('INSERT INTO characters (id, script_id, name, personality, background, speaking_style, appearance, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.scriptId, data.name, data.personality ?? '', data.background ?? '', data.speakingStyle ?? '', data.appearance ?? '', data.avatar ?? '', data.createdAt]);
  return getCharacter(data.id);
}

export function updateCharacter(id: string, data: { name?: string; personality?: string; background?: string; speakingStyle?: string; appearance?: string; avatar?: string }) {
  const sets: string[] = []; const params: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.personality !== undefined) { sets.push('personality = ?'); params.push(data.personality); }
  if (data.background !== undefined) { sets.push('background = ?'); params.push(data.background); }
  if (data.speakingStyle !== undefined) { sets.push('speaking_style = ?'); params.push(data.speakingStyle); }
  if (data.appearance !== undefined) { sets.push('appearance = ?'); params.push(data.appearance); }
  if (data.avatar !== undefined) { sets.push('avatar = ?'); params.push(data.avatar); }
  if (sets.length > 0) { params.push(id); run(`UPDATE characters SET ${sets.join(', ')} WHERE id = ?`, params); }
  return getCharacter(id);
}

export function deleteCharacter(id: string) { run('DELETE FROM characters WHERE id = ?', [id]); }
