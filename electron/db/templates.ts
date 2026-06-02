import { execAll, execOne, run } from './utils';

export function getAllPromptTemplates() { return execAll('SELECT * FROM prompt_templates ORDER BY is_built_in DESC, created_at ASC'); }
export function getPromptTemplate(id: string) { return execOne('SELECT * FROM prompt_templates WHERE id = ?', [id]); }

export function createPromptTemplate(data: { id: string; name: string; description?: string; systemPrompt: string; isBuiltIn?: boolean; createdAt: number }) {
  run('INSERT INTO prompt_templates (id, name, description, system_prompt, is_built_in, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.name, data.description ?? '', data.systemPrompt, data.isBuiltIn ? 1 : 0, data.createdAt]);
  return getPromptTemplate(data.id);
}

export function updatePromptTemplate(id: string, data: { name?: string; description?: string; systemPrompt?: string }) {
  const sets: string[] = []; const params: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.systemPrompt !== undefined) { sets.push('system_prompt = ?'); params.push(data.systemPrompt); }
  if (sets.length > 0) { params.push(id); run(`UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = ?`, params); }
  return getPromptTemplate(id);
}

export function deletePromptTemplate(id: string) { run('DELETE FROM prompt_templates WHERE id = ?', [id]); }
