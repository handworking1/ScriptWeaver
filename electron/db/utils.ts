import { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string | undefined;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function setDb(d: SqlJsDatabase, path: string): void {
  db = d;
  dbPath = path;
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/** Debounced save — waits 500ms after last write before flushing to disk */
export function saveDb(): void {
  if (!db || !dbPath) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!db || !dbPath) return;
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  }, 500);
}

/** Force immediate save (for app shutdown) */
export function saveDbSync(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!db || !dbPath) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

/** Execute a SELECT query returning multiple rows, typed as T[].
 *  Defaults to `Record<string, unknown>` when T is omitted.
 *  执行 SELECT 查询返回多行，默认返回 Record<string, unknown>。 */
export function execAll<T = Record<string, unknown>>(sql: string, params?: any[]): T[] {
  const d = getDb();
  if (params) {
    const stmt = d.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
    stmt.free();
    return rows;
  }
  const results = d.exec(sql);
  if (!results.length) return [];
  const [{ columns, values }] = results;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as T;
  });
}

/** Execute a SELECT query returning a single row or null.
 *  执行 SELECT 查询返回单行或 null。 */
export function execOne<T = Record<string, unknown>>(sql: string, params: any[]): T | null {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  let row: T | null = null;
  if (stmt.step()) row = stmt.getAsObject() as unknown as T;
  stmt.free();
  return row;
}

export function run(sql: string, params?: any[]): void {
  if (params) getDb().run(sql, params);
  else getDb().run(sql);
  saveDb();
}
