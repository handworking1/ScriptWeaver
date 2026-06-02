/**
 * Real Zustand store tests with mocked Electron IPC.
 * Tests the chatStore state machine: sendMessage → appendToken → finishStreaming.
 */

// Mock electronAPI before store import
const mockIpc = {
  createMessage: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessagesAfter: jest.fn(),
  getMessages: jest.fn(),
  createConversation: jest.fn(),
  updateConversation: jest.fn(),
  chatSend: jest.fn().mockResolvedValue(undefined),
  chatStop: jest.fn(),
  chatSummary: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
};
(global as any).window = { electronAPI: mockIpc };

import { useChatStore } from '@/stores/chatStore';

describe('chatStore state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({
      activeConversationId: 'conv-1',
      messages: [],
      displayMessages: [],
      streamingContent: '',
      isStreaming: false,
      error: null,
      tokenCount: 0,
      totalTokensSession: 0,
      suggestions: [],
      showSummary: false,
      summaryContent: '',
    });
    mockIpc.createMessage.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'hello', timestamp: 1 });
    mockIpc.createConversation.mockResolvedValue({ id: 'conv-1', scriptId: 's1', characterId: 'c1', title: 'test', createdAt: 1, updatedAt: 1 });
    mockIpc.getMessages.mockResolvedValue([]);
  });

  test('sendMessage sets isStreaming and creates user message', async () => {
    const { sendMessage } = useChatStore.getState();
    await sendMessage('config-1', 'hello');
    const state = useChatStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.displayMessages[0]?.content).toBe('hello');
    expect(state.displayMessages[0]?.role).toBe('user');
    expect(mockIpc.createMessage).toHaveBeenCalled();
    expect(mockIpc.chatSend).toHaveBeenCalled();
  });

  test('appendToken accumulates streamingContent', () => {
    const { appendToken } = useChatStore.getState();
    appendToken('你');
    appendToken('好');
    expect(useChatStore.getState().streamingContent).toBe('你好');
  });

  test('finishStreaming atomic gate: double call is no-op', async () => {
    // Set up streaming state
    useChatStore.setState({ isStreaming: true, streamingContent: 'test reply\n[SUGGESTIONS: A | B | C]' });
    mockIpc.createMessage.mockResolvedValue({ id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: 'test reply', timestamp: 2 });

    const { finishStreaming } = useChatStore.getState();
    await finishStreaming('conv-1');

    const state1 = useChatStore.getState();
    expect(state1.isStreaming).toBe(false);
    expect(state1.streamingContent).toBe('');
    expect(state1.suggestions).toEqual([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);

    // Second call should be no-op (gate closed)
    await finishStreaming('conv-1');
    expect(useChatStore.getState().displayMessages.length).toBe(state1.displayMessages.length);
  });

  test('stopStreaming calls chatStop', () => {
    useChatStore.getState().stopStreaming();
    expect(mockIpc.chatStop).toHaveBeenCalled();
  });
});
