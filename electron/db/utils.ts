import { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string;
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
    const data = db!.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }, 500);
}

/** Force immediate save (for app shutdown) */
export function saveDbSync(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!db || !dbPath) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

export function execAll(sql: string, params?: any[]): any[] {
  const d = getDb();
  if (params) {
    const stmt = d.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  const results = d.exec(sql);
  if (!results.length) return [];
  const [{ columns, values }] = results;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export function execOne(sql: string, params: any[]): any | null {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

export function run(sql: string, params?: any[]): void {
  if (params) getDb().run(sql, params);
  else getDb().run(sql);
  saveDb();
}
