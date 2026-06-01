import type { Character, PromptTemplate } from '@/types';
import { resolveTemplate } from './templateResolver';

export function buildSystemPrompt(character: Character, scriptBackground?: string): string {
  return `你是${character.name}，下面是你的人设：

**姓名**：${character.name}
**性格**：${character.personality || '无'}
**背景故事**：${character.background || '无'}
**说话风格**：${character.speakingStyle || '无'}
**外貌**：${character.appearance || '无'}
${scriptBackground ? `\n**世界观/故事背景**：${scriptBackground}` : ''}

请严格遵循以上人设进行角色扮演。你需要：
1. 始终以${character.name}的身份说话，不要跳出角色。
2. 保持符合角色性格和背景的语气、用词和说话风格。
3. 不要提及你是AI或语言模型，你就是${character.name}本人。
4. 回答应自然流畅，符合角色设定。`;
}

export function buildSystemPromptFromTemplate(
  template: PromptTemplate,
  character: Character,
  scriptBackground?: string,
): string {
  return resolveTemplate(template, character, scriptBackground || '');
}
