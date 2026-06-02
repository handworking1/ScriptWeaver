import { create } from 'zustand';
import type { Conversation, Message, ChatMessage, QuickSuggestion } from '@/types';
import { nanoid } from 'nanoid';
import { extractSuggestions, stripSuggestions } from '@/lib/templateResolver';
import { estimateMessagesTokens, estimateTokens, estimateCost } from '@/lib/tokenCounter';
import { useConfigStore } from './configStore';

/** en: Snapshot active model + token limit from config store.
 *  zh: 从配置 store 快照读取当前模型名和 token 上限。 */
function getActiveModelInfo(): { model: string; maxTokens: number } {
  const { configs, activeConfigId } = useConfigStore.getState();
  const config = configs.find(c => c.id === activeConfigId);
  return { model: config?.model || '', maxTokens: config?.maxTokens || 1048576 };
}

interface ChatStore {
  activeConversationId: string | null;
  messages: Message[];
  displayMessages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;

  tokenCount: number;
  totalTokensSession: number;
  tokenLimit: number;
  estimatedCost: string;

  /** en: Refresh token limit from active config / zh: 从当前配置刷新 token 上限 */
  refreshTokenLimit: () => void;

  suggestions: QuickSuggestion[];

  summaryContent: string;
  summaryLoading: boolean;
  summaryError: string;
  showSummary: boolean;

