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

  test('estimateTokens returns 1 for empty', () => {
    expect(estimateTokens('')).toBe(1);
  });

  test('estimateCost formats correctly', () => {
    expect(estimateCost(0, 1000)).toMatch(/^[<$]/);
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
