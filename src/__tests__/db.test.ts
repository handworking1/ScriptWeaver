/**
 * DB layer CRUD round-trip tests using in-memory sql.js.
 * Tests the most critical CRUD operations: scripts, characters.
 */

import initSqlJs from 'sql.js';
import { setDb } from '../../electron/db/utils';

// Prevent debounced saveDb from writing to disk
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
}));

import { createScript, getScript, getAllScripts, updateScript, deleteScript } from '../../electron/db/scripts';
import { createCharacter, getCharacter, getAllCharacters, deleteCharacter } from '../../electron/db/characters';
import { createConversation, getConversation, deleteConversation } from '../../electron/db/conversations';
import { createMessage, getAllMessages, deleteMessagesAfter } from '../../electron/db/messages';

let SQL: any;

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  // Create tables same as init.ts
  db.run('CREATE TABLE IF NOT EXISTS scripts (id TEXT PRIMARY KEY, title TEXT NOT NULL, world_setting TEXT DEFAULT \'\', background TEXT DEFAULT \'\', extra_data TEXT DEFAULT \'{}\', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, script_id TEXT NOT NULL, name TEXT NOT NULL, personality TEXT DEFAULT \'\', background TEXT DEFAULT \'\', speaking_style TEXT DEFAULT \'\', appearance TEXT DEFAULT \'\', avatar TEXT DEFAULT \'\', created_at INTEGER NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, script_id TEXT NOT NULL, character_id TEXT NOT NULL, parent_id TEXT DEFAULT NULL, title TEXT DEFAULT \'\', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL)');
  setDb(db, ':memory:');
});

describe('scripts CRUD', () => {
  test('create and get', () => {
    const s = createScript({ id: 's1', title: 'Test', worldSetting: 'World', background: 'BG', extraData: '{}', createdAt: 1, updatedAt: 1 });
    expect(s).toBeTruthy();
    expect(s!.title).toBe('Test');
    const fetched = getScript('s1');
    expect(fetched!.title).toBe('Test');
    expect(fetched!.world_setting).toBe('World');
  });

  test('getAll returns ordered by updated_at desc', () => {
    createScript({ id: 'a', title: 'Old', createdAt: 1, updatedAt: 1 });
    createScript({ id: 'b', title: 'New', createdAt: 2, updatedAt: 2 });
    const all = getAllScripts();
    expect(all.length).toBe(2);
    expect(all[0].title).toBe('New');
    expect(all[1].title).toBe('Old');
  });

  test('update modifies fields', () => {
    createScript({ id: 's1', title: 'Original', createdAt: 1, updatedAt: 1 });
    updateScript('s1', { title: 'Updated' });
    expect(getScript('s1')!.title).toBe('Updated');
  });

  test('delete removes script', () => {
    createScript({ id: 's1', title: 'ToDelete', createdAt: 1, updatedAt: 1 });
    deleteScript('s1');
    expect(getScript('s1')).toBeNull();
  });
});

describe('characters CRUD', () => {
  beforeEach(() => {
    createScript({ id: 's1', title: 'S', createdAt: 1, updatedAt: 1 });
  });

  test('create and get', () => {
    const c = createCharacter({ id: 'c1', scriptId: 's1', name: 'Alice', personality: 'Brave', createdAt: 1 });
    expect(c!.name).toBe('Alice');
    const fetched = getCharacter('c1');
    expect(fetched!.personality).toBe('Brave');
  });

  test('getAll filters by scriptId', () => {
    createScript({ id: 's2', title: 'S2', createdAt: 2, updatedAt: 2 });
    createCharacter({ id: 'c1', scriptId: 's1', name: 'Alice', createdAt: 1 });
    createCharacter({ id: 'c2', scriptId: 's1', name: 'Bob', createdAt: 2 });
    createCharacter({ id: 'c3', scriptId: 's2', name: 'Charlie', createdAt: 3 });
    expect(getAllCharacters('s1').length).toBe(2);
    expect(getAllCharacters('s2').length).toBe(1);
  });

  test('delete removes character', () => {
    createCharacter({ id: 'c1', scriptId: 's1', name: 'Alice', createdAt: 1 });
    deleteCharacter('c1');
    expect(getCharacter('c1')).toBeNull();
  });
});

describe('conversations + messages', () => {
  beforeEach(() => {
    createScript({ id: 's1', title: 'S', createdAt: 1, updatedAt: 1 });
    createCharacter({ id: 'c1', scriptId: 's1', name: 'Alice', createdAt: 1 });
  });

  test('create conversation', () => {
    const conv = createConversation({ id: 'conv1', scriptId: 's1', characterId: 'c1', title: 'Chat', createdAt: 1, updatedAt: 1 });
    expect(conv!.title).toBe('Chat');
    expect(getConversation('conv1')!.script_id).toBe('s1');
  });

  test('create and get messages', () => {
    const conv = createConversation({ id: 'conv1', scriptId: 's1', characterId: 'c1', title: 'Chat', createdAt: 1, updatedAt: 1 });
    createMessage({ id: 'm1', conversationId: 'conv1', role: 'user', content: 'Hello', timestamp: 1 });
    createMessage({ id: 'm2', conversationId: 'conv1', role: 'assistant', content: 'Hi!', timestamp: 2 });
    const msgs = getAllMessages('conv1');
    expect(msgs.length).toBe(2);
    expect(msgs[0].content).toBe('Hello');
    expect(msgs[1].content).toBe('Hi!');
  });

  test('deleteMessagesAfter removes newer messages', () => {
    const conv = createConversation({ id: 'conv1', scriptId: 's1', characterId: 'c1', title: 'Chat', createdAt: 1, updatedAt: 1 });
    createMessage({ id: 'm1', conversationId: 'conv1', role: 'user', content: 'Keep', timestamp: 1 });
    createMessage({ id: 'm2', conversationId: 'conv1', role: 'assistant', content: 'Delete', timestamp: 2 });
    deleteMessagesAfter('conv1', 1);
    expect(getAllMessages('conv1').length).toBe(1);
    expect(getAllMessages('conv1')[0].content).toBe('Keep');
  });

  test('delete conversation cascades messages', () => {
    const conv = createConversation({ id: 'conv1', scriptId: 's1', characterId: 'c1', title: 'Chat', createdAt: 1, updatedAt: 1 });
    createMessage({ id: 'm1', conversationId: 'conv1', role: 'user', content: 'Hello', timestamp: 1 });
    deleteConversation('conv1');
    expect(getConversation('conv1')).toBeNull();
    // Messages should cascade-delete via FK
    expect(getAllMessages('conv1').length).toBe(0);
  });
});
