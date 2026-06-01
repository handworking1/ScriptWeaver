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

export function extractSuggestions(content: string): string[] {
  const match = content.match(/\[SUGGESTIONS:\s*(.+?)\]/);
  if (!match) return [];
  return match[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3);
}

export function stripSuggestions(content: string): string {
  return content.replace(/\s*\[SUGGESTIONS:\s*.+?\]/g, '');
}
