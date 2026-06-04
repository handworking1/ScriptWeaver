/**
 * Simple token counting utility.
 * Approximates tokens for mixed Chinese/English text.
 * Chinese characters ≈ 1 token each, English words ≈ 1.3 tokens each.
 * Fallback: chars / 2.5 for mixed content.
 */
/** en: Fast token estimator — single-pass Chinese char count, O(n) not O(n²).
 *  zh: 快速 token 估算——单次扫描中文字符数，O(n) 而非 O(n²)。 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Single regex for all Chinese chars / 一次正则匹配所有中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

  // Remove Chinese chars, count remaining words
  const nonChinese = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  const words = nonChinese.split(/\s+/).filter(Boolean);
  const englishTokens = Math.ceil(words.length * 1.3);

  const total = chineseChars + englishTokens;
  return Math.max(1, total || Math.ceil(text.length / 2.5));
}

export function estimateMessagesTokens(messages: { content: string }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/** Estimated cost per 1M tokens — approximate reference only, varies by model.
 *  Prices in USD per 1M tokens from official pricing pages (2026-06).
 *  每百万 token 成本估算（USD），数据来自官方定价页。 */
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'deepseek-chat':     { input: 0.27, output: 1.10 },   // DeepSeek V3
  'deepseek-reasoner': { input: 0.55, output: 2.19 },   // DeepSeek R1
  'deepseek-v4-pro':   { input: 0.40, output: 1.60 },   // DeepSeek V4 Pro (est.)
  'deepseek-v4-flash': { input: 0.20, output: 0.80 },   // DeepSeek V4 Flash (est.)
  'gpt-4o':            { input: 2.50, output: 10.00 },
  'gpt-4o-mini':       { input: 0.15, output: 0.60 },
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'qwen-max':          { input: 0.40, output: 1.20 },
  'glm-4':             { input: 0.10, output: 0.10 },
  'moonshot-v1':       { input: 0.60, output: 0.60 },
};
const DEFAULT_PRICE = { input: 0.30, output: 1.20 };

/** Return price for a model — partial name match (e.g. "deepseek-v4-pro-202506" matches "deepseek-v4-pro").
 *  模型名部分匹配——如 "deepseek-v4-pro-202506" 匹配 "deepseek-v4-pro"。 */
function getPrice(model?: string): { input: number; output: number } {
  if (!model) return DEFAULT_PRICE;
  // Exact match first
  if (MODEL_PRICES[model]) return MODEL_PRICES[model];
  // Partial match — longest matching key wins
  let bestLen = 0;
  let bestPrice = DEFAULT_PRICE;
  for (const [k, v] of Object.entries(MODEL_PRICES)) {
    if (model.includes(k) && k.length > bestLen) {
      bestLen = k.length;
      bestPrice = v;
    }
  }
  return bestPrice;
}

export function estimateCost(promptTokens: number, completionTokens: number, model?: string): string {
  const price = getPrice(model);
  const cost = (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output;
  if (cost < 0.01) return '≈ <$0.01';
  return `≈ $${cost.toFixed(4)}`;
}
