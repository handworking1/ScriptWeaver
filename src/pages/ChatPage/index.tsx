import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useScriptStore } from '@/stores/scriptStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';

import { CharacterCompendium } from '@/components/CharacterCompendium';
import { ScriptPreview } from '@/components/ScriptPreview';
import { QuestPanel } from '@/components/QuestPanel';
import { NovelReader } from '@/components/NovelReader';
import { TokenBar } from '@/components/TokenBar';
import { generateId } from '@/lib/id';
import type { Message } from '@/types';
import { ChatSetup } from './ChatSetup';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useIpcListeners } from './useIpcListeners';
import { useSystemPrompt } from './useSystemPrompt';

export function ChatPage() {
  const { scripts } = useScriptStore();
  const { activeConfigId, failoverConfigId, loadConfigs } = useConfigStore();
  const { templates, activeTemplateId, loadTemplates } = useTemplateStore();
  const {
    activeConversationId, displayMessages, streamingContent, isStreaming, error,
    tokenCount, totalTokensSession, estimatedCost, tokenLimit,
    refreshTokenLimit,
    suggestions, summaryContent, summaryLoading, summaryError, showSummary,
    loadMessages, createConversation, sendMessage, stopStreaming,
    editUserMessage, undoLastMessage, regenerateLast, branchConversation,
    requestSummary, dismissSummary, handleSummaryResult,
    appendToken, finishStreaming, setStreamError, clearError,
  } = useChatStore();
  const { selectedScriptId, selectedCharacterId, resumeConversationId, selectScript, selectCharacter, setResumeConversation } = useNavStore();

  const [inputValue, setInputValue] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [chatMode, setChatMode] = useState<'1v1' | 'world'>('1v1');
  const [replyLength, setReplyLength] = useState<'A'|'B'|'C'|'D'>('D');
  const [interactionOpts, setInteractionOpts] = useState<'T'|'F'>('F');
  const [shortcutBar, setShortcutBar] = useState<string[]>([]);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(true);
  const [showCompendium, setShowCompendium] = useState(false);
  /** en: Script preview side panel toggle / zh: 剧本速览侧面板开关 */
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  /** en: Quest list panel toggle / zh: 任务列表面板开关 */
  const [showQuestList, setShowQuestList] = useState(false);
  const [authorNote, setAuthorNote] = useState('');
  const [showAuthorNote, setShowAuthorNote] = useState(false);
  /** Chapter markers / 章节标记 */
  const [showChapterPopup, setShowChapterPopup] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterMarkers, setChapterMarkers] = useState<{ title: string; at: number }[]>([]);
  /** Starred messages / 精彩标注 */
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showNovelReader, setShowNovelReader] = useState(false);
  /** Play as / 扮演角色 */
  const [playAs, setPlayAs] = useState('myself');
  const [narrativePerson, setNarrativePerson] = useState('you');
  /** en: Search query for filtering messages / zh: 消息搜索过滤词 */
  const [searchQuery, setSearchQuery] = useState('');
  /** Loading state for world intro generation / 世界介绍生成中的加载状态 */
  const [worldIntroLoading, setWorldIntroLoading] = useState(false);
  /** Prevent setState on unmounted component during async world intro / 防止组件卸载后异步回调setState */
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);
  const [showConvList, setShowConvList] = useState(false);
  const [convList, setConvList] = useState<any[]>([]);
  const [openConvIds, setOpenConvIds] = useState<string[]>([]);
  const [convTitles, setConvTitles] = useState<Record<string, string>>({});

  useIpcListeners(appendToken, finishStreaming, setStreamError, handleSummaryResult);

  const script = scripts.find((s) => s.id === selectedScriptId);
  const character = useCharacterStore.getState().characters.find((c) => c.id === selectedCharacterId) ?? null;

  const { build1v1Prompt, buildWorldPrompt } = useSystemPrompt(chatMode, character, script, templates, activeTemplateId, replyLength, interactionOpts, playAs, narrativePerson);

  useEffect(() => { loadConfigs(); loadTemplates(); (async () => { try { const d = await window.electronAPI.getSetting('chat_shortcuts'); if (d) setShortcutBar(JSON.parse(d)); } catch (err) { console.error('[ChatPage] loadShortcuts:', err); } })(); }, []);

  /** en: Sync tokenLimit when active config changes / zh: 切换配置时同步 token 上限 */
  useEffect(() => { refreshTokenLimit(); }, [activeConfigId, refreshTokenLimit]);

  /** en: Auto-dismiss error toast after 5s / zh: 错误横幅 5 秒后自动消失 */
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error]);
  useEffect(() => { setShowSetup(true); }, []);
  /** Resume a conversation from history: load messages, skip setup, show tab.
   *  从历史记录恢复对话：加载消息，跳过设置页，显示标签。
   *  Guards against async race / 防止异步竞态：双重resume只保留最后一次。 */
  useEffect(() => {
    if (!resumeConversationId || !activeConfigId) return;
    const targetId = resumeConversationId;
    (async () => {
      try {
      const conv = await window.electronAPI.getConversation(targetId);
      if (!conv) return;
      // Stale guard / 过期检查：如果resumeConversationId已变化，放弃本次结果
      if (useNavStore.getState().resumeConversationId !== targetId) return;
      selectScript(conv.scriptId); selectCharacter(conv.characterId || null);
      setChatMode(conv.characterId ? '1v1' : 'world');
      useChatStore.getState().setActiveConversation(conv.id);
      addOpenConv(conv.id, conv.title || '未命名');
      await loadMessages(conv.id);
      setResumeConversation(null);
      setShowSetup(false);
      } catch (err) {
        console.error('[resumeConv]', err);
        useChatStore.getState().setStreamError('恢复对话失败：' + (err as Error).message);
      }
    })();
  }, [resumeConversationId, activeConfigId]);

  /** Start a 1v1 character chat — create conversation, inject system prompt, load messages.
   *  启动1v1角色对话：创建对话→注入 system prompt→加载消息。 */
  const start1v1Chat = async () => {
    if (!selectedScriptId || !selectedCharacterId || !activeConfigId) return;
    try {
    const char = await window.electronAPI.getCharacter(selectedCharacterId);
    if (!char) return;
    const conv = await createConversation(generateId(), selectedScriptId, selectedCharacterId, `与${char.name}的对话`);
    addOpenConv(conv.id, conv.title || `与${char.name}的对话`);
    const prompt = await build1v1Prompt(char);
    await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
    setShowSetup(false);
    await loadMessages(conv.id);
    } catch (err) {
      console.error('[ChatPage] start1v1Chat failed:', err);
      useChatStore.getState().setStreamError('启动对话失败：' + (err as Error).message);
      setShowSetup(true);
    }
  };

  /** Start a world-mode chat — create conversation, inject GM prompt, generate AI intro.
   *  启动世界模式对话：创建对话→注入 GM prompt→异步生成 AI 开场白。 */
  const startWorldChat = async () => {
    if (!selectedScriptId || !activeConfigId) return;
    try {
    const conv = await createConversation(generateId(), selectedScriptId, '', `世界：${script?.title || '未知'}`);
    addOpenConv(conv.id, conv.title || `世界：${script?.title || '未知'}`);
    const prompt = await buildWorldPrompt();
    await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
    setWorldIntroLoading(true);
    setShowSetup(false);
    await loadMessages(conv.id);
    // Fire-and-forget: AI 后台生成世界开场白，UI 不阻塞
    (async () => {
      try {
        const introResult = await window.electronAPI.discussSettings(activeConfigId, 'script',
          { title: script?.title, worldSetting: script?.worldSetting, background: script?.background, mainQuests: '', sideQuests: '', environment: '', map: '', data: '' },
          [{ role: 'system', content: `请以GM身份，用2-3段话生动介绍以下世界。只描述世界观概况、当前氛围和玩家初始处境，使用第二人称叙述。不要提任何工作流或下一步指引，不要用【】标注。\n标题：${script?.title}\n世界观：${script?.worldSetting}\n背景：${script?.background}` }]);
        if (introResult.reply && mountedRef.current) {
          await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'assistant', content: introResult.reply, timestamp: Date.now() + 1 });
          await loadMessages(conv.id);
        }
      } catch (err) { console.error('[ChatPage] world intro:', err); }
      finally { if (mountedRef.current) setWorldIntroLoading(false); }
    })();
    } catch (err) {
      console.error('[ChatPage] startWorldChat failed:', err);
      useChatStore.getState().setStreamError('启动世界模式失败：' + (err as Error).message);
      setShowSetup(true);
    }
  };

  /** en: Route chat start to the appropriate mode handler.
   *  zh: 根据聊天模式路由到对应的启动函数。 */
  const handleStartChat = () => {
    if (!selectedScriptId || !activeConfigId) return;
    if (chatMode === '1v1') start1v1Chat();
    else startWorldChat();
  };

  const handleEditMessage = async (msg: Message) => {
    if (editingMessageId === msg.id) { await editUserMessage(msg.id, editContent); setEditingMessageId(null); setEditContent(''); }
  };

  /** en: Change reply length mid-conversation and update format rules / 对话中更改回复长度 */
  const handleReplyLengthChange = async (len: 'A' | 'B' | 'C' | 'D') => {
    setReplyLength(len);
    try {
      const msgs = useChatStore.getState().messages;
      const sysMsg = msgs.find(m => m.role === 'system');
      if (sysMsg && activeConversationId) {
        const lm: Record<string, string> = { A: '每次回复必须>=3000字，特定描写>=300字', B: '每次回复必须~1500字', C: '每次回复必须~800字', D: '自主决定回复长度，倾向长回复，特定描写>=300字' };
        const rules = [`\n\n---\n【回复长度 - 必须遵守】${lm[len]}`];
        if (interactionOpts === 'T') rules.push('【互动选项】末尾用 [SUGGESTIONS: ...] 提供3个可选行动');
        const clean = sysMsg.content.replace(/\n\n---\n【回复长度[^\n]*(\n【互动选项】[^\n]*)?/g, '');
        const updated = clean + rules.join('\n');
        await window.electronAPI.updateMessage(sysMsg.id, updated);
        await useChatStore.getState().loadMessages(activeConversationId);
      }
    } catch (err) { console.error('[replyLength] update failed:', err); }
  };

  const loadConvList = async () => { if (selectedScriptId) { try { setConvList(await window.electronAPI.getConversations(selectedScriptId)); setShowConvList(true); } catch (err) { console.error('[loadConvList]', err); } } };
  const addOpenConv = (id: string, title: string) => {
    if (!openConvIds.includes(id)) {
      setOpenConvIds(prev => [...prev, id]);
      setConvTitles(prev => ({ ...prev, [id]: title }));
    }
  };
  /** Chapter presets from script / 剧本章节预设 */
  const chapterPresets = (script?.extraData?.chapters || '')
    .split(/[\n,，]/).map(s => s.trim()).filter(Boolean);

  /** Toggle star / 切换标注 */
  const handleToggleStar = async (msgId: string) => {
    const updated = starredIds.includes(msgId)
      ? starredIds.filter(id => id !== msgId)
      : [...starredIds, msgId];
    setStarredIds(updated);
    if (activeConversationId) {
      await window.electronAPI.setSetting('starred_msgs_' + activeConversationId, JSON.stringify(updated));
    }
  };

  /** Mark chapter with preset selection / 标记章节（支持预设选择） */
  const handleChapterMark = () => {
    setChapterTitle(chapterPresets[chapterMarkers.length] || '');
    setShowChapterPopup(true);
  };
  const confirmChapterMark = async () => {
    const title = chapterTitle.trim() || `第${chapterMarkers.length + 1}章`;
    const marker = { title, at: Date.now() };
    const updated = [...chapterMarkers, marker];
    setChapterMarkers(updated);
    if (activeConversationId) {
      await window.electronAPI.setSetting('chapter_markers_' + activeConversationId, JSON.stringify(updated));
    }
    setShowChapterPopup(false);
  };

  /** Close a conversation tab / 关闭对话标签 */
  const closeConv = (id: string) => {
    setOpenConvIds(prev => prev.filter(x => x !== id));
  };

  /** When the active conversation is removed from tabs, switch to another or show setup / 活跃标签被关闭时回退 */
  useEffect(() => {
    if (activeConversationId && !openConvIds.includes(activeConversationId) && openConvIds.length > 0) {
      switchConv(openConvIds[openConvIds.length - 1]);
    } else if (activeConversationId && !openConvIds.includes(activeConversationId)) {
      setShowSetup(true);
    }
  }, [openConvIds, activeConversationId]);
  const switchConv = async (id: string) => {
    useChatStore.getState().setActiveConversation(id);
    await useChatStore.getState().loadMessages(id);
    const c = await window.electronAPI.getConversation(id);
    if (c) {
      selectScript(c.scriptId);
      selectCharacter(c.characterId || null);
      setChatMode(c.characterId ? '1v1' : 'world');
      addOpenConv(id, c.title || '未命名');
    }
    setShowConvList(false);
  };

  if (showSetup) return <ChatSetup chatMode={chatMode} setChatMode={setChatMode} selectedScriptId={selectedScriptId} selectedCharacterId={selectedCharacterId} activeConfigId={activeConfigId} activeTemplateId={activeTemplateId} replyLength={replyLength} setReplyLength={setReplyLength} interactionOpts={interactionOpts} setInteractionOpts={setInteractionOpts} playAs={playAs} setPlayAs={setPlayAs} narrativePerson={narrativePerson} setNarrativePerson={setNarrativePerson} protagonistName={script?.extraData?.protagonistName || ''} scriptCharacters={useCharacterStore.getState().characters.map((c: any) => ({ id: c.id, name: c.name }))} onStart={handleStartChat} />;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Conversation tabs */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-2 py-1 flex gap-1 items-center flex-wrap">
          {openConvIds.map(id => (
            <span key={id} className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-xs rounded cursor-pointer ${activeConversationId === id ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <span onClick={() => switchConv(id)} className="truncate max-w-[120px]">{convTitles[id] || id}</span>
              <button onClick={() => closeConv(id)} className="text-gray-600 hover:text-red-400 ml-0.5 flex-shrink-0">×</button>
            </span>
          ))}
          <button onClick={() => setShowSetup(true)} className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200">+</button>
      </div>
      <ChatHeader characterName={character?.name} characterAvatar={character?.avatar} scriptTitle={script?.title} chatMode={chatMode} isStreaming={isStreaming} displayMessagesLen={displayMessages.length} searchQuery={searchQuery} onSearchChange={setSearchQuery} onBack={() => setShowSetup(true)} onStop={stopStreaming} onSummary={() => { if (activeConfigId && activeConversationId) { const name = character?.name || script?.title || '当前剧情'; requestSummary(activeConfigId, name); } }} onBranch={async () => { if (selectedScriptId) await branchConversation(selectedScriptId, selectedCharacterId || ''); }} onRegenerate={async () => { if (activeConfigId) await regenerateLast(activeConfigId, failoverConfigId ?? undefined); }} onUndo={() => undoLastMessage()} onConvList={loadConvList} onCompendium={() => setShowCompendium(!showCompendium)} showCompendium={showCompendium} onScriptPreview={() => setShowScriptPreview(!showScriptPreview)} showScriptPreview={showScriptPreview} onQuestList={() => setShowQuestList(!showQuestList)} showQuestList={showQuestList} hasQuests={!!(script?.extraData?.mainQuests || script?.extraData?.sideQuests)} replyLength={replyLength} onReplyLengthChange={handleReplyLengthChange} authorNote={authorNote} onAuthorNoteChange={(n) => { setAuthorNote(n); window.electronAPI.setSetting('author_note_' + activeConversationId, n).catch(() => {}); }} showAuthorNote={showAuthorNote} onNovelReader={() => setShowNovelReader(true)} onChapterMark={handleChapterMark} chapterPresets={chapterPresets} showStarredOnly={showStarredOnly} onToggleStarredOnly={() => setShowStarredOnly(v => !v)} starredCount={starredIds.length} onToggleAuthorNote={() => setShowAuthorNote(v => !v)} onShowSummaries={() => {
  const cid = activeConversationId;
  if (!cid) return;
  window.electronAPI.getSetting('auto_summaries_' + cid).then(raw => {
    const list = raw ? JSON.parse(raw) : [];
    const text = list.length === 0 ? '暂无自动摘要' : list.map((s: any) => `📌 ${new Date(s.at).toLocaleString('zh-CN')}\n${s.text}`).join('\n\n');
    const w = window.open('', '_blank', 'width=500,height=400');
    if (w) {
      w.document.title = '摘要历史';
      const pre = w.document.createElement('pre');
      pre.style.cssText = 'color:#e0e0e0;background:#1a1a2e;padding:16px;font-size:13px;line-height:1.6;white-space:pre-wrap;font-family:sans-serif';
      pre.textContent = text;
      w.document.body.appendChild(pre);
    }
  }).catch(() => {});
}} selectedScriptId={selectedScriptId} />
      {/* Author's Note / 作者注记 */}
      {showAuthorNote && (
        <div className="flex-shrink-0 bg-amber-900/20 border-b border-amber-800/30 px-4 py-2">
          <textarea value={authorNote} onChange={e => { setAuthorNote(e.target.value); window.electronAPI.setSetting('author_note_' + activeConversationId, e.target.value).catch(() => {}); }}
            placeholder="作者注记：引导AI风格/氛围（如：本章氛围压抑、多用短句）"
            className="w-full bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 h-10 resize-none"
          />
        </div>
      )}
      <TokenBar used={tokenCount} limit={tokenLimit} totalInSession={totalTokensSession} estimatedCost={estimatedCost} />

      {/* Chapter marker popup / 章节标记弹窗 */}
      {showChapterPopup && (
        <div className="flex-shrink-0 bg-purple-900/30 border-b border-purple-800/50 px-4 py-2 flex items-center gap-2">
          <span className="text-sm text-purple-300">📑</span>
          <input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmChapterMark(); if (e.key === 'Escape') setShowChapterPopup(false); }}
            placeholder="章节标题..." autoFocus
            className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded px-2 py-1 text-sm text-purple-200 focus:outline-none focus:border-purple-500" />
          {chapterPresets.length > 0 && (
            <select value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
              className="bg-purple-900/30 border border-purple-700/50 rounded px-2 py-1 text-xs text-purple-200">
              <option value="">自定义</option>
              {chapterPresets.filter(p => !chapterMarkers.some(m => m.title === p)).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          <button onClick={confirmChapterMark} disabled={!chapterTitle.trim()}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded">标记</button>
          <button onClick={() => setShowChapterPopup(false)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
        </div>
      )}

      {/* Chapter dividers in messages / 消息流中的章节分隔 */}
      {chapterMarkers.map((m, i) => (
        <div key={i} className="flex-shrink-0 bg-gray-800 border-b border-purple-800/30 px-4 py-1.5 flex items-center gap-2">
          <span className="text-purple-400 text-xs">━━ 📖 {m.title}</span>
        </div>
      ))}

      {/* Error toast — auto-dismiss after 5s / 错误横幅，5秒自动消失 */}
      {error && (
        <div className="flex-shrink-0 bg-red-900/40 border-b border-red-800/50 px-4 py-2 flex items-center gap-2 animate-in">
          <span className="text-sm">❌</span>
          <span className="text-sm text-red-300 flex-1">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-300 text-xs">✕</button>
        </div>
      )}
      {/* AI thinking indicator / AI 思考中指示器 */}
      {isStreaming && !streamingContent && (
        <div className="flex-shrink-0 bg-purple-900/30 border-b border-purple-800/50 px-4 py-2 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-purple-300">AI 思考中...</span>
        </div>
      )}

      {/* World intro loading indicator / 世界介绍生成中指示器 */}
      {worldIntroLoading && (
        <div className="flex-shrink-0 bg-purple-900/30 border-b border-purple-800/50 px-4 py-2 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-purple-300">🌍 正在生成世界介绍...</span>
        </div>
      )}
      <ChatMessages displayMessages={displayMessages} streamingContent={streamingContent} isStreaming={isStreaming} suggestions={suggestions} showSummary={showSummary} summaryContent={summaryContent} summaryLoading={summaryLoading} summaryError={summaryError} characterName={character?.name} characterAvatar={character?.avatar} searchQuery={searchQuery} starredIds={starredIds} onToggleStar={handleToggleStar} editingMessageId={editingMessageId} editContent={editContent} setEditContent={setEditContent} onEditSave={handleEditMessage} onEditCancel={() => setEditingMessageId(null)} onEditStart={(msg) => { setEditingMessageId(msg.id); setEditContent(msg.content); }} onQuickReply={(t) => { if (activeConfigId) sendMessage(activeConfigId, t, failoverConfigId ?? undefined); }} onDismissSummary={dismissSummary} onCopySummary={() => navigator.clipboard.writeText(summaryContent)} />
      <ChatInput inputValue={inputValue} setInputValue={setInputValue} isStreaming={isStreaming} shortcutBar={shortcutBar} shortcutsExpanded={shortcutsExpanded} setShortcutsExpanded={setShortcutsExpanded} activeConfigId={activeConfigId} failoverConfigId={failoverConfigId} sendMessage={(cid, t, fid) => sendMessage(cid, t, fid)} recentMessages={displayMessages.slice(-6)} characterName={character?.name} banghuiEnabled={script?.extraData?.banghuiEnabled === 'Y'} chatMode={chatMode} scriptId={selectedScriptId ?? undefined} />
      {showConvList && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20" onClick={() => setShowConvList(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-96 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800"><div className="text-sm font-medium text-gray-200">💬 对话列表</div><button onClick={() => setShowConvList(false)} className="text-gray-500">✕</button></div>
            <div className="p-2 space-y-1">{convList.length===0 ? <div className="text-center text-gray-600 text-xs py-4">暂无对话</div> : convList.map((c:any) => <button key={c.id} onClick={()=>switchConv(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeConversationId===c.id?'bg-purple-900/40 text-purple-300':'text-gray-300 hover:bg-gray-700'}`}><div className="truncate">{c.title||'未命名'}</div><div className="text-xs text-gray-500 mt-0.5">{new Date(c.updatedAt).toLocaleString('zh-CN')}{c.parentId?' · 🔀分支':''}</div></button>)}</div>
          </div>
        </div>
      )}
      {showCompendium && selectedScriptId && <CharacterCompendium scriptId={selectedScriptId} conversationId={activeConversationId} configId={activeConfigId} onClose={() => setShowCompendium(false)} />}
      {showScriptPreview && script && <ScriptPreview script={script} onClose={() => setShowScriptPreview(false)} />}
      {showQuestList && selectedScriptId && <QuestPanel scriptId={selectedScriptId} conversationId={activeConversationId} configId={activeConfigId} mainQuests={script?.extraData?.mainQuests || ''} sideQuests={script?.extraData?.sideQuests || ''} onClose={() => setShowQuestList(false)} />}
      {showNovelReader && <NovelReader messages={useChatStore.getState().messages} chapterMarkers={chapterMarkers} starredIds={starredIds} onClose={() => setShowNovelReader(false)} />}
    </div>
  );
}
