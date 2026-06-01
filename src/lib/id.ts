import { nanoid } from 'nanoid';

/** Generate a unique id for database records */
export function generateId(): string {
  return nanoid();
}
