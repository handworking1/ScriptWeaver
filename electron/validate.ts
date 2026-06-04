/** Input validation for IPC handlers — basic + business-level checks */

const MAX_ID_LEN = 64;
const MAX_TITLE_LEN = 200;
const MAX_URL_LEN = 500;
const MAX_CONTENT_LEN = 100000;
const MAX_API_KEY_LEN = 512;

export function validateId(id: unknown, label: string): asserts id is string {
  if (typeof id !== 'string') throw new Error(`${label} 必须是字符串`);
  if (id.length === 0) throw new Error(`${label} 不能为空`);
  if (id.length > MAX_ID_LEN) throw new Error(`${label} 超过最大长度 ${MAX_ID_LEN}`);
  if (!/^[a-zA-Z0-9_\-]+$/.test(id)) throw new Error(`${label} 含无效字符（仅允许字母数字下划线和连字符）`);
}

export function validateText(text: unknown, label: string, maxLen = MAX_CONTENT_LEN): asserts text is string {
  if (typeof text !== 'string') throw new Error(`${label} 必须是字符串`);
  if (text.length > maxLen) throw new Error(`${label} 超过最大长度 ${maxLen}`);
}

export function validateRequired(text: unknown, label: string, maxLen = MAX_TITLE_LEN): asserts text is string {
  validateText(text, label, maxLen);
  if ((text as string).trim().length === 0) throw new Error(`${label} 不能为空`);
}

export function validateRole(role: unknown): asserts role is 'user' | 'assistant' | 'system' {
  if (role !== 'user' && role !== 'assistant' && role !== 'system') {
    throw new Error('role 必须为 user/assistant/system');
  }
}

export function validateUrl(url: unknown, label: string): asserts url is string {
  if (typeof url !== 'string') throw new Error(`${label} 必须是字符串`);
  if (url.length === 0) throw new Error(`${label} 不能为空`);
  if (url.length > MAX_URL_LEN) throw new Error(`${label} 超过最大长度 ${MAX_URL_LEN}`);
  if (!url.startsWith('http://') && !url.startsWith('https://')) throw new Error(`${label} 必须以 http:// 或 https:// 开头`);
}

export function validateApiKey(key: unknown, label: string): void {
  if (typeof key !== 'string') return; // empty key is OK (e.g. Ollama)
  if (key.length > MAX_API_KEY_LEN) throw new Error(`${label} 超过最大长度 ${MAX_API_KEY_LEN}`);
}

/**
 * Normalize a user-supplied API base URL to the full chat completions endpoint.
 * Handles common mistakes: trailing slashes, path already includes /v1, etc.
 *
 * 规范化用户输入的 API 基础地址为完整的 chat completions 端点。
 * 处理常见错误：尾部斜杠、路径已含 /v1 等。
 *
 * Examples:
 *   https://api.openai.com          → https://api.openai.com/v1/chat/completions
 *   https://api.openai.com/         → https://api.openai.com/v1/chat/completions
 *   https://api.openai.com/v1       → https://api.openai.com/v1/chat/completions
 *   https://api.deepseek.com/v1/    → https://api.deepseek.com/v1/chat/completions
 *   http://localhost:11434/v1       → http://localhost:11434/v1/chat/completions
 *   https://api.com/v1/chat/completions → https://api.com/v1/chat/completions (passthrough)
 */
export function normalizeApiUrl(rawUrl: string): string {
  // Strip trailing slashes / 去尾部斜杠
  let url = rawUrl.replace(/\/+$/, '');

  // Already a complete endpoint — use as-is / 已是完整端点
  if (url.endsWith('/chat/completions')) return url;

  // Already has /v1 path — just append /chat/completions / 已有 /v1 则只追加
  if (url.endsWith('/v1')) return url + '/chat/completions';

  // Append standard OpenAI-compatible path / 追加标准路径
  return url + '/v1/chat/completions';
}
