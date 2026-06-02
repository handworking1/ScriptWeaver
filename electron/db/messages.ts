import { execAll, run } from './utils';
import type { MessageRow } from './types';

export function getAllMessages(conversationId: string): MessageRow[] { return execAll<MessageRow>('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [conversationId]); }

export function createMessage(data: { id: string; conversationId: string; role: string; content: string; timestamp: number }) {
  run('INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    [data.id, data.conversationId, data.role, data.content, data.timestamp]);
  return { id: data.id, conversationId: data.conversationId, role: data.role, content: data.content, timestamp: data.timestamp };
}

export function updateMessage(id: string, content: string) { run('UPDATE messages SET content = ? WHERE id = ?', [content, id]); }
export function deleteMessagesAfter(conversationId: string, afterTimestamp: number) { run('DELETE FROM messages WHERE conversation_id = ? AND timestamp > ?', [conversationId, afterTimestamp]); }
