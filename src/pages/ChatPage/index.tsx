import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useScriptStore } from '@/stores/scriptStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';
import { TokenBar } from '@/components/TokenBar';
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
    tokenCount, totalTokensSession, tokenLimit, estimatedCost,
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

  useIpcListeners(appendToken, finishStreaming, setStreamError, handleSummaryResult);

  const script = scripts.find((s) => s.id === selectedScriptId);
  const character = useCharacterStore.getState().characters.find((c) => c.id === selectedCharacterId) ?? null;

  const { build1v1Prompt, buildWorldPrompt } = useSystemPrompt(chatMode, character, script, templates, activeTemplateId, replyLength, interactionOpts);

  useEffect(() => { loadConfigs(); loadTemplates(); (async () => { try { const d = await window.electronAPI.getSetting('chat_shortcuts'); if (d) setShortcutBar(JSON.parse(d)); } catch {} })(); }, []);
  useEffect(() => { setShowSetup(true); }, []);
  useEffect(() => {
    if (!resumeConversationId || !activeConfigId) return;
    (async () => {
      const conv = await window.electronAPI.getConversation(resumeConversationId);
      if (!conv) return;
      selectScript(conv.scriptId); selectCharacter(conv.characterId || null);
      setChatMode(conv.characterId ? '1v1' : 'world'); setResumeConversation(null); setShowSetup(true);
    })();
  }, [resumeConversationId, activeConfigId]);

  const handleStartChat = async () => {
    if (!selectedScriptId || !activeConfigId) return;
    if (chatMode === '1v1' && !selectedCharacterId) return;
    if (chatMode === '1v1') {
      const char = await window.electronAPI.getCharacter(selectedCharacterId!);
      if (!char) return;
      const conv = await createConversation(generateId(), selectedScriptId, selectedCharacterId!, `与${char.name}的对话`);
      const prompt = await build1v1Prompt(char);
      await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
      setShowSetup(false); await loadMessages(conv.id);
    } else {
      const conv = await createConversation(generateId(), selectedScriptId, '', `世界：${script?.title || '未知'}`);
      const prompt = await buildWorldPrompt();
      await window.electronAPI.createMessage({ id: generateId(), conversationId: conv.id, role: 'system', content: prompt, timestamp: Date.now() });
      setShowSetup(false); await loadMessages(conv.id);
    }
  };

  const handleEditMessage = async (msg: Message) => {
    if (msg.role !== 'user') return;
    if (editingMessageId === msg.id) { await editUserMessage(msg.id, editContent); setEditingMessageId(null); setEditContent(''); }
    else { setEditingMessageId(msg.id); setEditContent(msg.content); }
  };

  const loadConvList = async () => { if (selectedScriptId) { setConvList(await window.electronAPI.getConversations(selectedScriptId)); setShowConvList(true); } };
  const switchConv = async (id: string) => { useChatStore.getState().setActiveConversation(id); useChatStore.getState().loadMessages(id); const c = await window.electronAPI.getConversation(id); if (c) { selectCharacter(c.characterId || null); setChatMode(c.characterId ? '1v1' : 'world'); } setShowConvList(false); };

  if (showSetup) return <ChatSetup chatMode={chatMode} setChatMode={setChatMode} selectedScriptId={selectedScriptId} selectedCharacterId={selectedCharacterId} activeConfigId={activeConfigId} activeTemplateId={activeTemplateId} replyLength={replyLength} setReplyLength={setReplyLength} interactionOpts={interactionOpts} setInteractionOpts={setInteractionOpts} onStart={handleStartChat} />;

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader characterName={character?.name} characterAvatar={character?.avatar} scriptTitle={script?.title} chatMode={chatMode} isStreaming={isStreaming} displayMessagesLen={displayMessages.length} onBack={() => setShowSetup(true)} onStop={stopStreaming} onSummary={() => { if (activeConfigId && character) requestSummary(activeConfigId, character.name); }} onBranch={async () => { if (selectedScriptId && selectedCharacterId) await branchConversation(selectedScriptId, selectedCharacterId); }} onRegenerate={async () => { if (activeConfigId) await regenerateLast(activeConfigId, failoverConfigId ?? undefined); }} onConvList={loadConvList} onCompendium={() => setShowCompendium(!showCompendium)} showCompendium={showCompendium} selectedScriptId={selectedScriptId} />
      <TokenBar used={tokenCount} limit={tokenLimit} totalInSession={totalTokensSession} estimatedCost={estimatedCost} />
      <ChatMessages displayMessages={displayMessages} streamingContent={streamingContent} isStreaming={isStreaming} error={error} suggestions={suggestions} showSummary={showSummary} summaryContent={summaryContent} summaryLoading={summaryLoading} summaryError={summaryError} characterName={character?.name} characterAvatar={character?.avatar} editingMessageId={editingMessageId} editContent={editContent} setEditContent={setEditContent} onEditSave={handleEditMessage} onEditCancel={() => setEditingMessageId(null)} onQuickReply={(t) => { if (activeConfigId) sendMessage(activeConfigId, t, failoverConfigId ?? undefined); }} onDismissSummary={dismissSummary} onCopySummary={() => navigator.clipboard.writeText(summaryContent)} />
      <ChatInput inputValue={inputValue} setInputValue={setInputValue} isStreaming={isStreaming} shortcutBar={shortcutBar} shortcutsExpanded={shortcutsExpanded} setShortcutsExpanded={setShortcutsExpanded} activeConfigId={activeConfigId} failoverConfigId={failoverConfigId} sendMessage={(cid, t, fid) => sendMessage(cid, t, fid)} />
      {showConvList && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20" onClick={() => setShowConvList(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-96 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800"><div className="text-sm font-medium text-gray-200">💬 对话列表</div><button onClick={() => setShowConvList(false)} className="text-gray-500">✕</button></div>
            <div className="p-2 space-y-1">{convList.length===0 ? <div className="text-center text-gray-600 text-xs py-4">暂无对话</div> : convList.map((c:any) => <button key={c.id} onClick={()=>switchConv(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeConversationId===c.id?'bg-purple-900/40 text-purple-300':'text-gray-300 hover:bg-gray-700'}`}><div className="truncate">{c.title||'未命名'}</div><div className="text-xs text-gray-500 mt-0.5">{new Date(c.updatedAt).toLocaleString('zh-CN')}{c.parentId?' · 🔀分支':''}</div></button>)}</div>
          </div>
        </div>
      )}
      {showCompendium && selectedScriptId && <CharacterCompendium scriptId={selectedScriptId} onClose={() => setShowCompendium(false)} />}
    </div>
  );
}
