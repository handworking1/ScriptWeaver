import { execOne, run } from './utils';

export function getSetting(key: string): string | null {
  const row = execOne<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}
