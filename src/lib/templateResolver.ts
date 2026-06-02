import type { Character, PromptTemplate } from '@/types';

const PLACEHOLDERS: Record<string, (char: Character, scriptBackground: string) => string> = {
  '{name}': (c) => c.name,
  '{personality}': (c) => c.personality || '无',
  '{background}': (c) => c.background || '无',
  '{speakingStyle}': (c) => c.speakingStyle || '无',
  '{appearance}': (c) => c.appearance || '无',
  '{scriptBackground}': (_c, bg) => bg || '无',
};

export function resolveTemplate(template: PromptTemplate, character: Character, scriptBackground: string): string {
  let result = template.systemPrompt;
  for (const [key, resolver] of Object.entries(PLACEHOLDERS)) {
    result = result.replaceAll(key, resolver(character, scriptBackground));
  }
  return result;
}

export function resolveTemplatePreview(template: PromptTemplate): string {
  let result = template.systemPrompt;
  for (const key of Object.keys(PLACEHOLDERS)) {
    result = result.replaceAll(key, `[${key.slice(1, -1)}]`);
  }
  return result;
}

/** Extract [SUGGESTIONS: ...] from AI reply. Handles | 、separators + numbered prefixes. */
export function extractSuggestions(content: string): string[] {
  // Support | / 、separators, numbered prefixes, newlines inside brackets
  const match = content.match(/\[SUGGESTIONS:\s*([\s\S]+?)\]/);
  if (!match) return [];
  const raw = match[1].trim();
  // Try splitting by | or 、first
  let items = raw.split(/[|、]/);
  // If that didn't split (e.g. AI used "1. A 2. B 3. C" format), split on numbered markers
  if (items.length <= 1 && /\d+[\.\、\)）]/.test(raw)) {
    items = raw.split(/(?=\d+[\.\、\)）])/);
  }
  return items
    .map(s => s.replace(/^\s*\d+[\.\、\)）]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function stripSuggestions(content: string): string {
  return content.replace(/\s*\[SUGGESTIONS:\s*[\s\S]+?\]/g, '');
}
