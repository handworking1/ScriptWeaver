/**
 * Character Card v2 format — compatible with SillyTavern/RisuAI/Agnaistic.
 * 角色卡 v2 格式 — 与 SillyTavern/RisuAI/Agnaistic 通用。
 */

/** v2 Character Card spec: spec + spec_version + data */
export interface CharCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: {
    name: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    creator_notes?: string;
    tags?: string[];
    system_prompt?: string;
    post_history_instructions?: string;
    creator?: string;
    alternate_greetings?: string[];
  };
}

/** Our internal character format */
export interface ScriptWeaverChar {
  name: string;
  personality: string;
  background: string;
  speakingStyle: string;
  appearance: string;
  avatar: string;
}

/** Export ScriptWeaver character to v2 card / 导出为v2角色卡 */
export function exportToCardV2(char: ScriptWeaverChar): CharCardV2 {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: char.name,
      description: `背景：${char.background}\n外貌：${char.appearance}`,
      personality: char.personality,
      mes_example: char.speakingStyle || undefined,
      creator: 'ScriptWeaver 叙世',
    },
  };
}

/** Import v2 card to ScriptWeaver character / 从v2卡导入 */
export function importFromCardV2(card: CharCardV2): ScriptWeaverChar {
  const d = card.data;
  // Parse description for background/appearance / 从描述中提取背景和外貌
  const bgMatch = d.description?.match(/背景：([^\n]*)/);
  const appMatch = d.description?.match(/外貌：([^\n]*)/);
  return {
    name: d.name || '未命名',
    personality: d.personality || '',
    background: bgMatch ? bgMatch[1] : (d.description || ''),
    speakingStyle: d.mes_example || '',
    appearance: appMatch ? appMatch[1] : '',
    avatar: '',
  };
}

/** Validate if an object is a v2 character card / 验证是否为v2卡 */
export function isCardV2(obj: any): obj is CharCardV2 {
  return obj?.spec === 'chara_card_v2' && obj?.spec_version === '2.0' && typeof obj?.data?.name === 'string';
}

/** Check if object is a raw character (our own format or simple JSON) / 是否为原始角色JSON */
export function isRawChar(obj: any): obj is { name: string } {
  return typeof obj?.name === 'string' && !obj?.spec && !obj?.data && !obj?.description && !obj?.personality;
}

/** Validate if an object is a v1 character card / 验证是否为v1卡 */
/** V1 cards don't have 'spec' field, have 'name' and typically 'description' or 'personality' */
export function isCardV1(obj: any): obj is { name: string; description?: string; personality?: string; first_mes?: string; mes_example?: string; scenario?: string } {
  return typeof obj?.name === 'string' && !obj?.spec && !obj?.data;
}

/** Import from either v1 or v2 format / 兼容v1/v2格式导入 */
export function importCharacterCard(json: any): ScriptWeaverChar | null {
  if (isCardV2(json)) return importFromCardV2(json);
  if (isCardV1(json)) {
    return {
      name: json.name || '未命名',
      personality: json.personality || '',
      background: json.description || json.scenario || '',
      speakingStyle: json.mes_example || json.first_mes || '',
      appearance: '',
      avatar: '',
    };
  }
  if (isRawChar(json)) {
    const j = json as any;
    return {
      name: j.name || '未命名',
      personality: j.personality || '',
      background: j.background || '',
      speakingStyle: j.speakingStyle || '',
      appearance: j.appearance || '',
      avatar: j.avatar || '',
    };
  }
  return null;
}
