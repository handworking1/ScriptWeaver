import { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  configId: string;
  type: 'script' | 'character';
  fields: Record<string, string>;
  onClose: () => void;
  onCreateScript?: (data: Record<string, string>) => void;
}

export function SettingsDiscussion({ configId, type, fields, onClose, onCreateScript }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const result = await window.electronAPI.discussSettings(
        configId, type, fields,
        newMessages.map((m) => ({ role: m.role, content: m.content })),
      );
      if (result.error) {
        setMessages([...newMessages, { role: 'assistant', content: `❌ ${result.error}` }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: result.reply || '（无回复）' }]);
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `❌ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (messages.length === 0 || !onCreateScript) return;
    setGenerating(true);
    // Ask AI to generate structured script JSON
    const prompt = `根据以上讨论，生成完整的剧本设定JSON。严格只输出JSON：
{
  "title": "剧本标题",
  "worldSetting": "世界观（50-150字）",
  "background": "故事背景（100-300字）",
  "mainQuests": "主线任务",
  "sideQuests": "支线任务",
  "environment": "环境描述",
  "map": "地图/区域",
  "data": "其他数据（势力、等级、货币等）"
}`;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const genMessages = [...history, { role: 'user' as const, content: prompt }];

    try {
      const result = await window.electronAPI.discussSettings(configId, type, fields, genMessages);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          let data: any;
          try { data = JSON.parse(match[0]); } catch { setMessages([...messages, { role: 'assistant', content: '❌ AI 返回格式异常' }]); setGenerating(false); return; }
          onCreateScript(data);
          setMessages([...messages, { role: 'assistant', content: '✅ 剧本已生成！' }]);
        } else {
          setMessages([...messages, { role: 'assistant', content: '❌ 无法解析生成的JSON' }]);
        }
      }
    } catch (err: any) {
      setMessages([...messages, { role: 'assistant', content: `❌ ${err.message}` }]);
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 flex flex-col z-[60] shadow-2xl max-h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <div className="text-sm font-medium text-gray-200">💬 与 AI 讨论设定</div>
          <div className="text-xs text-gray-500">{type === 'script' ? '剧本策划顾问' : '角色设计顾问'}</div>
        </div>
        <div className="flex gap-2">
          {type === 'script' && onCreateScript && (
            <button onClick={handleGenerate} disabled={generating || messages.length === 0}
              className="text-xs text-green-400 hover:text-green-300 disabled:text-gray-600">
              {generating ? '⏳' : '📝 生成'}
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-500 max-h-24 overflow-y-auto">
        {Object.entries(fields).map(([k, v]) => v && (
          <div key={k} className="truncate"><span className="text-gray-600">{k}:</span> {v}</div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            输入你的问题，AI 会帮你分析当前设定并给出改进建议。讨论完成后点 📝 生成剧本。
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
              m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-200'
            }`}>
              {m.role === 'assistant' ? <MarkdownRenderer content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400 animate-pulse">思考中...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="询问 AI..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-10"
            rows={1} disabled={loading} />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-xs">发送</button>
        </div>
      </div>
    </div>
  );
}
