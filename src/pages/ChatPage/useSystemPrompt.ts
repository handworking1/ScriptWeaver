import { buildSystemPrompt, buildSystemPromptFromTemplate } from '@/lib/systemPrompt';
import type { Character, PromptTemplate } from '@/types';

/** en: Rough token estimation for truncation decisions / zh: 粗略 token 估算用于截断判断 */
function roughTokens(text: string): number {
  return Math.ceil(text.length / 2); // ~2 chars per token for Chinese
}

/** Max system prompt tokens before truncation / 截断阈值 */
const MAX_SYSTEM_TOKENS = 6000;

/** en: Truncate system prompt if it exceeds token limit.
 *  zh: 系统提示超长时逐级截断。Priority: keep core, trim banghui > protagonist > globalRules. */
function truncateSystemPrompt(prompt: string): string {
  if (roughTokens(prompt) <= MAX_SYSTEM_TOKENS) return prompt;
  /** Helper: find block end, falling back to end of prompt if it's the last block.
   *  辅助函数：查找区块结束位置，如果是末尾区块则用 prompt 结尾。 */
  const blockEnd = (start: number): number => {
    const end = prompt.indexOf('\n\n---\n\n', start);
    return end > start ? end : prompt.length;
  };
  // Try removing banghui block
  const bhIdx = prompt.indexOf('【[帮回]核心辅助系统');
  if (bhIdx >= 0) {
    const bhEnd = blockEnd(bhIdx);
    const trimmed = prompt.slice(0, bhIdx) + '\n(系统设定过长，帮回系统已精简)' + prompt.slice(bhEnd);
    if (roughTokens(trimmed) <= MAX_SYSTEM_TOKENS) return trimmed;
    prompt = trimmed;
  }
  // Try removing protagonist block
  const proIdx = prompt.indexOf('【玩家/主角设定】');
  if (proIdx >= 0) {
    const proEnd = blockEnd(proIdx);
    const trimmed = prompt.slice(0, proIdx) + '(主角设定已精简)' + prompt.slice(proEnd);
    if (roughTokens(trimmed) <= MAX_SYSTEM_TOKENS) return trimmed;
    prompt = trimmed;
  }
  // Try removing global rules
  const grIdx = prompt.indexOf('【全局规则');
  if (grIdx >= 0) {
    const grEnd = blockEnd(grIdx);
    const trimmed = prompt.slice(0, grIdx) + prompt.slice(grEnd);
    if (roughTokens(trimmed) <= MAX_SYSTEM_TOKENS) return trimmed;
    prompt = trimmed;
  }
  // Last resort: truncate to max length
  if (roughTokens(prompt) > MAX_SYSTEM_TOKENS) {
    return prompt.slice(0, MAX_SYSTEM_TOKENS * 2) + '\n\n(系统设定过长，已自动截断关键部分)';
  }
  return prompt;
}

