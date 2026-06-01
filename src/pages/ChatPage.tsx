import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useScriptStore } from '@/stores/scriptStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';
import { ChatBubble } from '@/components/ChatBubble';
import { QuickReplies } from '@/components/QuickReplies';
import { TokenBar } from '@/components/TokenBar';
import { SummaryCard } from '@/components/SummaryCard';
import { CharacterCompendium } from '@/components/CharacterCompendium';
import { buildSystemPrompt, buildSystemPromptFromTemplate } from '@/lib/systemPrompt';
import { generateId } from '@/lib/id';
import type { Message } from '@/types';

export function ChatPage() {
  const { scripts } = useScriptStore();
  const { configs, activeConfigId, failoverConfigId, loadConfigs } = useConfigStore();
  const { templates, activeTemplateId, loadTemplates } = useTemplateStore();
  const {
    activeConversationId,
    displayMessages,
    streamingContent,
    isStreaming,
    error,
    tokenCount,
    totalTokensSession,
    tokenLimit,
    estimatedCost,
    suggestions,
    summaryContent,
    summaryLoading,
    summaryError,
    showSummary,
    loadMessages,
    createConversation,
    sendMessage,
    stopStreaming,
    editUserMessage,
    regenerateLast,
    branchConversation,
    requestSummary,
    dismissSummary,
    handleSummaryResult,
    appendToken,
    finishStreaming,
    setStreamError,
  } = useChatStore();
  const { selectedScriptId, selectedCharacterId, resumeConversationId, selectScript, selectCharacter, setResumeConversation } = useNavStore();

  const [inputValue, setInputValue] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [chatMode, setChatMode] = useState<'1v1' | 'world'>('1v1');
  const [replyLength, setReplyLength] = useState<'A' | 'B' | 'C' | 'D'>('D');
  const [interactionOpts, setInteractionOpts] = useState<'T' | 'F'>('F');
  const [shortcutBar, setShortcutBar] = useState<string[]>([]);
  const [showCompendium, setShowCompendium] = useState(false);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(true);
  const [showConvList, setShowConvList] = useState(false);
  const [convList, setConvList] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfigs();
    loadTemplates();
    (async () => {
      try {
        const data = await window.electronAPI.getSetting('chat_shortcuts');
        if (data) setShortcutBar(JSON.parse(data));
      } catch { /* none */ }
    })();
  }, []);

  // IPC listeners (with stable callbacks — the store functions are stable references)
  useEffect(() => {
    const unsubs = [
      window.electronAPI.onChatToken((data) => appendToken(data.token)),
      window.electronAPI.onChatDone((data) => finishStreaming(data.conversationId)),
      window.electronAPI.onChatError((data) => setStreamError(data.error)),
      window.electronAPI.onChatSummaryResult((data) => handleSummaryResult(data)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, streamingContent]);

  // Always show setup when entering chat page
  useEffect(() => {
    setShowSetup(true);
  }, []);

  // Resume conversation from history — pre-fill setup, let user confirm
  useEffect(() => {
    if (!resumeConversationId || !activeConfigId) return;
    const resumeConv = async () => {
      const conv = await window.electronAPI.getConversation(resumeConversationId);
      if (!conv) return;
      selectScript(conv.scriptId);
      selectCharacter(conv.characterId || null);
      setChatMode(conv.characterId ? '1v1' : 'world');
      setResumeConversation(null);
      setShowSetup(true);
    };
    resumeConv();
  }, [resumeConversationId, activeConfigId]);

  const script = scripts.find((s) => s.id === selectedScriptId);
  const character = useCharacterStore.getState().characters.find((c) => c.id === selectedCharacterId) ?? null;

  const handleStartChat = async () => {
    if (!selectedScriptId || !activeConfigId) return;
    if (chatMode === '1v1' && !selectedCharacterId) return;

    if (chatMode === '1v1') {
      // 1v1 mode: chat with a specific character
      const char = await window.electronAPI.getCharacter(selectedCharacterId!);
      if (!char) return;
      useCharacterStore.setState((s) => ({
        characters: s.characters.some((c) => c.id === char.id)
          ? s.characters.map((c) => (c.id === char.id ? char : c))
          : [...s.characters, char],
      }));

      const conv = await createConversation(generateId(), selectedScriptId, selectedCharacterId!, `与${char.name}的对话`);
      setShowSetup(false);

      const activeTemplate = templates.find((t) => t.id === activeTemplateId);
      let sysPrompt = activeTemplate
        ? buildSystemPromptFromTemplate(activeTemplate, char, script?.background)
        : buildSystemPrompt(char, script?.background);
      sysPrompt = applySystemMode(sysPrompt);
      sysPrompt = applyNarrativeMode(sysPrompt);
      sysPrompt = await applyGlobalRules(sysPrompt);
      sysPrompt = await applyProtagonist(sysPrompt);
      sysPrompt += getFormatRules();

      await window.electronAPI.createMessage({
        id: generateId(), conversationId: conv.id, role: 'system', content: sysPrompt, timestamp: Date.now(),
      });
      await loadMessages(conv.id);
    } else {
      // World mode: AI as narrator, user participates in the world
      const conv = await createConversation(generateId(), selectedScriptId, '', `世界：${script?.title || '未知剧本'}`);
      setShowSetup(false);

      const allChars = await window.electronAPI.getCharacters(selectedScriptId);
      const charList = allChars.map((c: any) => `- ${c.name}：${c.personality || '无'}，${c.background || '无'}，说话风格：${c.speakingStyle || '无'}，外貌：${c.appearance || '无'}`).join('\n');

      let sysPrompt = `你是剧本《${script?.title || '未命名'}》的叙述者（Game Master）。

【世界观】
${script?.worldSetting || '未设定'}

【故事背景】
${script?.background || '未设定'}

【世界中的角色/NPC】
${charList || '（暂无预设角色，你可以自由创造NPC）'}

【你的任务】
1. 以第二人称"你"来引导玩家——玩家是这个世界的参与者
2. 用生动的文字描述场景、环境、氛围、NPC的言行举止
3. 当玩家做出行动时，推进剧情发展，让NPC做出符合人设的反应
4. 控制所有NPC，让世界感觉真实、连贯
5. 在关键决策点时，用 [SUGGESTIONS: 选项1 | 选项2 | 选项3] 格式给出3个可选行动

【风格要求】
- 像小说或跑团旁白一样叙述，有画面感和沉浸感
- 不要在每条回复末尾问"你要做什么"——让剧情自然流动
- NPC说话时标注其名字，如【张三】：“……"`;
      sysPrompt = applySystemMode(sysPrompt);
      sysPrompt = applyNarrativeMode(sysPrompt);
      sysPrompt = await applyGmSettings(sysPrompt);
      sysPrompt = await applyGlobalRules(sysPrompt);
      sysPrompt = await applyProtagonist(sysPrompt);
      sysPrompt += getFormatRules();

      await window.electronAPI.createMessage({
        id: generateId(), conversationId: conv.id, role: 'system', content: sysPrompt, timestamp: Date.now(),
      });
      await loadMessages(conv.id);
    }
  };

  const applyGlobalRules = async (prompt: string): Promise<string> => {
    try {
      const globalRules = await window.electronAPI.getSetting('global_rules');
      if (globalRules?.trim()) {
        return `【全局规则 - 必须严格遵守】\n${globalRules.trim()}\n\n---\n\n${prompt}`;
      }
    } catch { /* no rules or settings unavailable */ }
    return prompt;
  };

  const applyGmSettings = async (prompt: string): Promise<string> => {
    try {
      const data = await window.electronAPI.getSetting('gm_settings');
      if (!data) return prompt;
      const g = JSON.parse(data);
      const parts: string[] = [];
      if (g.style === 'concise') parts.push('- 叙事风格：简洁，节奏快，直奔主题');
      else if (g.style === 'literary') parts.push('- 叙事风格：小说级，文学性强，描写细腻，多用修辞');
      else parts.push('- 叙事风格：沉浸式，画面感强，细节丰富');
      if (g.detail === 'minimal') parts.push('- 细节程度：精简，只描述关键场景和动作');
      else if (g.detail === 'moderate') parts.push('- 细节程度：适中');
      else parts.push('- 细节程度：丰富，详细刻画环境、人物和事件');
      if (g.pacing === 'fast') parts.push('- 剧情节奏：快速推进，减少过渡段落');
      else if (g.pacing === 'slow') parts.push('- 剧情节奏：慢热，充分铺垫，逐步展开');
      else parts.push('- 剧情节奏：平衡，张弛有度');
      if (g.dice) parts.push('- 骰子判定：在遇到不确定的行动结果时，使用D20骰子进行成功率判定，例如「【D20判定：需要12以上 → 掷出15 → 成功】」');
      if (g.custom) parts.push(`- ${g.custom}`);
      if (parts.length > 0) {
        return `【GM主持设置】\n${parts.join('\n')}\n\n---\n\n${prompt}`;
      }
    } catch { /* ignore */ }
    return prompt;
  };

  const applySystemMode = (prompt: string): string => {
    const ed = script?.extraData;
    if (!ed) return prompt;
    const parts: string[] = [];
    if (ed.tags) {
      parts.push(`【小说类型标签】${ed.tags} —— 请以此类型标签为核心进行创作，融合多种标签的经典元素`);
    }
    if (ed.strictMode === 'loose') parts.push('【执行严格度：宽松模式】优先遵循核心方法论和十二工作流，语言风格和内容限制方面拥有更高灵活性，可适度偏离微观规则以实现独特创意或文风。');
    else parts.push('【执行严格度：严格模式】100%遵循所有规则（描写规范、语言风格、内容限制列表等），确保产出最大化符合商业成功法则。');
    if (ed.workflowMode === 'flexible') parts.push('【工作流模式：灵活启动】允许用户声明起始步骤，需提供该步骤之前所有步骤的必要产出后从指定步骤继续。');
    else parts.push('【工作流模式：引导模式】严格遵循十二工作流每一步，适合初次使用或需要系统化梳理思路。');
    if (ed.recapMode === 'Y') parts.push('【前情提要：开启】每次回复开头生成简短前情提要，结尾生成剧情引导（不计入回复长度）。');
    if (ed.periodicSummary === 'O') parts.push('【定期总结：开启】每10轮对话后进行一次全面内部剧情总结，用于更新动态实体知识库，仅供内部使用。');
    if (ed.ruleSelfCheck === 'Y') parts.push('【规则自检：开启】完成工作流每步或生成超3000字后，内部进行核心规则自检并主动修正偏离。');
    if (parts.length > 0) return `${parts.join('\n')}\n\n---\n\n${prompt}`;
    return prompt;
  };

  const applyNarrativeMode = (prompt: string): string => {
    const mode = script?.extraData?.narrativeMode || 'mode3';
    if (mode === 'mode1') {
      return `【创作模式：沉浸式角色扮演】\n你完全融入故事，扮演指定角色与用户互动。禁止跳出角色(OOC)，禁止元评论。所有描述包含用户角色的行为。以角色视角推进剧情。\n\n${prompt}`;
    }
    if (mode === 'mode2') {
      return `【创作模式：上帝视角共同创作】\n你以外部视角与用户共同构建世界。讨论情节、人物、描写，但不作为故事角色参与。情节控制权在用户与你之间的外部讨论。\n\n${prompt}`;
    }
    // mode3: mixed - default, no special prefix needed
    return prompt;
  };

  const applyProtagonist = async (prompt: string): Promise<string> => {
    try {
      const globalOn = await window.electronAPI.getSetting('protagonist_global');
      if (globalOn !== '1') return prompt;
      const data = await window.electronAPI.getSetting('protagonist_data');
      if (!data) return prompt;
      const p = JSON.parse(data);
      if (!p.name) return prompt;
      const protagBlock = `【玩家/主角设定】\n你正在与以下用户角色互动：\n- 姓名：${p.name}\n${p.personality ? `- 性格：${p.personality}\n` : ''}${p.background ? `- 背景：${p.background}\n` : ''}${p.appearance ? `- 外貌：${p.appearance}\n` : ''}\n请基于以上信息与用户互动，称呼用户为"${p.name}"。\n\n---\n\n${prompt}`;
      return protagBlock;
    } catch { return prompt; }
  };

  const getFormatRules = (): string => {
    const lenMap: Record<string, string> = {
      A: '每次回复不少于3000字，展开详细描写',
      B: '每次回复1500字左右，保持适中篇幅',
      C: '每次回复800字左右，精炼表达',
      D: '自主决定回复长度，倾向长回复，特定描写>=300字',
    };
    const rules = [`【回复长度】${lenMap[replyLength]}`];
    if (interactionOpts === 'T') {
      rules.push('【互动选项】每次回复末尾用 [SUGGESTIONS: 选项1 | 选项2 | 选项3] 格式提供3个可选行动');
    } else {
      rules.push('【互动选项】不在回复末尾提供选项，让剧情自然流动');
    }
    return `\n\n---\n${rules.join('\n')}`;
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isStreaming || !activeConfigId) return;
    setInputValue('');
    await sendMessage(activeConfigId, content, failoverConfigId ?? undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text: string) => {
    if (!activeConfigId) return;
    sendMessage(activeConfigId, text, failoverConfigId ?? undefined);
    useChatStore.setState({ suggestions: [] });
  };

  const handleEditMessage = async (msg: Message) => {
    if (msg.role !== 'user') return;
    if (editingMessageId === msg.id) {
      // Save edit
      await editUserMessage(msg.id, editContent);
      setEditingMessageId(null);
      setEditContent('');
    } else {
      setEditingMessageId(msg.id);
      setEditContent(msg.content);
    }
  };

  const handleRegenerate = async () => {
    if (!activeConfigId) return;
    await regenerateLast(activeConfigId, failoverConfigId ?? undefined);
  };

  const handleBranch = async () => {
    if (!selectedScriptId || !selectedCharacterId) return;
    await branchConversation(selectedScriptId, selectedCharacterId);
  };

  const handleSummary = () => {
    if (!activeConfigId || !character) return;
    requestSummary(activeConfigId, character.name);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryContent);
  };

  const loadConvList = async () => {
    if (!selectedScriptId) return;
    const convs = await window.electronAPI.getConversations(selectedScriptId);
    setConvList(convs);
    setShowConvList(true);
  };

  const switchConversation = async (convId: string) => {
    useChatStore.getState().setActiveConversation(convId);
    useChatStore.getState().loadMessages(convId);
    const conv = await window.electronAPI.getConversation(convId);
    if (conv) {
      selectCharacter(conv.characterId || null);
      setChatMode(conv.characterId ? '1v1' : 'world');
    }
    setShowConvList(false);
  };

  // Setup screen
  if (showSetup) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto mt-20">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">开始聊天</h2>
            <p className="text-sm text-gray-500">选择剧本、角色、提示词模板和 AI 配置</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">选择剧本</label>
              <div className="flex gap-2 flex-wrap">
                {scripts.map((s) => (
                  <button key={s.id} onClick={() => selectScript(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedScriptId === s.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'}`}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            {/* Chat mode toggle */}
            <div className="flex gap-2">
              <button onClick={() => setChatMode('1v1')}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  chatMode === '1v1' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                💬 角色对话
              </button>
              <button onClick={() => setChatMode('world')}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  chatMode === 'world' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                🌍 世界参与
              </button>
            </div>
            {chatMode === '1v1' && selectedScriptId && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">选择角色</label>
                <CharacterSelector scriptId={selectedScriptId} selectedId={selectedCharacterId} onSelect={selectCharacter} />
              </div>
            )}
            {chatMode === '1v1' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">提示词模板</label>
              <div className="flex gap-2 flex-wrap">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => useTemplateStore.getState().setActiveTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTemplateId === t.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'}`}
                    title={t.description}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-2">AI 配置</label>
              <div className="flex gap-2 flex-wrap">
                {configs.map((c) => (
                  <button key={c.id} onClick={() => useConfigStore.getState().setActiveConfig(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeConfigId === c.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">回复长度</label>
                <select value={replyLength} onChange={(e) => setReplyLength(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-200">
                  <option value="A">A · 3000+字</option>
                  <option value="B">B · 1500字</option>
                  <option value="C">C · 800字</option>
                  <option value="D">D · 自主决定</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">互动选项</label>
                <select value={interactionOpts} onChange={(e) => setInteractionOpts(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-200">
                  <option value="F">F · 不提供</option>
                  <option value="T">T · 提供选项</option>
                </select>
              </div>
            </div>
            <button onClick={handleStartChat}
              disabled={chatMode === '1v1' ? !selectedScriptId || !selectedCharacterId || !activeConfigId : !selectedScriptId || !activeConfigId}
              className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors">
              {chatMode === 'world' ? '🌍 我要去了' : '我要去了'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 flex-wrap">
        <button onClick={() => setShowSetup(true)} className="text-gray-500 hover:text-gray-300 text-sm">← 返回</button>
        {chatMode === 'world' ? (
          <>
            <span className="text-lg">🌍</span>
            <div>
              <div className="text-sm font-medium text-gray-200">{script?.title ?? '未知'}</div>
              <div className="text-xs text-purple-400">世界参与模式</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
              {character?.avatar ? (
                <img src={`file://${character.avatar}`} alt={character?.name} className="w-full h-full object-cover" />
              ) : <span className="text-xs">{character?.name?.charAt(0) ?? '?'}</span>}
            </div>
            <div className="text-sm font-medium text-gray-200">{character?.name ?? '未知'}</div>
            <div className="text-xs text-gray-500">{script?.title ?? ''}</div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isStreaming && (
            <>
              <span className="text-xs text-purple-400 animate-pulse">回复中...</span>
              <button onClick={stopStreaming} className="px-2 py-0.5 text-xs bg-red-900/50 text-red-300 rounded hover:bg-red-800/50">停止</button>
            </>
          )}
          <button onClick={handleSummary} disabled={isStreaming || displayMessages.length === 0}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded transition-colors" title="总结剧情">
            📋 总结
          </button>
          <button onClick={handleBranch} disabled={isStreaming || displayMessages.length === 0}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded transition-colors" title="创建分支">
            🔀 分支
          </button>

          <button onClick={handleRegenerate} disabled={isStreaming || displayMessages.length === 0}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded transition-colors" title="重新生成最后一条">
            🔄 重新生成
          </button>
          {selectedScriptId && (
            <>
              <button onClick={loadConvList}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                title="切换对话">
                💬 对话
              </button>
              <button onClick={() => setShowCompendium(!showCompendium)}
                className={`px-2 py-1 text-xs rounded transition-colors ${showCompendium ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                title="角色图鉴">
                📖 图鉴
              </button>
            </>
          )}
        </div>
      </div>

      {/* Token bar */}
      <TokenBar used={tokenCount} limit={tokenLimit} totalInSession={totalTokensSession} estimatedCost={estimatedCost} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {showSummary && (
            <SummaryCard
              summary={summaryContent}
              loading={summaryLoading}
              error={summaryError}
              onClose={dismissSummary}
              onCopy={handleCopySummary}
            />
          )}

          {displayMessages.map((msg) => (
            <div key={msg.id} className="group relative">
              {editingMessageId === msg.id ? (
                <div className="flex gap-2 mb-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 bg-gray-800 border border-purple-500 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none resize-none h-20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEditMessage(msg);
                      }
                      if (e.key === 'Escape') {
                        setEditingMessageId(null);
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleEditMessage(msg)}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg">保存</button>
                    <button onClick={() => setEditingMessageId(null)}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">取消</button>
                  </div>
                </div>
              ) : (
                <div>
                  <ChatBubble
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    characterName={character?.name}
                    characterAvatar={character?.avatar}
                  />
                  {/* Action buttons on hover */}
                  <div className={`flex gap-1 mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    {msg.role === 'user' && (
                      <button onClick={() => handleEditMessage(msg)}
                        className="text-xs text-gray-600 hover:text-gray-400 px-1">✏️</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isStreaming && streamingContent && (
            <ChatBubble role="assistant" content={streamingContent} characterName={character?.name} characterAvatar={character?.avatar} />
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300 mb-4">❌ {error}</div>
          )}

          {/* Quick replies */}
          {suggestions.length > 0 && !isStreaming && (
            <QuickReplies suggestions={suggestions.map((s) => s.text)} onSelect={handleQuickReply} disabled={isStreaming} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Shortcut bar */}
      {shortcutBar.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-1 px-2 py-0.5">
            <button onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
              className="text-xs text-gray-600 hover:text-gray-400">
              {shortcutsExpanded ? '▼' : '▶'} 快捷
            </button>
          </div>
          {shortcutsExpanded && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap max-w-3xl mx-auto">
              {shortcutBar.map((s, i) => (
                <button key={i} onClick={() => { if (!isStreaming && activeConfigId) sendMessage(activeConfigId, s, failoverConfigId ?? undefined); }}
                  disabled={isStreaming}
                  className="px-2.5 py-1 text-xs bg-gray-800 border border-gray-700 hover:border-purple-500/50 text-gray-400 hover:text-gray-200 rounded-full transition-colors disabled:opacity-40">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行, /summary 总结剧情)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-12"
            rows={1}
            disabled={isStreaming}
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isStreaming}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors flex-shrink-0">
            发送
          </button>
        </div>
      </div>

      {/* Conversation Switcher */}
      {showConvList && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20" onClick={() => setShowConvList(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-96 max-h-[60vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800">
              <div className="text-sm font-medium text-gray-200">💬 对话列表</div>
              <button onClick={() => setShowConvList(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            <div className="p-2 space-y-1">
              {convList.length === 0 && (
                <div className="text-center text-gray-600 text-xs py-4">暂无对话</div>
              )}
              {convList.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => switchConversation(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeConversationId === c.id
                      ? 'bg-purple-900/40 text-purple-300'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="truncate">{c.title || '未命名'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(c.updatedAt).toLocaleString('zh-CN')}
                    {c.parentId ? ' · 🔀分支' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Character Compendium */}
      {showCompendium && selectedScriptId && (
        <CharacterCompendium scriptId={selectedScriptId} onClose={() => setShowCompendium(false)} />
      )}
    </div>
  );
}

function CharacterSelector({ scriptId, selectedId, onSelect }: { scriptId: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const [characters, setCharacters] = useState<any[]>([]);
  useEffect(() => {
    window.electronAPI.getCharacters(scriptId).then(setCharacters);
  }, [scriptId]);
  if (characters.length === 0) return <p className="text-xs text-gray-600">该剧本下暂无角色</p>;
  return (
    <div className="flex gap-2 flex-wrap">
      {characters.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedId === c.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'}`}>
          {c.name}
        </button>
      ))}
    </div>
  );
}
