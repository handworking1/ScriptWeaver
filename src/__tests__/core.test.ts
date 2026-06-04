import { extractSuggestions, stripSuggestions, resolveTemplatePreview } from '@/lib/templateResolver';
import { estimateTokens, estimateCost } from '@/lib/tokenCounter';
import { buildSystemPrompt } from '@/lib/systemPrompt';

describe('templateResolver', () => {
  test('extractSuggestions parses single suggestion', () => {
    const result = extractSuggestions('[SUGGESTIONS: 选项1 | 选项2 | 选项3]');
    expect(result).toEqual(['选项1', '选项2', '选项3']);
  });

  test('extractSuggestions returns empty for no match', () => {
    expect(extractSuggestions('普通文本')).toEqual([]);
  });

  test('extractSuggestions caps at 3', () => {
    expect(extractSuggestions('[SUGGESTIONS: A | B | C | D | E]')).toHaveLength(3);
  });

  test('stripSuggestions removes all SUGGESTIONS blocks', () => {
    const input = '前面内容\n[SUGGESTIONS: A | B]\n后面内容';
    const result = stripSuggestions(input);
    expect(result).not.toContain('SUGGESTIONS');
    expect(result).toContain('前面内容');
    expect(result).toContain('后面内容');
  });

  test('resolveTemplatePreview replaces placeholders', () => {
    const tpl = { id: 'x', name: 't', description: '', systemPrompt: '你是{name}，{personality}', isBuiltIn: false, createdAt: 0 };
    const result = resolveTemplatePreview(tpl);
    expect(result).toContain('[name]');
    expect(result).toContain('[personality]');
  });
});

describe('tokenCounter', () => {
  test('estimateTokens returns positive for non-empty text', () => {
    expect(estimateTokens('你好世界')).toBeGreaterThan(0);
  });

  test('estimateTokens returns 0 for empty', () => {
    expect(estimateTokens('')).toBe(0);
  });

  test('estimateCost formats correctly', () => {
    const result = estimateCost(0, 1000);
    expect(result).toMatch(/≈/);
  });
});

describe('systemPrompt', () => {
  test('includes character name', () => {
    const char = { id: '1', scriptId: 's1', name: '林婉儿', personality: '傲娇', background: '', speakingStyle: '', appearance: '', avatar: '', createdAt: 0 };
    const prompt = buildSystemPrompt(char);
    expect(prompt).toContain('林婉儿');
    expect(prompt).toContain('傲娇');
  });
});

// ─── validate.ts ──────────────────────────────────────────
import { normalizeApiUrl } from '../../electron/validate';

describe('normalizeApiUrl', () => {
  test('plain domain → appends /v1/chat/completions', () => {
    expect(normalizeApiUrl('https://api.openai.com')).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('trailing slash → stripped before append', () => {
    expect(normalizeApiUrl('https://api.openai.com/')).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('/v1 path → appends only /chat/completions', () => {
    expect(normalizeApiUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('/v1/ path → same as above', () => {
    expect(normalizeApiUrl('https://api.deepseek.com/v1/')).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  test('localhost with /v1', () => {
    expect(normalizeApiUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1/chat/completions');
  });

  test('already complete → passthrough', () => {
    expect(normalizeApiUrl('https://api.openai.com/v1/chat/completions'))
      .toBe('https://api.openai.com/v1/chat/completions');
  });
});

// ─── ipc-handlers.ts ─────────────────────────────────────
import { friendlyError } from '../../electron/ipc-handlers';

describe('friendlyError', () => {
  test('401 → Key invalid', () => {
    expect(friendlyError(401, '')).toContain('API Key');
  });

  test('403 → Access denied', () => {
    expect(friendlyError(403, '')).toContain('访问被拒绝');
  });

  test('429 → Rate limited', () => {
    expect(friendlyError(429, '')).toContain('过于频繁');
  });

  test('5xx → Server fault', () => {
    expect(friendlyError(500, '')).toContain('服务器故障');
    expect(friendlyError(503, '')).toContain('服务器故障');
  });

  test('ECONNREFUSED → Connection error', () => {
    expect(friendlyError(0, 'ECONNREFUSED')).toContain('无法连接');
  });

  test('ETIMEDOUT → Timeout', () => {
    expect(friendlyError(0, 'ETIMEDOUT')).toContain('超时');
  });

  test('unknown error → fallback with status', () => {
    const result = friendlyError(418, 'Teapot');
    expect(result).toContain('418');
    expect(result).toContain('Teapot');
  });
});
