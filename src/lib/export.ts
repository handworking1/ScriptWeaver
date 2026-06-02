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

/** Convert simple Markdown to basic HTML for PDF export.
 *  Only handles headings, horizontal rules, and line breaks.
 *  Safe — won't misinterpret # in code contexts since we
 *  only match at line start after stripping code blocks. */
/** Convert Markdown → HTML for PDF export. Code blocks are escaped first for safety.
 *  将Markdown转换为HTML用于PDF导出，先转义代码块防止误匹配。 */
export function markdownToHtml(md: string): string {
  // Strip code blocks first to avoid #/--- misinterpretation
  const stripped = md.replace(/```[\s\S]*?```/g, (match) => match.replace(/[#]/g, '&#35;').replace(/---/g, '&#45;&#45;&#45;'));
  return stripped
    .split('\n')
    .map((line) => {
      if (/^### /.test(line)) return `<h3>${line.slice(4)}</h3>`;
      if (/^## /.test(line)) return `<h2>${line.slice(3)}</h2>`;
      if (/^# /.test(line)) return `<h1>${line.slice(2)}</h1>`;
      if (/^---/.test(line)) return '<hr>';
      return line + '<br>';
    })
    .join('');
}
