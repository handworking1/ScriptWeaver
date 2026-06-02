import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useScriptStore } from '@/stores/scriptStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';

import { CharacterCompendium } from '@/components/CharacterCompendium';
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
  const { configs, activeConfigId, failoverConfigId, loadConfigs } = useConfigStore();
  const { templates, activeTemplateId, loadTemplates } = useTemplateStore();
  const {
    activeConversationId, displayMessages, streamingContent, isStreaming, error,
    suggestions, summaryContent, summaryLoading, summaryError, showSummary,
    loadMessages, createConversation, sendMessage, stopStreaming,
    editUserMessage, regenerateLast, branchConversation,
    requestSummary, dismissSummary, handleSummaryResult,
    appendToken, finishStreaming, setStreamError,
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
  const [showConvList, setShowConvList] = useState(false);
  const [convList, setConvList] = useState<any[]>([]);
  const [openConvIds, setOpenConvIds] = useState<string[]>([]);
  const [convTitles, setConvTitles] = useState<Record<string, string>>({});

  useIpcListeners(appendToken, finishStreaming, setStreamError, handleSummaryResult);

  const script = scripts.find((s) => s.id === selectedScriptId);
  const character = useCharacterStore.getState().characters.find((c) => c.id === selectedCharacterId) ?? null;

  const { build1v1Prompt, buildWorldPrompt } = useSystemPrompt(chatMode, character, script, templates, activeTemplateId, replyLength, interactionOpts);

  useEffect(() => { loadConfigs(); loadTemplates(); (async () => { try { const d = await window.electronAPI.getSetting('chat_shortcuts'); if (d) setShortcutBar(JSON.parse(d)); } catch (err) { console.error('[ChatPage] loadShortcuts:', err); } })(); }, []);
  useEffect(() => { setShowSetup(true); }, []);
  useEffect(() => {
    if (!resumeConversationId || !activeConfigId) return;
    (async () => {
      const conv = await window.electronAPI.getConversation(resumeConversationId);
      if (!conv) return;
      selectScript(conv.scriptId); selectCharacter(conv.characterId || null);
      setChatMode(conv.characterId ? '1v1' : 'world');
      useChatStore.getState().setActiveConversation(conv.id);
      await loadMessages(conv.id);
      setResumeConversation(null);
      setShowSetup(false);
    })();
  }, [resumeConversationId, activeConfigId]);

  const handleStartChat = async () => {
    if (!selectedScriptId || !activeConfigId) return;
    if (chatMode === '1v1' && !selectedCharacterId) return;
    if (chatMode === '1v1') {
      const char = await window.electronAPI.getCharacter(selectedCharacterId!);
      if (!char) return;
      const conv = await createConversation(generateId(), selectedScriptId, selectedCharacterId!, `与${char.name}的对话`);
      addOpenConv(conv.id, conv.title || `与${char.name}的对话`);
      const prompt = await build1v1Prompt(char);
      await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
      setShowSetup(false); await loadMessages(conv.id);
    } else {
      const conv = await createConversation(generateId(), selectedScriptId, '', `世界：${script?.title || '未知'}`);
      addOpenConv(conv.id, conv.title || `世界：${script?.title || '未知'}`);
      const prompt = await buildWorldPrompt();
      await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
      setShowSetup(false); await loadMessages(conv.id);
      // Fire-and-forget AI intro (non-blocking)
      (async () => {
        try {
          const introResult = await window.electronAPI.discussSettings(activeConfigId, 'script',
            { title: script?.title, worldSetting: script?.worldSetting, background: script?.background, mainQuests: '', sideQuests: '', environment: '', map: '', data: '' },
            [{ role: 'system', content: `请以GM身份，用3-5句话介绍以下世界的开场。包含世界观概况、当前氛围和玩家处境。不要用【】标注。\n标题：${script?.title}\n世界观：${script?.worldSetting}\n背景：${script?.background}` }]);
          if (introResult.reply) {
            await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'assistant', content: introResult.reply, timestamp: Date.now() + 1 });
            await loadMessages(conv.id);
          }
        } catch (err) { console.error('[ChatPage] world intro:', err); }
      })();
    }
  };

  const handleEditMessage = async (msg: Message) => {
    if (editingMessageId === msg.id) { await editUserMessage(msg.id, editContent); setEditingMessageId(null); setEditContent(''); }
  };

  const loadConvList = async () => { if (selectedScriptId) { setConvList(await window.electronAPI.getConversations(selectedScriptId)); setShowConvList(true); } };
  const addOpenConv = (id: string, title: string) => {
    if (!openConvIds.includes(id)) {
      setOpenConvIds(prev => [...prev, id]);
      setConvTitles(prev => ({ ...prev, [id]: title }));
    }
  };
  const closeConv = (id: string) => {
    setOpenConvIds(prev => prev.filter(x => x !== id));
  };
  const switchConv = async (id: string) => {
    useChatStore.getState().setActiveConversation(id);
    useChatStore.getState().loadMessages(id);
    const c = await window.electronAPI.getConversation(id);
    if (c) {
      selectCharacter(c.characterId || null);
      setChatMode(c.characterId ? '1v1' : 'world');
      addOpenConv(id, c.title || '未命名');
    }
    setShowConvList(false);
  };

  if (showSetup) return <ChatSetup chatMode={chatMode} setChatMode={setChatMode} selectedScriptId={selectedScriptId} selectedCharacterId={selectedCharacterId} activeConfigId={activeConfigId} activeTemplateId={activeTemplateId} replyLength={replyLength} setReplyLength={setReplyLength} interactionOpts={interactionOpts} setInteractionOpts={setInteractionOpts} onStart={handleStartChat} />;

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
      <ChatHeader characterName={character?.name} characterAvatar={character?.avatar} scriptTitle={script?.title} chatMode={chatMode} isStreaming={isStreaming} displayMessagesLen={displayMessages.length} onBack={() => setShowSetup(true)} onStop={stopStreaming} onSummary={() => { if (activeConfigId && activeConversationId) { const name = character?.name || script?.title || '当前剧情'; requestSummary(activeConfigId, name); } }} onBranch={async () => { if (selectedScriptId && selectedCharacterId) await branchConversation(selectedScriptId, selectedCharacterId); }} onRegenerate={async () => { if (activeConfigId) await regenerateLast(activeConfigId, failoverConfigId ?? undefined); }} onConvList={loadConvList} onCompendium={() => setShowCompendium(!showCompendium)} showCompendium={showCompendium} selectedScriptId={selectedScriptId} />

      <ChatMessages displayMessages={displayMessages} streamingContent={streamingContent} isStreaming={isStreaming} error={error} suggestions={suggestions} showSummary={showSummary} summaryContent={summaryContent} summaryLoading={summaryLoading} summaryError={summaryError} characterName={character?.name} characterAvatar={character?.avatar} editingMessageId={editingMessageId} editContent={editContent} setEditContent={setEditContent} onEditSave={handleEditMessage} onEditCancel={() => setEditingMessageId(null)} onEditStart={(msg) => { setEditingMessageId(msg.id); setEditContent(msg.content); }} onQuickReply={(t) => { if (activeConfigId) sendMessage(activeConfigId, t, failoverConfigId ?? undefined); }} onDismissSummary={dismissSummary} onCopySummary={() => navigator.clipboard.writeText(summaryContent)} />
      <ChatInput inputValue={inputValue} setInputValue={setInputValue} isStreaming={isStreaming} shortcutBar={shortcutBar} shortcutsExpanded={shortcutsExpanded} setShortcutsExpanded={setShortcutsExpanded} activeConfigId={activeConfigId} failoverConfigId={failoverConfigId} sendMessage={(cid, t, fid) => sendMessage(cid, t, fid)} recentMessages={displayMessages.slice(-6)} characterName={character?.name} banghuiEnabled={script?.extraData?.banghuiEnabled === 'Y'} />
      {showConvList && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20" onClick={() => setShowConvList(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-96 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800"><div className="text-sm font-medium text-gray-200">💬 对话列表</div><button onClick={() => setShowConvList(false)} className="text-gray-500">✕</button></div>
            <div className="p-2 space-y-1">{convList.length===0 ? <div className="text-center text-gray-600 text-xs py-4">暂无对话</div> : convList.map((c:any) => <button key={c.id} onClick={()=>switchConv(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeConversationId===c.id?'bg-purple-900/40 text-purple-300':'text-gray-300 hover:bg-gray-700'}`}><div className="truncate">{c.title||'未命名'}</div><div className="text-xs text-gray-500 mt-0.5">{new Date(c.updatedAt).toLocaleString('zh-CN')}{c.parentId?' · 🔀分支':''}</div></button>)}</div>
          </div>
        </div>
      )}
      {showCompendium && selectedScriptId && <CharacterCompendium scriptId={selectedScriptId} conversationId={activeConversationId} configId={activeConfigId} onClose={() => setShowCompendium(false)} />}
    </div>
  );
}
