/** @jest-environment jsdom */
/**
 * ChatInput rendering tests — covers keyboard interactions.
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/pages/ChatPage/ChatInput';

// Mock electronAPI on the jsdom window
const mockIpc = {
  getCharacters: jest.fn().mockResolvedValue([]),
  discussSettings: jest.fn().mockResolvedValue({ reply: '选项1|选项2|选项3' }),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn(),
};
window.electronAPI = mockIpc as any;

const defaultProps = {
  inputValue: '',
  setInputValue: jest.fn(),
  isStreaming: false,
  shortcutBar: [],
  shortcutsExpanded: false,
  setShortcutsExpanded: jest.fn(),
  activeConfigId: 'config-1',
  failoverConfigId: null,
  sendMessage: jest.fn(),
  recentMessages: [],
  characterName: '测试角色',
  banghuiEnabled: false,
  chatMode: '1v1' as const,
  scriptId: 'script-1',
};

describe('ChatInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Enter sends message', async () => {
    const sendMessage = jest.fn();
    const setInputValue = jest.fn();
    render(
      <ChatInput {...defaultProps} sendMessage={sendMessage} setInputValue={setInputValue} inputValue="你好" />
    );

    const textarea = screen.getByPlaceholderText('输入消息... (Enter 发送)');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(setInputValue).toHaveBeenCalledWith('');
    expect(sendMessage).toHaveBeenCalledWith('config-1', '你好', undefined);
  });

  test('Shift+Enter does NOT send', () => {
    const sendMessage = jest.fn();
    render(
      <ChatInput {...defaultProps} sendMessage={sendMessage} inputValue="你好" />
    );

    const textarea = screen.getByPlaceholderText('输入消息... (Enter 发送)');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  test('textarea disabled when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);

    const textarea = screen.getByPlaceholderText('输入消息... (Enter 发送)');
    const sendBtn = screen.getByText('发送');

    expect(textarea).toBeDisabled();
    expect(sendBtn).toBeDisabled();
  });

  test('send button disabled when input is empty', () => {
    render(<ChatInput {...defaultProps} inputValue="   " />);

    const sendBtn = screen.getByText('发送');
    expect(sendBtn).toBeDisabled();
  });

  test('shows banghui placeholder when enabled', () => {
    render(<ChatInput {...defaultProps} banghuiEnabled={true} />);

    expect(screen.getByPlaceholderText('输入消息或帮回指令...')).toBeInTheDocument();
  });

  test('empty input does not send on Enter', () => {
    const sendMessage = jest.fn();
    render(<ChatInput {...defaultProps} sendMessage={sendMessage} inputValue="   " />);

    const textarea = screen.getByPlaceholderText('输入消息... (Enter 发送)');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
