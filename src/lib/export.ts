import type { Conversation, Message } from '@/types';

export function exportConversationToMarkdown(
  conversation: Conversation,
  messages: Message[],
  characterName: string,
): string {
  const lines: string[] = [
    `# ${conversation.title || '对话记录'}`,
    '',
    `> 角色：${characterName}`,
    `> 时间：${new Date(conversation.createdAt).toLocaleString()}`,
    '',
    '---',
    '',
  ];

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? '🧑 你' : msg.role === 'assistant' ? `💬 ${characterName}` : '📋 系统';
    lines.push(`### ${roleLabel}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function exportConversationToJSON(
  conversation: Conversation,
  messages: Message[],
) {
  return JSON.stringify(
    {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        scriptId: conversation.scriptId,
        characterId: conversation.characterId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    },
    null,
    2,
  );
}
