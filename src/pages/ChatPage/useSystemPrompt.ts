import { buildSystemPrompt, buildSystemPromptFromTemplate } from '@/lib/systemPrompt';
import type { Character, PromptTemplate } from '@/types';

export function useSystemPrompt(
  chatMode: '1v1' | 'world',
  character: Character | null,
  script: { title?: string; worldSetting?: string; background?: string; extraData?: any } | undefined,
  templates: PromptTemplate[],
  activeTemplateId: string | null,
  replyLength: string,
  interactionOpts: string,
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
    if (ed.strictMode === 'loose') ps.push('【执行严格度：宽松模式】');
    else ps.push('【执行严格度：严格模式】');
    if (ed.workflowMode === 'flexible') ps.push('【工作流：灵活启动】');
    else ps.push('【工作流：引导模式】');
    if (ed.recapMode === 'Y') ps.push('【前情提要：开启】');
    if (ed.periodicSummary === 'O') ps.push('【定期总结：开启】');
    if (ed.ruleSelfCheck === 'Y') ps.push('【规则自检：开启】');
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

  const getFormatRules = (): string => {
    const lm: Record<string, string> = { A: '每次回复>=3000字', B: '每次回复~1500字', C: '每次回复~800字', D: '自主决定回复长度，倾向长回复' };
    const rules = [`【回复长度】${lm[replyLength]}`];
    if (interactionOpts === 'T') rules.push('【互动选项】末尾用 [SUGGESTIONS: ...] 提供3个可选行动');
    return `\n\n---\n${rules.join('\n')}`;
  };

  const build1v1Prompt = async (char: Character): Promise<string> => {
    const tpl = templates.find((t) => t.id === activeTemplateId);
    let p = tpl ? buildSystemPromptFromTemplate(tpl, char, script?.background) : buildSystemPrompt(char, script?.background);
    p = applySystemMode(p);
    p = applyNarrativeMode(p);
    p = await applyGlobalRules(p);
    p = await applyProtagonist(p);
    p += getFormatRules();
    return p;
  };

  const buildWorldPrompt = async (): Promise<string> => {
    const allChars = script?.extraData ? [] : [];
    let p = `你是剧本《${script?.title || '未命名'}》的叙述者（Game Master）。\n\n【世界观】${script?.worldSetting || '未设定'}\n【故事背景】${script?.background || '未设定'}\n\n以第二人称引导玩家，控制NPC，描述场景。NPC说话标注【名字】。`;
    p = applySystemMode(p);
    p = applyNarrativeMode(p);
    p = await applyGmSettings(p);
    p = await applyGlobalRules(p);
    p = await applyProtagonist(p);
    p += getFormatRules();
    if (interactionOpts === 'T') p += '\n在关键决策点用 [SUGGESTIONS: ...] 提供选项。';
    return p;
  };

  return { build1v1Prompt, buildWorldPrompt };
}
