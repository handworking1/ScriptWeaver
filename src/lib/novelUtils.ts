/**
 * Novel utils — message-to-novel conversion + text sampling engine.
 * 小说工具 — 消息转小说 + 文本采样引擎。
 */

import type { Message } from '@/types';

/** Strip AI markers and SUGGESTIONS / 去掉AI标注和建议 */
export function stripMarkers(content: string): string {
  return content
    .replace(/\[SUGGESTIONS:[\s\S]*?\]/g, '')
    .replace(/【[^】]*】/g, '')
    .trim();
}

/** Filter out banghui role-external analysis / 过滤帮回角色外分析 */
export function filterBanghui(messages: Message[]): Message[] {
  return messages.filter(m => {
    if (m.role !== 'assistant') return true;
    const c = m.content;
    // Filter out analysis blocks that start with "--- 角色外 ---"
    if (c.includes('--- 角色外 ---') || c.includes('--- 当前章节状态 ---')) return false;
    return true;
  });
}

/** Extract chapter titles from text / 从文本提取章节标题 */
export function extractChapters(text: string): string[] {
  const chapters: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.match(/^第[一二三四五六七八九十百千\d]+[章节卷部][：:\s]*(.+)/);
    if (m) chapters.push(m[0].trim());
  }
  return chapters;
}

/** Smart sample: get beginning + end + distributed mid-sections / 智能采样 */
export function sampleNovel(text: string, maxLen: number = 14000): string {
  if (text.length <= maxLen) return text;
  const head = text.slice(0, 3000);
  const tail = text.slice(-2000);

  // Find chapter titles for targeted sampling / 找到章节标题定向采样
  const lines = text.split('\n');
  const chapterIndices: number[] = [];
  lines.forEach((line, i) => {
    if (/^第[一二三四五六七八九十百千\d]+[章节卷部]/.test(line.trim())) {
      chapterIndices.push(i);
    }
  });

  // Sample chapter openings / 采样每章开头
  const samples: string[] = [];
  if (chapterIndices.length > 0) {
    const step = Math.max(1, Math.floor(chapterIndices.length / 15)); // ~15 samples
    for (let i = 0; i < chapterIndices.length; i += step) {
      const start = chapterIndices[i];
      const sample = lines.slice(start, start + 5).join('\n');
      samples.push(sample);
      if (samples.length >= 15) break;
    }
  } else {
    // No chapters found — sample every N chars / 无章节标记 — 等距采样
    const step = Math.floor(text.length / 10);
    for (let i = step; i < text.length - step; i += step) {
      samples.push(text.slice(i, i + 300));
      if (samples.length >= 10) break;
    }
  }

  const total = head + '\n\n...\n\n' + samples.join('\n\n---\n\n') + '\n\n...\n\n' + tail;
  return total.slice(0, maxLen);
}

/** Convert messages to novel-style continuous text / 消息转小说体连续文本 */
export interface NovelOptions {
  chapterMarkers?: { title: string; at: number }[];
  starredIds?: string[];
  includeUser?: boolean;
}

export function messagesToNovel(messages: Message[], options: NovelOptions = {}): string {
  const { chapterMarkers = [], starredIds = [], includeUser = true } = options;
  const filtered = filterBanghui(messages);
  const lines: string[] = [];

  // Sort markers by time / 按时间排序
  const markers = [...chapterMarkers].sort((a, b) => a.at - b.at);
  let markerIdx = 0;

  for (const msg of filtered) {
    // Insert chapter marker if applicable / 插入章节标记
    while (markerIdx < markers.length && markers[markerIdx].at <= msg.timestamp) {
      lines.push(`\n# ${markers[markerIdx].title}\n`);
      markerIdx++;
    }

    if (msg.role === 'system') continue;

    const content = stripMarkers(msg.content);
    if (!content) continue;

    if (msg.role === 'user') {
      if (!includeUser) continue;
      lines.push(content);
    } else {
      const prefix = starredIds.includes(msg.id) ? '⭐ ' : '';
      lines.push(prefix + content);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}