  setActiveConversation: (id: string | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (id: string, scriptId: string, characterId: string, title?: string, parentId?: string | null) => Promise<Conversation>;
  sendMessage: (configId: string, content: string, failoverConfigId?: string) => Promise<void>;
  stopStreaming: () => void;

  editUserMessage: (messageId: string, newContent: string) => Promise<void>;
  undoLastMessage: () => Promise<void>;
  regenerateLast: (configId: string, failoverConfigId?: string) => Promise<void>;

  branchConversation: (scriptId: string, characterId: string) => Promise<Conversation>;

  requestSummary: (configId: string, characterName: string) => Promise<void>;
  dismissSummary: () => void;
  handleSummaryResult: (data: { summary: string; error?: string }) => void;

  appendToken: (token: string) => void;
  finishStreaming: (conversationId: string) => void;
  setStreamError: (error: string) => void;
  clearMessages: () => void;
  recalcTokens: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeConversationId: null,
  messages: [],
  displayMessages: [],
  streamingContent: '',
  isStreaming: false,
  error: null,

  tokenCount: 0,
  totalTokensSession: 0,
  tokenLimit: 1048576,
  estimatedCost: '$0.00',

  suggestions: [],

  summaryContent: '',
  summaryLoading: false,
  summaryError: '',
  showSummary: false,

  setActiveConversation: (id) => {
    set({
      activeConversationId: id, messages: [], displayMessages: [],
      streamingContent: '', isStreaming: false, error: null,
      suggestions: [], showSummary: false, summaryContent: '',
    });
  },

  loadMessages: async (conversationId) => {
    const allMessages = await window.electronAPI.getMessages(conversationId);
    const displayMessages = allMessages.filter((m) => m.role !== 'system');
    const tokens = estimateMessagesTokens(allMessages);
    set({
      messages: allMessages,
      displayMessages,
      streamingContent: '', isStreaming: false, error: null,
      tokenCount: tokens,
      totalTokensSession: tokens,
      estimatedCost: estimateCost(tokens, 0, getActiveModelInfo().model),
    });
  },

  createConversation: async (id, scriptId, characterId, title, parentId) => {
    const now = Date.now();
    const conv = await window.electronAPI.createConversation({
      id,
      scriptId,
      characterId,
      parentId: parentId ?? null,
      title: title ?? '新对话',
      createdAt: now,
      updatedAt: now,
    });
    set({
      activeConversationId: conv.id, messages: [], displayMessages: [],
      streamingContent: '', error: null,
      tokenCount: 0, totalTokensSession: 0, estimatedCost: '$0.00',
      suggestions: [], showSummary: false, summaryContent: '',
    });
    return conv;
  },

  sendMessage: async (configId, content, failoverConfigId) => {
    const { activeConversationId, messages } = get();
    if (!activeConversationId) return;

    const userMsg = await window.electronAPI.createMessage({
      id: nanoid(),
      conversationId: activeConversationId,
      role: 'user',
      content,
      timestamp: Date.now(),
    });

    const allMessages = [...messages, userMsg];

    // en: 使用 set(state) 避免异步窗口期 displayMessages 陈旧 / Use set(state) to avoid stale displayMessages
    set((state) => {
      const newDisplay = [...state.displayMessages, userMsg];
      const tokenCount = estimateMessagesTokens([...state.messages, userMsg]);
      return {
        messages: [...state.messages, userMsg],
        displayMessages: newDisplay,
        isStreaming: true,
        streamingContent: '',
        error: null,
        suggestions: [],
        tokenCount,
        estimatedCost: estimateCost(tokenCount, 0, getActiveModelInfo().model),
      };
    });

    // Build API messages — include system messages from the full list
    const apiMessages: ChatMessage[] = allMessages.map((m) => ({
      role: m.role,
      content: m.role === 'assistant' ? stripSuggestions(m.content) : m.content,
      _conversationId: m.conversationId,
    }));

    // en: 单向发送，错误通过 onChatError 事件获取 / Fire-and-forget; errors via onChatError event
    window.electronAPI.chatSend(configId, apiMessages, failoverConfigId);
  },

  stopStreaming: () => {
    window.electronAPI.chatStop();
  },

  editUserMessage: async (messageId, newContent) => {
    const { messages, activeConversationId } = get();
    if (!activeConversationId) return;

    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    await window.electronAPI.updateMessage(messageId, newContent);
    const msgTimestamp = messages[msgIndex].timestamp;
    await window.electronAPI.deleteMessagesAfter(activeConversationId, msgTimestamp);

    await get().loadMessages(activeConversationId);
  },

  regenerateLast: async (configId, failoverConfigId) => {
    const { messages, activeConversationId } = get();
    if (!activeConversationId || messages.length === 0) return;

    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') { lastAssistantIdx = i; break; }
    }
    if (lastAssistantIdx === -1) return;

    await window.electronAPI.deleteMessagesAfter(activeConversationId, messages[lastAssistantIdx].timestamp - 1);

    const allMsgs = await window.electronAPI.getMessages(activeConversationId);
    const displayMsgs = allMsgs.filter((m) => m.role !== 'system');
    set({
      messages: allMsgs,
      displayMessages: displayMsgs,
      isStreaming: true,
      streamingContent: '',
      error: null,
      suggestions: [],
    });
    get().recalcTokens();

    // Include system messages in API call
    const apiMessages: ChatMessage[] = allMsgs.map((m) => ({
      role: m.role,
      content: m.role === 'assistant' ? stripSuggestions(m.content) : m.content,
      _conversationId: m.conversationId,
    }));

    // en: 单向发送，错误通过 onChatError 事件获取 / Fire-and-forget; errors via onChatError event
    window.electronAPI.chatSend(configId, apiMessages, failoverConfigId);
  },

  branchConversation: async (scriptId, characterId) => {
    const { activeConversationId, messages } = get();
    const id = nanoid();
    const now = Date.now();
    const conv = await window.electronAPI.createConversation({
      id,
      scriptId,
      characterId,
      parentId: activeConversationId,
      title: '分支对话',
      createdAt: now,
      updatedAt: now,
    });
    for (const m of messages) {
      await window.electronAPI.createMessage({
        id: nanoid(),
        conversationId: id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      });
    }
    set({ activeConversationId: conv.id, tokenCount: get().tokenCount, totalTokensSession: get().totalTokensSession });
    return conv;
  },

  requestSummary: async (configId, characterName) => {
    const { displayMessages } = get();
    set({ summaryLoading: true, summaryError: '', showSummary: true });

    const apiMessages: ChatMessage[] = displayMessages.map((m) => ({
      role: m.role,
      content: stripSuggestions(m.content),
    }));

    window.electronAPI.chatSummary(configId, apiMessages, characterName);
  },

  dismissSummary: () => {
    set({ showSummary: false, summaryContent: '', summaryError: '' });
  },

