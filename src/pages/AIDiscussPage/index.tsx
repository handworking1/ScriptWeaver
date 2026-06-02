import { useEffect, useState, useRef } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { DiscussManagePanel } from './DiscussManagePanel';
import { DiscussActionBar } from './DiscussActionBar';
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
  const [openScriptIds, setOpenScriptIds] = useState<string[]>([]);
  const [charName, setCharName] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadScripts();
    // Restore last-used script ID
    (async () => {
      try {
        const lastId = await window.electronAPI.getSetting('discuss_last_script');
        const tabs = await window.electronAPI.getSetting('discuss_open_tabs');
        if (tabs) {
          const parsed = JSON.parse(tabs);
          setOpenScriptIds(parsed);
        } else if (lastId) {
          setOpenScriptIds([lastId]);
        }
        if (lastId) setTargetScriptId(lastId);
      } catch {}
    })();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Persist messages on change + save on unmount
  useEffect(() => {
    const key = DISCUSS_KEY_PREFIX + (targetScriptId || '_new_');
    window.electronAPI.setSetting(key, JSON.stringify({ title: targetTitle, msgs: messages }));
    return () => {
      // Force save on unmount (cleanup fires before next mount)
      window.electronAPI.setSetting(key, JSON.stringify({ title: targetTitle, msgs: messages }));
    };
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
      } catch (err) { console.error('[discuss] load:', err); setMessages([]); }
    })();
  }, [targetScriptId]);

  const selectedScript = scripts.find((s) => s.id === targetScriptId);

  /** Add a script tab + persist; when generating a new script, the caller adds it here.
   *  打开脚本标签页并持久化；生成新剧本时由调用方添加。
   *  Uses functional updater to avoid stale-closure race / 使用函数式更新防止闭包过期。 */
  const openScript = (id: string) => {
    setTargetScriptId(id);
    window.electronAPI.setSetting('discuss_last_script', id);
    setOpenScriptIds(prev => {
      const updated = id && !prev.includes(id) ? [...prev, id] : prev;
      window.electronAPI.setSetting('discuss_open_tabs', JSON.stringify(updated));
      return updated;
    });
  };
  /** Close a script tab; if it was active, switch to the last remaining one.
   *  关闭脚本标签页；如果当前是活跃标签，回退到最后一个剩余标签。
   *  Uses functional updater to avoid stale-closure race / 使用函数式更新防止闭包过期。 */
  const closeScript = (id: string) => {
    setOpenScriptIds(prev => {
      const updated = prev.filter(s => s !== id);
      window.electronAPI.setSetting('discuss_open_tabs', JSON.stringify(updated));
      if (targetScriptId === id) {
        const next = updated.length > 0 ? updated[updated.length - 1] : '';
        setTargetScriptId(next);
      }
      return updated;
    });
  };

  // Sync editFields when script changes (all extraData fields)
  useEffect(() => {
    if (!selectedScript) { setEditFields({}); return; }
    const ed = selectedScript.extraData || {} as any;
    setEditFields({
      title: selectedScript.title || '',
      worldSetting: selectedScript.worldSetting || '',
      background: selectedScript.background || '',
      mainQuests: ed.mainQuests || '',
      sideQuests: ed.sideQuests || '',
      environment: ed.environment || '',
      map: ed.map || '',
      data: ed.data || '',
      timeline: ed.timeline || '',
      chapters: ed.chapters || '',
      tags: ed.tags || '',
      referenceWorks: ed.referenceWorks || '',
      eraBackground: ed.eraBackground || '',
      protagonistDilemma: ed.protagonistDilemma || '',
      coreCheat: ed.coreCheat || '',
      ageRule: ed.ageRule || '',
      narrativeMode: ed.narrativeMode || 'mode3',
      strictMode: ed.strictMode || 'strict',
      workflowMode: ed.workflowMode || 'guided',
      recapMode: ed.recapMode || 'N',
      periodicSummary: ed.periodicSummary || 'O',
      ruleSelfCheck: ed.ruleSelfCheck || 'Y',
      banghuiEnabled: ed.banghuiEnabled || 'N',
    });
  }, [selectedScript?.id, selectedScript?.title, selectedScript?.worldSetting, selectedScript?.background, JSON.stringify(selectedScript?.extraData)]);

  // ── Save manual edits ───────────────────────────
  const handleSaveManual = async () => {
    if (!targetScriptId) return;
    await editScript(targetScriptId, {
      title: editFields.title,
      worldSetting: editFields.worldSetting,
      background: editFields.background,
      extraData: {
        ...selectedScript?.extraData,
        mainQuests: editFields.mainQuests,
        sideQuests: editFields.sideQuests,
        environment: editFields.environment,
        map: editFields.map,
        data: editFields.data,
        timeline: editFields.timeline,
        chapters: editFields.chapters,
        tags: editFields.tags,
        referenceWorks: editFields.referenceWorks,
        eraBackground: editFields.eraBackground,
        protagonistDilemma: editFields.protagonistDilemma,
        coreCheat: editFields.coreCheat,
        ageRule: editFields.ageRule,
        narrativeMode: editFields.narrativeMode,
        strictMode: editFields.strictMode,
        workflowMode: editFields.workflowMode,
        recapMode: editFields.recapMode,
        periodicSummary: editFields.periodicSummary,
        ruleSelfCheck: editFields.ruleSelfCheck,
        banghuiEnabled: editFields.banghuiEnabled,
      } as any,
    });
    await loadScripts();
  };

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
          try { data = JSON.parse(match[0]); } catch (err) { console.error('[apply] parse error:', err); setApplying(false); return; }
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
        if (match) { try { setDetectedChars(JSON.parse(match[0])); } catch (err) { console.error('[extractChars] parse:', err); } }
        else { setMessages(prev => [...prev, { role: 'assistant', content: '❌ 未检测到角色信息' }]); }
      }
    } catch (err) { console.error('[extractChars]', err); }
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
    const prompt = `根据以上讨论和以下约束，生成完整剧本设定JSON。只输出JSON：{"title":"标题","worldSetting":"世界观","background":"背景","mainQuests":"主线","sideQuests":"支线","environment":"环境","map":"地图","data":"其他"}
严格约束（留空表示尚未设定）：
标题「${editFields.title || targetTitle || '未定'}」
世界观「${editFields.worldSetting || ''}」
背景「${editFields.background || ''}」
对标「${editFields.referenceWorks || ''}」
时代「${editFields.eraBackground || ''}」
主线「${editFields.mainQuests || ''}」
支线「${editFields.sideQuests || ''}」
金手指「${editFields.coreCheat || ''}」
大纲「${editFields.chapters || ''}」`;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'script', getFields(), [...history, { role: 'user' as const, content: prompt }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*?\}/);
        if (match) {
          let data: any; try { data = JSON.parse(match[0]); } catch (err) { console.error('[generate] parse:', err); setMessages([...messages, { role: 'assistant', content: '❌ 格式异常，重试' }]); setGenerating(false); return; }
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
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-100">💬 AI 剧本讨论</h2>
        <div className="flex gap-1.5 flex-wrap">
          {openScriptIds.map(id => {
            const s = scripts.find(x => x.id === id);
            return (
              <span key={id} className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs rounded cursor-pointer ${targetScriptId === id ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                <span onClick={() => setTargetScriptId(id)}>{s?.title || id}</span>
                <button onClick={() => closeScript(id)} className="text-gray-600 hover:text-red-400 ml-0.5">×</button>
              </span>
            );
          })}
          {!targetScriptId && (
            <span className="inline-flex items-center gap-0.5 px-2 py-1 text-xs rounded bg-purple-900/50 text-purple-300">
              新建讨论
            </span>
          )}
          <button onClick={() => { setTargetScriptId(''); setMessages([]); setTargetTitle(''); }} className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200">+</button>
          <select value="" onChange={e => { if (e.target.value) openScript(e.target.value); }}
            className="bg-gray-700 text-gray-400 hover:bg-gray-600 rounded px-1 py-0.5 text-xs">
            <option value="">全部剧本▾</option>
            {scripts.filter(s => !openScriptIds.includes(s.id)).map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-1.5 flex-wrap">
          <span className="text-xs text-gray-600 self-center mr-1">AI:</span>
          {configs.map(c => (
            <button key={c.id} onClick={() => useConfigStore.getState().setActiveConfig(c.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${activeConfigId === c.id ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Always-visible character quick-create */}
      {targetScriptId && (
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
          <div className="max-w-3xl mx-auto flex gap-2 items-center">
            <span className="text-xs text-gray-500 flex-shrink-0">🎭 角色:</span>
            <input value={charName} onChange={e => setCharName(e.target.value)} placeholder="名称" className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 w-20" />
            <input value={charPersonality} onChange={e => setCharPersonality(e.target.value)} placeholder="性格" className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 flex-1" />
            <button onClick={async () => {
              if (!charName.trim()) return;
              await window.electronAPI.createCharacter({ id: generateId(), scriptId: targetScriptId, name: charName.trim(), personality: charPersonality.trim(), background: '', speakingStyle: '', appearance: '', avatar: '', createdAt: Date.now() } as any);
              setCharName(''); setCharPersonality('');
            }} className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded flex-shrink-0">+ 添加</button>
          </div>
        </div>
      )}

      {/* Inline manage panel — extracted to sub-component for maintainability / 内联管理面板已抽取为子组件 */}
      {selectedScript && (
        <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 max-h-52 overflow-y-auto">
          <DiscussManagePanel editFields={editFields} setEditFields={setEditFields} onSave={handleSaveManual} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-gray-500 text-sm mb-6">和 AI 讨论你的剧本创意。切换页面不会丢失进度。</p>
              {!activeConfigId ? (
                <p className="text-red-400 text-sm">请在顶部选择 AI 配置</p>
              ) : (
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  <button
                    onClick={() => { setInput('帮我想一个世界观'); setMessages([]); }}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-500/50 text-gray-300 hover:text-purple-300 rounded-xl transition-colors text-left"
                  >
                    🎯 帮我想一个世界观
                  </button>
                  <button
                    onClick={() => { setInput('帮我设计一个主角，包括性格、背景故事和说话风格'); setMessages([]); }}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-500/50 text-gray-300 hover:text-purple-300 rounded-xl transition-colors text-left"
                  >
                    👤 帮我设计一个主角
                  </button>
                  <button
                    onClick={() => { setInput('根据当前剧本设定，帮我规划主线任务和章节划分'); setMessages([]); }}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-500/50 text-gray-300 hover:text-purple-300 rounded-xl transition-colors text-left"
                  >
                    📖 帮我规划剧情结构
                  </button>
                </div>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm break-words overflow-hidden ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
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

      <DiscussActionBar
        input={input} setInput={setInput}
        loading={loading} generating={generating} extracting={extracting} applying={applying}
        targetScriptId={targetScriptId} messagesLen={messages.length} activeConfigId={activeConfigId}
        onSend={handleSend} onUndo={handleUndo} onExtractChars={handleExtractChars}
        onApply={handleApply} onGenerate={handleGenerate}
      />
    </div>
  );
}