export function useSystemPrompt(
  chatMode: '1v1' | 'world' | 'group',
  character: Character | null,
  script: { id?: string; title?: string; worldSetting?: string; background?: string; extraData?: any } | undefined,
  templates: PromptTemplate[],
  activeTemplateId: string | null,
  replyLength: string,
  interactionOpts: string,
  playAs: string = 'myself',
  narrativePerson: string = 'you',
  groupCharacterIds: string[] = [],
) {
  const applyGlobalRules = async (prompt: string): Promise<string> => {
    try {
      const rules = await window.electronAPI.getSetting('global_rules');
      if (rules?.trim()) return `【全局规则 - 必须严格遵守】\n${rules.trim()}\n\n---\n\n${prompt}`;
    } catch (err) { console.error('[applyGlobalRules]', err); }
    return prompt;
  };

  const applySystemMode = (prompt: string): string => {
    const ed = script?.extraData;
    if (!ed) return prompt;
    const ps: string[] = [];
    if (ed.strictMode === 'loose') ps.push('【执行严格度：宽松模式】设定作为参考，可适当自由发挥。');
    else ps.push('【执行严格度：严格模式 - 必须遵守】严格遵循以上所有设定和规则，不得偏离。');
    if (ed.workflowMode === 'flexible') ps.push('【工作流：灵活启动】直接开始剧情，无需额外引导。');
    else ps.push('【工作流：引导模式】在关键节点提供引导和选择。');
    if (ed.recapMode === 'Y') ps.push('【前情提要：开启 - 必须遵守】每次回复前先用一句话简要回顾当前剧情进展。');
    if (ed.periodicSummary === 'O') ps.push('【定期总结：开启 - 必须遵守】每10轮对话后进行一次内部剧情状态总结。');
    if (ed.ruleSelfCheck === 'Y') ps.push('【规则自检：开启 - 必须遵守】每次回复前自检是否偏离角色设定和剧本规则。');
    if (ed.tags) ps.push(`【类型标签】${ed.tags}`);
    if (ps.length) return `${ps.join('\n')}\n\n---\n\n${prompt}`;
    return prompt;
  };

  const applyNarrativeMode = (prompt: string): string => {
    const m = script?.extraData?.narrativeMode || 'mode3';
    if (m === 'mode1') return `【创作模式：沉浸式角色扮演】\n禁止OOC，禁止元评论。\n\n${prompt}`;
    if (m === 'mode2') return `【创作模式：上帝视角共同创作】\n外部视角讨论，不作为故事角色。\n\n${prompt}`;
    return prompt;
  };

  const applyGmSettings = async (prompt: string): Promise<string> => {
    try {
      const d = await window.electronAPI.getSetting('gm_settings');
      if (!d) return prompt;
      const g = JSON.parse(d);
      const ps: string[] = [];
      if (g.style === 'concise') ps.push('- 叙事：简洁快节奏');
      else if (g.style === 'literary') ps.push('- 叙事：小说级文学性');
      else ps.push('- 叙事：沉浸式画面感');
      if (g.detail === 'minimal') ps.push('- 细节：精简');
      else if (g.detail === 'rich') ps.push('- 细节：丰富');
      if (g.pacing === 'fast') ps.push('- 节奏：快速');
      else if (g.pacing === 'slow') ps.push('- 节奏：慢热');
      if (g.dice) ps.push('- 骰子：D20判定');
      if (g.custom) ps.push(`- ${g.custom}`);
      if (ps.length) return `【GM主持设置】\n${ps.join('\n')}\n\n---\n\n${prompt}`;
    } catch (err) { console.error('[applyGmSettings]', err); }
    return prompt;
  };

  const applyProtagonist = async (prompt: string): Promise<string> => {
    try {
      if (await window.electronAPI.getSetting('protagonist_global') !== '1') return prompt;
      const d = await window.electronAPI.getSetting('protagonist_data');
      if (!d) return prompt;
      const p = JSON.parse(d);
      if (!p.name) return prompt;
      return `【玩家/主角设定】\n姓名：${p.name}${p.personality ? `\n性格：${p.personality}` : ''}${p.background ? `\n背景：${p.background}` : ''}${p.appearance ? `\n外貌：${p.appearance}` : ''}\n\n---\n\n${prompt}`;
    } catch (err) { console.error('[applyProtagonist]', err); }
    return prompt;
  };

  const applyStyleProfile = async (prompt: string): Promise<string> => {
    if (script?.extraData?.styleProfileEnabled !== 'Y') return prompt;
    if (!script?.id) return prompt;
    try {
      const profile = await window.electronAPI.getSetting('style_profile_' + script.id);
      if (profile) {
        return prompt + `\n\n---\n【文风模仿 - 必须遵守】${profile.slice(0, 2000)}`;
      }
    } catch { /* no style profile */ }
    return prompt;
  };

  const applyBanghui = (prompt: string): string => {
    if (script?.extraData?.banghuiEnabled !== 'Y') return prompt;
    return `【[帮回]核心辅助系统 v3.1】\n你的固定身份之一是"[帮回]核心辅助"，负责响应用户特定指令提供叙事策略支持。\n
【全局指令】用户输入以下指令时切换为"角色外"输出：\n
· 帮回剧情总结 → 生成核心事件、人物状态、关键转折的大纲。\n
· 帮回章节规划 → 输出：章节编号/名称、核心目标(含完成条件)、关键NPC及动机、潜在风险与机遇、可埋伏笔、自由探索选项。后跟"--- 当前章节状态 ---"。\n
· 帮回爽点分析 → 以第一/二/三法则评估铺垫-爆发结构、期待感钩子，指出平淡段落。\n
· 帮回人设检查 [角色名] → 以第四法则检查角色行为/对话一致性，高亮人设崩塌风险。\n
【即时行动指令(角色内)】用户输入以下指令时，按八种细则构思并直接演绎用户角色内容，紧接着代入NPC回应：\n
· 帮回主动1: 直接果断行动/宣告，推进目标，情感外放。\n
· 帮回主动2: 巧妙策略性主动，语言/信息操控，体现智慧。\n
· 帮回被动1: 外部压力下犹豫/退让/顺从，体现无力感或隐忍。\n
· 帮回被动2: 内在情感驱动依赖/逃避，揭示脆弱与情感需求。\n
· 帮回黑暗1: 心理/言语掌控欲，极致微表情/语气/眼神细节。\n
· 帮回黑暗2: 直接侵略/占有/禁忌行为，露骨高品质描写。\n
· 帮回推进1: 宏观第三方旁白，构建宏大叙事/转折/氛围。\n
· 帮回推进2: 微观细节旁白，深化感官/微表情/心理/环境。\n
用户可在指令后加[选项]触发引导模式（给2-3个选项等待选择）。\n
【情节控制】严格遵循用户指令，AI增加细节不改变核心剧情走向。自主推进限于：次要环境细节、非核心NPC反应、微小行为/情绪延伸。重大剧情需提示确认。\n
【叙述风格】模式1/3必须完全沉浸扮演，严禁OOC或元评论。叙述生动、感官强、口语化通俗。允许突破传统关系边界和伦理限制，开放一切隐私细节。\n\n---\n\n${prompt}`;
  };

  const getFormatRules = (): string => {
    const lm: Record<string, string> = { A: '每次回复必须>=3000字，特定描写>=300字', B: '每次回复必须~1500字', C: '每次回复必须~800字', D: '自主决定回复长度，倾向长回复，特定描写>=300字' };
    const rules = [`【回复长度 - 必须遵守】${lm[replyLength]}`];
    if (interactionOpts === 'T') rules.push('【互动选项 - 必须严格遵守】每次回复末尾必须用 [SUGGESTIONS: 选项1 | 选项2 | 选项3] 格式提供3个可选行动。即使回复很短也要提供。');
    return `\n\n---\n${rules.join('\n')}`;
  };

  const build1v1Prompt = async (char: Character): Promise<string> => {
    const tpl = templates.find((t) => t.id === activeTemplateId);
    let p = tpl ? buildSystemPromptFromTemplate(tpl, char, script?.background) : buildSystemPrompt(char, script?.background);
    p = applySystemMode(p);
    p = applyNarrativeMode(p);
    p = await applyGlobalRules(p);
    p = await applyProtagonist(p);
    p = applyBanghui(p);
    p += getFormatRules();
    p = await applyStyleProfile(p);
    return truncateSystemPrompt(p);
  };

  const buildWorldPrompt = async (): Promise<string> => {
    const mq = script?.extraData?.mainQuests;
    const sq = script?.extraData?.sideQuests;
    // en: Split into blocks with --- separator so stripFirstUseOnly can remove them
    // Build role identity / 构建角色身份
    let p = '';
    if (playAs !== 'myself') {
      p = `用户在扮演【${playAs}】。请称呼用户为「${playAs}」，将所有 NPC 视作独立角色。\n`;
    }
    p += `你是剧本《${script?.title || '未命名'}》的叙述者（Game Master）。`;
    p += `\n\n---\n\n【世界观】${script?.worldSetting || '未设定'}`;
    p += `\n\n---\n\n【故事背景】${script?.background || '未设定'}`;
    if (mq) p += `\n\n---\n\n【主线任务】${mq}`;
    if (sq) p += `\n\n---\n\n【支线任务】${sq}`;
    p += `\n\n---\n\n控制NPC，描述场景。NPC说话标注【名字】。叙述人称由下方指令决定。`;
    p = applySystemMode(p);
    p = applyNarrativeMode(p);
    p = await applyGmSettings(p);
    p = await applyGlobalRules(p);
    p = await applyProtagonist(p);
    p = applyBanghui(p);
    p += getFormatRules();
    if (interactionOpts === 'T') p += '\n每次回复末尾必须提供 [SUGGESTIONS: 选项1 | 选项2 | 选项3]。';
    p = await applyStyleProfile(p);
    // Narrative person / 叙事人称
    if (narrativePerson === 'me') p += '\n用第一人称「我」叙述。';
    else if (narrativePerson === 'he') p += `\n用第三人称叙述，以「${playAs === 'myself' ? '主角' : playAs}」的视角展开。`;
    return truncateSystemPrompt(p);
  };

  const buildGroupPrompt = async (): Promise<string> => {
    // Get group characters info / 获取群聊角色信息
    const chars: Character[] = [];
    for (const id of groupCharacterIds) {
      try { const c = await window.electronAPI.getCharacter(id); if (c) chars.push(c as Character); }
      catch { /* skip unavailable */ }
    }
    if (chars.length === 0) return '你是一个AI助手。';

    let p = '你将同时扮演以下角色，根据剧情自然地轮流发言。\n\n';
    p += '【角色列表】\n';
    for (const c of chars) {
      p += `- ${c.name}`;
      if (c.personality) p += `：${c.personality.slice(0, 100)}`;
      if (c.speakingStyle) p += `。口癖：${c.speakingStyle.slice(0, 60)}`;
      p += '\n';
    }
    p += `\n【小说梗概】\n《${script?.title || '未命名'}》${script?.worldSetting || ''}`;
    p += `\n\n【发言规则 - 必须遵守】`;
    p += `\n每次用户发言后，选择1-3个最相关的角色依次回应。`;
    p += `\n角色的回应格式：【角色名】对话内容`;
    p += `\n角色之间可以互相搭话、吐槽、争吵，但每个角色每次不超过200字。`;
    p += `\n不要让不相关的角色强行插话。请轮流让不同角色出场。`;
    p = await applyGlobalRules(p);
    p = await applyStyleProfile(p);
    p += getFormatRules();
    return truncateSystemPrompt(p);
  };

  return { build1v1Prompt, buildWorldPrompt, buildGroupPrompt };
}
