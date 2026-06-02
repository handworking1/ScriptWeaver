/** Minimal input validation for IPC handlers */

export function validateId(id: unknown, label: string): asserts id is string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
    throw new Error(`${label} 格式无效`);
  }
}

export function validateText(text: unknown, label: string, maxLen = 10000): asserts text is string {
  if (typeof text !== 'string' || text.length > maxLen) {
    throw new Error(`${label} 长度无效`);
  }
}

export function validateRole(role: unknown): asserts role is 'user' | 'assistant' | 'system' {
  if (role !== 'user' && role !== 'assistant' && role !== 'system') {
    throw new Error('role 必须为 user/assistant/system');
  }
}
