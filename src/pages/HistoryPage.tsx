import { useEffect, useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useNavStore } from '@/stores/navStore';
import { ConversationList } from '@/components/ConversationList';
import { ChatBubble } from '@/components/ChatBubble';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { exportConversationToMarkdown, exportConversationToJSON, markdownToHtml } from '@/lib/export';
import type { Conversation, Message } from '@/types';

// Character name cache with 5-minute TTL
const charNameCache: Record<string, { name: string; ts: number }> = {};

async function getCharName(charId: string): Promise<string> {
  const cached = charNameCache[charId];
  if (cached && Date.now() - cached.ts < 300_000) return cached.name;
  const c = await window.electronAPI.getCharacter(charId);
  const name = c?.name ?? '未知角色';
  charNameCache[charId] = { name, ts: Date.now() };
  return name;
}

export function HistoryPage() {
  const { scripts, loadScripts } = useScriptStore();
  const { setResumeConversation, navigate, selectScript, selectCharacter } = useNavStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [characterName, setCharacterName] = useState<string>('');
  const [filterScriptId, setFilterScriptId] = useState<string | undefined>();
  const [filterCharacterId, setFilterCharacterId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'chat' | 'raw'>('chat');

  useEffect(() => {
    loadScripts();
    loadConversations();
  }, [filterScriptId, filterCharacterId]);

  const loadConversations = async () => {
    const convs = await window.electronAPI.getConversations(filterScriptId, filterCharacterId);
    setConversations(convs);
  };

  const handleSelect = async (id: string) => {
    const conv = conversations.find((c) => c.id === id) ?? null;
    setSelectedConv(conv);
    if (conv) {
      const msgs = await window.electronAPI.getMessages(conv.id);
      setMessages(msgs.filter((m) => m.role !== 'system'));
      const name = await getCharName(conv.characterId);
      setCharacterName(name);
    }
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteConversation(id);
    if (selectedConv?.id === id) {
      setSelectedConv(null);
      setMessages([]);
      setCharacterName('');
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const getScriptName = (scriptId: string) => {
    return scripts.find((s) => s.id === scriptId)?.title ?? '...';
  };

  const handleExportMarkdown = () => {
    if (!selectedConv) return;
    getCharName(selectedConv.characterId).then((name) => {
      const md = exportConversationToMarkdown(selectedConv, messages, name);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedConv.title || '对话'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleContinue = () => {
    if (!selectedConv) return;
    selectScript(selectedConv.scriptId);
    selectCharacter(selectedConv.characterId || null);
    setResumeConversation(selectedConv.id);
    navigate('chat');
  };

  const handleExportJSON = () => {
    if (!selectedConv) return;
    const json = exportConversationToJSON(selectedConv, messages);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConv.title || '对话'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex h-full">
      {/* Left: Conversation List */}
      <div className="w-80 border-r border-gray-800 overflow-y-auto p-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-100 mb-4">📋 历史记录</h2>

        {/* Filters */}
        <div className="space-y-2 mb-4">
          <select
            value={filterScriptId ?? ''}
            onChange={(e) => setFilterScriptId(e.target.value || undefined)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
          >
            <option value="">全部剧本</option>
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <ConversationList
          conversations={conversations}
          onSelect={handleSelect}
          onDelete={handleDelete}
          selectedId={selectedConv?.id}
        />
      </div>

      {/* Right: Detail */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Detail Header */}
            <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-100">
                  {selectedConv.parentId && <span className="text-xs text-purple-400 mr-1">🔀</span>}
                  {selectedConv.title || '未命名对话'}
                </h3>
                <p className="text-xs text-gray-500">
                  {getScriptName(selectedConv.scriptId)} · {new Date(selectedConv.createdAt).toLocaleString('zh-CN')}
                  {selectedConv.parentId && <span className="text-purple-400 ml-2">分支对话</span>}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={handleContinue}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors">
                  💬 继续对话
                </button>
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('chat')}
                    className={`px-2 py-1 text-xs rounded ${viewMode === 'chat' ? 'bg-gray-700 text-gray-200' : 'text-gray-500'}`}
                  >
                    对话
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2 py-1 text-xs rounded ${viewMode === 'raw' ? 'bg-gray-700 text-gray-200' : 'text-gray-500'}`}
                  >
                    原始
                  </button>
                </div>
                <button
                  onClick={handleExportMarkdown}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  📥 MD
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  📥 JSON
                </button>
                <button
                  onClick={() => {
                    if (!selectedConv) return;
                    getCharName(selectedConv.characterId).then((name) => {
                      const md = exportConversationToMarkdown(selectedConv!, messages, name);
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedConv!.title}</title><style>body{font-family:serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;font-size:16px}h1{text-align:center}h3{color:#555}@media print{body{margin:20px}}</style></head><body>${markdownToHtml(md)}</body></html>`;
                      const w = window.open('', '_blank');
                      if (!w) { alert('弹窗被拦截，请允许弹窗后重试'); return; }
                      w.document.write(html);
                      w.document.close();
                      w.onload = () => w.print();
                    });
                  }}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  🖨️ PDF
                </button>
                <button
                  onClick={() => {
                    if (!selectedConv) return;
                    getCharName(selectedConv.characterId).then((name) => {
                      const novel = messages.filter(m=>m.role!=='system').map(m=>m.role==='user'?`\n「${m.content}」\n`:`${m.content}\n`).join('\n');
                      const blob = new Blob([`# ${selectedConv!.title}\n\n> 角色：${name}\n\n---\n\n${novel}`], {type:'text/markdown'});
                      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${selectedConv!.title||'小说'}.md`;a.click();
                    });
                  }}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  📖 小说
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                {viewMode === 'chat' ? (
                  messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      characterName={msg.role === 'assistant' ? characterName : undefined}
                    />
                  ))
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            msg.role === 'user' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'
                          }`}>
                            {msg.role === 'user' ? '🧑 用户' : '🤖 助手'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500">左侧选择对话记录查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

