import { useEffect, useState, useRef } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { generateId } from '@/lib/id';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DISCUSS_KEY_PREFIX = 'discuss_msgs_';

export function AIDiscussPage() {
  const { scripts, loadScripts, addScript, editScript } = useScriptStore();
  const { configs, activeConfigId } = useConfigStore();
  const { selectScript } = useNavStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [detectedChars, setDetectedChars] = useState<any[]>([]);
  const [targetScriptId, setTargetScriptId] = useState<string>('');
  const [targetTitle, setTargetTitle] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadScripts(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Persist messages on change
  useEffect(() => {
    const key = DISCUSS_KEY_PREFIX + (targetScriptId || '_new_');
    window.electronAPI.setSetting(key, JSON.stringify({ title: targetTitle, msgs: messages }));
  }, [messages, targetScriptId, targetTitle]);

  // Load messages when switching scripts
  useEffect(() => {
    const key = DISCUSS_KEY_PREFIX + (targetScriptId || '_new_');
    (async () => {
      try {
        const d = await window.electronAPI.getSetting(key);
        if (d) {
          const parsed = JSON.parse(d);
          setMessages(parsed.msgs || []);
          if (parsed.title && !targetTitle) setTargetTitle(parsed.title);
        } else {
          setMessages([]);
        }
      } catch { setMessages([]); }
    })();
  }, [targetScriptId]);

  const selectedScript = scripts.find((s) => s.id === targetScriptId);

  const getFields = () => ({
    title: targetTitle || selectedScript?.title || '',
    worldSetting: selectedScript?.worldSetting || '',
    background: selectedScript?.background || '',
    mainQuests: selectedScript?.extraData?.mainQuests || '',
    sideQuests: selectedScript?.extraData?.sideQuests || '',
    environment: selectedScript?.extraData?.environment || '',
    map: selectedScript?.extraData?.map || '',
    data: selectedScript?.extraData?.data || '',
  });

  // ── Send ────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !activeConfigId) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'script', getFields(), newMessages.map(m => ({ role: m.role, content: m.content })));
      if (result.error) { setMessages([...newMessages, { role: 'assistant', content: '❌ ' + result.error }]); }
      else { setMessages([...newMessages, { role: 'assistant', content: result.reply || '（无回复）' }]); }
    } catch (err: any) { setMessages([...newMessages, { role: 'assistant', content: '❌ ' + err.message }]); }
    finally { setLoading(false); }
  };

  // ── Undo (remove last exchange) ──────────────────
  const handleUndo = () => {
    if (messages.length < 2) return;
    setMessages((prev) => prev.slice(0, -2));
  };

  // ── Apply to existing script ────────────────────
  const handleApply = async () => {
    if (!targetScriptId || messages.length === 0 || !activeConfigId) return;
    setApplying(true);
    const prompt = `综合以上讨论，提取最新的剧本设定更新。必须输出严格JSON，不要任何额外文字：
{
  "title": "标题（如已确认则用确认的值）",
  "worldSetting": "世界观",
  "background": "故事背景",
  "mainQuests": "主线任务",
  "sideQuests": "支线任务",
  "environment": "环境描述",
  "map": "地图",
  "data": "其他设定"
}
已有设定（未填表示尚未设定）：
${JSON.stringify(getFields(), null, 2)}`;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'script', getFields(), [...history, { role: 'user' as const, content: prompt }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*?\}/);
        if (match) {
          let data: any;
          try { data = JSON.parse(match[0]); } catch { setApplying(false); return; }
          await editScript(targetScriptId, {
            title: data.title || selectedScript?.title,
            worldSetting: data.worldSetting || selectedScript?.worldSetting,
            background: data.background || selectedScript?.background,
            extraData: {
              ...selectedScript?.extraData,
              mainQuests: data.mainQuests || selectedScript?.extraData?.mainQuests || '',
              sideQuests: data.sideQuests || selectedScript?.extraData?.sideQuests || '',
              environment: data.environment || selectedScript?.extraData?.environment || '',
              map: data.map || selectedScript?.extraData?.map || '',
              data: data.data || selectedScript?.extraData?.data || '',
            } as any,
          });
          await loadScripts();
          setMessages((prev) => [...prev, { role: 'assistant', content: '✅ 设定已更新到剧本。可在剧本管理中查看。' }]);
        }
      }
    } catch (err: any) { console.error('[apply]', err); }
    finally { setApplying(false); }
  };

  // ── Extract characters ─────────────────────────
  const handleExtractChars = async () => {
    if (messages.length === 0 || !activeConfigId) return;
    setExtracting(true);
    const prompt = '根据以上所有讨论，提取其中出现的所有角色。只输出JSON数组：\n[{"name":"角色名","personality":"性格","background":"背景","speakingStyle":"口癖","appearance":"外貌"}]';
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'character', { name: '', personality: '', background: '', speakingStyle: '', appearance: '' }, [...history, { role: 'user' as const, content: prompt }]);
      if (result.reply) {
        const match = result.reply.match(/\[[\s\S]*?\]/);
        if (match) { try { setDetectedChars(JSON.parse(match[0])); } catch {} }
        else { setMessages(prev => [...prev, { role: 'assistant', content: '❌ 未检测到角色信息' }]); }
      }
    } catch { /* ignore */ }
    finally { setExtracting(false); }
  };

  const handleAddChar = async (char: any) => {
    if (!targetScriptId) return;
    try {
      await window.electronAPI.createCharacter({ id: generateId(), scriptId: targetScriptId, name: char.name || '未命名', personality: char.personality || '', background: char.background || '', speakingStyle: char.speakingStyle || '', appearance: char.appearance || '', avatar: '', createdAt: Date.now() } as any);
      setDetectedChars(prev => prev.filter(c => c.name !== char.name));
    } catch (err: any) { alert('添加角色失败：' + err.message); }
  };

  // ── Generate new script ─────────────────────────
  const handleGenerate = async () => {
    if (messages.length === 0 || !activeConfigId) return;
    setGenerating(true);
    const prompt = '根据以上讨论，生成完整剧本设定JSON。只输出JSON：{"title":"剧本标题","worldSetting":"世界观(50-200字)","background":"故事背景(100-300字)","mainQuests":"主线任务","sideQuests":"支线任务","environment":"环境描述","map":"地图","data":"其他设定"}';
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'script', getFields(), [...history, { role: 'user' as const, content: prompt }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*?\}/);
        if (match) {
          let data: any; try { data = JSON.parse(match[0]); } catch { setMessages([...messages, { role: 'assistant', content: '❌ 格式异常，重试' }]); setGenerating(false); return; }
          const now = Date.now();
          const script = await addScript({ id: generateId(), title: data.title || targetTitle || 'AI生成', worldSetting: data.worldSetting || '', background: data.background || '', extraData: { mainQuests: data.mainQuests || '', sideQuests: data.sideQuests || '', environment: data.environment || '', map: data.map || '', data: data.data || '', tags: '', referenceWorks: '', eraBackground: '', protagonistDilemma: '', coreCheat: '', ageRule: '', timeline: '', chapters: '', narrativeMode: 'mode3', strictMode: 'strict', workflowMode: 'guided', recapMode: 'N', periodicSummary: 'O', ruleSelfCheck: 'Y' } as any, createdAt: now, updatedAt: now });
          setTargetScriptId(script.id); selectScript(script.id);
          setMessages([...messages, { role: 'assistant', content: '✅ 剧本「' + script.title + '」已创建！' }]);
        } else { setMessages([...messages, { role: 'assistant', content: '❌ 无法解析JSON' }]); }
      }
    } catch (err: any) { setMessages([...messages, { role: 'assistant', content: '❌ ' + err.message }]); }
    finally { setGenerating(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-100">💬 AI 剧本讨论</h2>
        <div className="flex gap-2 ml-4">
          <select value={targetScriptId} onChange={e => setTargetScriptId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200">
            <option value="">新建剧本讨论</option>
            {scripts.map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
          </select>
          {!targetScriptId && <input value={targetTitle} onChange={e => setTargetTitle(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 w-40" placeholder="剧本标题（可选）" />}
        </div>
        <div className="ml-auto flex gap-2">
          {configs.map(c => (
            <button key={c.id} onClick={() => useConfigStore.getState().setActiveConfig(c.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${activeConfigId === c.id ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{c.name}</button>
          ))}
        </div>
      </div>

      {selectedScript && (
        <div className="flex-shrink-0 bg-gray-800/50 px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
          当前讨论剧本：<span className="text-gray-300">{selectedScript.title}</span> · 世界观：{selectedScript.worldSetting?.slice(0, 40) || '未设定'}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-sm py-16">
              <div className="text-4xl mb-4">💬</div>
              <p>和 AI 讨论你的剧本创意。切换页面不会丢失进度。</p>
              <p className="text-xs mt-2">讨论中可随时点「📥 应用到剧本」覆盖现有设定。</p>
              {!activeConfigId && <p className="text-red-400 mt-2">请在顶部选择 AI 配置</p>}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {m.role === 'assistant' ? <MarkdownRenderer content={m.content} /> : m.content}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400 animate-pulse">AI 思考中...</div></div>}
          <div ref={endRef} />
        </div>
      </div>

      {detectedChars.length > 0 && targetScriptId && (
        <div className="flex-shrink-0 bg-gray-800/50 border-t border-gray-700 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs text-gray-400 mb-2">👥 检测到 {detectedChars.length} 个角色：</div>
            <div className="flex gap-2 flex-wrap">
              {detectedChars.map((c, i) => (
                <button key={i} onClick={() => handleAddChar(c)} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-purple-900/50 border border-gray-600 hover:border-purple-500 text-gray-300 hover:text-purple-300 rounded-lg">+ {c.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="输入你的剧本想法... (Enter 发送)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-12"
            rows={1} disabled={loading || !activeConfigId} />
          <button onClick={handleUndo} disabled={messages.length < 2 || loading} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-300 rounded-xl text-sm font-medium flex-shrink-0" title="撤回最后一轮对话">↩ 撤回</button>
          <button onClick={handleExtractChars} disabled={extracting || messages.length === 0 || !activeConfigId} className="px-4 py-3 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0">{extracting ? '⏳' : '👥 角色'}</button>
          {targetScriptId && (
            <button onClick={handleApply} disabled={applying || messages.length === 0 || !activeConfigId} className="px-4 py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0">{applying ? '⏳' : '📥 应用'}</button>
          )}
          {!targetScriptId && (
            <button onClick={handleGenerate} disabled={generating || messages.length === 0 || !activeConfigId} className="px-4 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium flex-shrink-0">{generating ? '⏳' : '📝 生成'}</button>
          )}
          <button onClick={handleSend} disabled={!input.trim() || loading || !activeConfigId} className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium flex-shrink-0">发送</button>
        </div>
      </div>
    </div>
  );
}
