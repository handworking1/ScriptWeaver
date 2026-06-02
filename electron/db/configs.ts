import { execAll, execOne, run } from './utils';
import type { AIConfigRow } from './types';

export function getAllAIConfigs(): AIConfigRow[] { return execAll<AIConfigRow>('SELECT * FROM ai_configs ORDER BY rowid ASC'); }
export function getAIConfig(id: string): AIConfigRow | null { return execOne<AIConfigRow>('SELECT * FROM ai_configs WHERE id = ?', [id]); }

export function createAIConfig(data: { id: string; name: string; apiUrl: string; apiKeyEncrypted: string; model: string; temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number }) {
  run('INSERT INTO ai_configs (id, name, api_url, api_key_encrypted, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.name, data.apiUrl, data.apiKeyEncrypted, data.model, data.temperature, data.maxTokens, data.topP, data.frequencyPenalty, data.presencePenalty]);
  return getAIConfig(data.id);
}

export function updateAIConfig(id: string, data: Partial<{ name: string; apiUrl: string; apiKeyEncrypted: string; model: string; temperature: number; maxTokens: number; topP: number; frequencyPenalty: number; presencePenalty: number }>) {
  const fm: Record<string, string> = { name: 'name', apiUrl: 'api_url', apiKeyEncrypted: 'api_key_encrypted', model: 'model', temperature: 'temperature', maxTokens: 'max_tokens', topP: 'top_p', frequencyPenalty: 'frequency_penalty', presencePenalty: 'presence_penalty' };
  const sets: string[] = []; const params: any[] = [];
  for (const [k, c] of Object.entries(fm)) { if (data[k as keyof typeof data] !== undefined) { sets.push(`${c} = ?`); params.push(data[k as keyof typeof data]); } }
  if (sets.length > 0) { params.push(id); run(`UPDATE ai_configs SET ${sets.join(', ')} WHERE id = ?`, params); }
  return getAIConfig(id);
}

export function deleteAIConfig(id: string) { run('DELETE FROM ai_configs WHERE id = ?', [id]); }