  handleSummaryResult: (data) => {
    if (data.error) {
      set({ summaryLoading: false, summaryError: data.error });
    } else {
      set({ summaryLoading: false, summaryContent: data.summary });
    }
  },

  appendToken: (token) => {
    set({ streamingContent: get().streamingContent + token });
  },

  finishStreaming: async (conversationId) => {
    const state = get();
    const convId = conversationId || state.activeConversationId;
    if (!convId || !state.streamingContent || !state.isStreaming) {
      set({ isStreaming: false, streamingContent: '' });
      return;
    }
    // Atomic gate: close door immediately to prevent double-invocation.
    // Keep streamingContent visible until DB write succeeds — if write fails,
    // the user can still read and copy-paste the response.
    // 原子门：立即关门防重复调用。
    // 保留 streamingContent 到 DB 写入成功——写入失败时用户仍可复制回复内容。
    const capturedContent = state.streamingContent;
    set({ isStreaming: false, suggestions: [] });

    const suggestions = extractSuggestions(capturedContent);
    const cleanContent = stripSuggestions(capturedContent);

    try {
      const assistantMsg = await window.electronAPI.createMessage({
        id: nanoid(),
        conversationId: convId,
        role: 'assistant',
        content: cleanContent,
        timestamp: Date.now(),
      });

      // DB write succeeded — now clear streaming content and persist message
      // DB 写入成功——清空流式内容，持久化消息
      const newMessages = [...state.messages, assistantMsg];
      const newDisplayMessages = [...state.displayMessages, assistantMsg];

      set({
        streamingContent: '',
        messages: newMessages,
        displayMessages: newDisplayMessages,
        suggestions: suggestions.map((text) => ({ text })),
      });

      // Bump conversation timestamp (fire-and-forget, non-critical)
      try {
        await window.electronAPI.updateConversation(convId, {});
      } catch (err) { console.error('[finishStreaming] updateConversation failed:', err); }

      // Count new tokens + accumulate session total / 新token计数 + 累计会话总量
      const newTokens = estimateTokens(assistantMsg.content);
      const newTotal = state.totalTokensSession + newTokens;
      set({
        tokenCount: estimateMessagesTokens(newMessages),
        totalTokensSession: newTotal,
        estimatedCost: estimateCost(newTotal, 0, getActiveModelInfo().model),
      });
    } catch (err) {
      // DB write failed — keep streamingContent visible so user can copy it.
      // DB 写入失败——保留流式内容，用户仍可复制。
      console.error('[finishStreaming] createMessage failed:', err);
      set({
        error: `保存回复失败: ${(err as Error).message}。请复制上面的回复内容，刷新页面后重试。`,
      });
    }
  },

  setStreamError: (error) => {
    set({ error, isStreaming: false, streamingContent: '' });
  },

  /** en: Undo last user message and everything after it. / zh: 撤销最后一条用户消息及之后的所有消息。 */
  undoLastMessage: async () => {
    const { messages, activeConversationId } = get();
    if (!activeConversationId || messages.length === 0 || get().isStreaming) return;

    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;

    await window.electronAPI.deleteMessagesAfter(activeConversationId, messages[lastUserIdx].timestamp - 1);
    await get().loadMessages(activeConversationId);
  },

  clearMessages: () => {
    set({
      messages: [], displayMessages: [], streamingContent: '', isStreaming: false, error: null,
      tokenCount: 0, totalTokensSession: 0, suggestions: [],
      showSummary: false, summaryContent: '',
    });
  },

  recalcTokens: () => {
    const { messages, streamingContent } = get();
    const allContent = [...messages.map((m) => m.content), streamingContent].join('');
    const tokens = estimateTokens(allContent);
    set({
      tokenCount: tokens,
      estimatedCost: estimateCost(tokens, 0, getActiveModelInfo().model),
    });
  },

  /** en: Sync tokenLimit from the active AI config's maxTokens.
   *  zh: 从当前 AI 配置的 maxTokens 同步 token 上限。 */
  refreshTokenLimit: () => {
    set({ tokenLimit: getActiveModelInfo().maxTokens });
  },
}));
