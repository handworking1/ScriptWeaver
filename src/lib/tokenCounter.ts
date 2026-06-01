/**
 * Simple token counting utility.
 * Approximates tokens for mixed Chinese/English text.
 * Chinese characters ≈ 1 token each, English words ≈ 1.3 tokens each.
 * Fallback: chars / 2.5 for mixed content.
 */
export function estimateTokens(text: string): number {
  let chineseChars = 0;
  let englishTokens = 0;

  for (const char of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
      chineseChars++;
    }
  }

  // Remove Chinese chars, count remaining words
  const nonChinese = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const words = nonChinese.split(/\s+/).filter(Boolean);
  englishTokens = Math.ceil(words.length * 1.3);

  const total = chineseChars + englishTokens;
  return Math.max(1, total || Math.ceil(text.length / 2.5));
}

export function estimateMessagesTokens(messages: { content: string }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/** Estimated cost per 1M tokens (user-configurable) */
const DEFAULT_INPUT_COST = 0.15;   // $0.15 per 1M input tokens (GPT-4o-mini)
const DEFAULT_OUTPUT_COST = 0.60;  // $0.60 per 1M output tokens

export function estimateCost(promptTokens: number, completionTokens: number): string {
  const cost = (promptTokens / 1_000_000) * DEFAULT_INPUT_COST +
    (completionTokens / 1_000_000) * DEFAULT_OUTPUT_COST;
  if (cost < 0.01) return '< $0.01';
  return `$${cost.toFixed(4)}`;
}
