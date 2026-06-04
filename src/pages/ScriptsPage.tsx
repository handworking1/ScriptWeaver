import { useEffect, useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import { ScriptCard } from '@/components/ScriptCard';
import { ImportExportButtons } from '@/components/ImportExportButtons';
import { generateId } from '@/lib/id';
import { LorebookEditor } from '@/components/LorebookEditor';
import { NovelImporter } from '@/components/NovelImporter';
import type { Script } from '@/types';

export function ScriptsPage() {
  const { scripts, loading, loadScripts, addScript, editScript, removeScript } = useScriptStore();
  const { activeConfigId } = useConfigStore();
  const { selectedScriptId, selectScript, navigate } = useNavStore();
  const [showForm, setShowForm] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [worldSetting, setWorldSetting] = useState('');
  const [background, setBackground] = useState('');
  const [mainQuests, setMainQuests] = useState('');
  const [sideQuests, setSideQuests] = useState('');
  const [environment, setEnvironment] = useState('');
  const [map, setMap] = useState('');
  const [extraDataText, setExtraDataText] = useState('');
  const [narrativeMode, setNarrativeMode] = useState('mode3');
  const [strictMode, setStrictMode] = useState('strict');
  const [workflowMode, setWorkflowMode] = useState('guided');
  const [recapMode, setRecapMode] = useState('N');
  const [periodicSummary, setPeriodicSummary] = useState('O');
  const [ruleSelfCheck, setRuleSelfCheck] = useState('Y');
  const [banghuiEnabled, setBanghuiEnabled] = useState('N');
  const [styleProfileEnabled, setStyleProfileEnabled] = useState('N');
  const [referenceWorks, setReferenceWorks] = useState('');
  const [eraBackground, setEraBackground] = useState('');
  const [protagonistName, setProtagonistName] = useState('');
  const [protagonistPersonality, setProtagonistPersonality] = useState('');
  const [autoCreateProtagonist, setAutoCreateProtagonist] = useState(true);
  const [protagonistDilemma, setProtagonistDilemma] = useState('');
  const [coreCheat, setCoreCheat] = useState('');
  const [ageRule, setAgeRule] = useState('');
  const [timeline, setTimeline] = useState('');
  const [chapters, setChapters] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lorebook, setLorebook] = useState<{ id: string; keywords: string; content: string }[]>([]);
  const [showExtra, setShowExtra] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  const GENRE_CATEGORIES = [
    { label: '主要题材', tags: ['言情', '玄幻', '仙侠', '悬疑', '推理', '科幻', '奇幻', '脑洞', '都市', '校园', '历史', '古言', '武侠', '军事', '体育', '无CP', '纯爱', '百合', '女频', '男频'] },
    { label: '流派风格', tags: ['轻松', '爆笑', '正剧', '暗黑', '治愈', '热血', '爽文', '虐文', '甜文', '沙雕', '慢热', '快节奏'] },
    { label: '核心情节', tags: ['重生', '穿越', '穿书', '系统', '无限流', '轮回', '复仇', '升级流', '扮猪吃虎', '逆袭', '打脸', '马甲', '替身', '失忆', '契约', '同居', '先婚后爱', '破镜重圆', '追妻火葬场', '追夫火葬场'] },
    { label: '热门设定', tags: ['废柴流', '退婚流', '签到流', '幕后流', '迪化流', '发疯文学', '真假千金', '团宠', '反套路', '第四天灾', '全民觉醒', '灵气复苏', '异能', '数据化', '气运流', '苟道流', '长生流'] },
    { label: '背景职业', tags: ['种田', '宫斗', '宅斗', '权谋', '末世', '娱乐圈', '总裁', '豪门', '灵异', '恐怖', '克苏鲁', '赛博朋克', '星际', '机甲', '商战', '经营', '冒险', '盗墓', '考古', '法医'] },
    { label: '世界观', tags: ['东方玄幻', '西方奇幻', '现代修真', '古代架空', '未来科幻', '末日废土', '平行世界', '异世界', '高武', '高魔', '低魔', '神话'] },
  ];



  const handleAiComplete = async () => {
    if (!title.trim() || !activeConfigId) return;
    setAiLoading(true);
    try {
      const result = await window.electronAPI.aiComplete(activeConfigId, 'script', {
        title: title.trim(), worldSetting, background,
        mainQuests, sideQuests, environment, map, extraData: extraDataText,
      });
      if (result.error) { alert('AI 补全失败：' + result.error); return; }
      if (result.worldSetting) setWorldSetting(result.worldSetting);
      if (result.background) setBackground(result.background);
      if (result.mainQuests) setMainQuests(result.mainQuests);
      if (result.sideQuests) setSideQuests(result.sideQuests);
      if (result.environment) setEnvironment(result.environment);
      if (result.map) setMap(result.map);
      if (result.extraData) setExtraDataText(result.extraData);
    } catch (err: any) { alert('AI 补全失败：' + err.message); }
    finally { setAiLoading(false); }
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const openCreate = () => {
    setEditingScript(null);
    setTitle(''); setWorldSetting(''); setBackground('');
    setMainQuests(''); setSideQuests(''); setEnvironment(''); setMap(''); setExtraDataText('');
    setNarrativeMode('mode3');
    setStrictMode('strict'); setWorkflowMode('guided');
    setRecapMode('N'); setPeriodicSummary('O'); setRuleSelfCheck('Y'); setBanghuiEnabled('N');
    setReferenceWorks(''); setEraBackground(''); setProtagonistDilemma(''); setCoreCheat(''); setAgeRule('');
    setSelectedTags([]); setShowExtra(false);
    setShowForm(true);
  };

  const openEdit = (script: Script) => {
    setEditingScript(script);
    setTitle(script.title);
    setWorldSetting(script.worldSetting);
    setBackground(script.background);
    const ed = script.extraData || {};
    setMainQuests(ed.mainQuests || '');
    setSideQuests(ed.sideQuests || '');
    setEnvironment(ed.environment || '');
    setMap(ed.map || '');
    setExtraDataText(ed.data || '');
    setNarrativeMode(ed.narrativeMode || 'mode3');
    setStrictMode(ed.strictMode || 'strict');
    setWorkflowMode(ed.workflowMode || 'guided');
    setRecapMode(ed.recapMode || 'N');
    setPeriodicSummary(ed.periodicSummary || 'O');
    setRuleSelfCheck(ed.ruleSelfCheck || 'Y');
    setBanghuiEnabled(ed.banghuiEnabled || 'N');
    setReferenceWorks(ed.referenceWorks || '');
    setEraBackground(ed.eraBackground || '');
    setProtagonistDilemma(ed.protagonistDilemma || '');
    setCoreCheat(ed.coreCheat || '');
    setAgeRule(ed.ageRule || '');
    setTimeline(ed.timeline || '');
    setChapters(ed.chapters || '');
    setSelectedTags(ed.tags ? ed.tags.split(',').filter(Boolean) : []);
    setLorebook(Array.isArray(ed.lorebook) ? ed.lorebook : []);
    setStyleProfileEnabled(ed.styleProfileEnabled || 'N');
    setProtagonistName(ed.protagonistName || '');
    setProtagonistPersonality(ed.protagonistPersonality || '');
    setShowExtra(false);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const extraData = {
      mainQuests: mainQuests.trim(),
      sideQuests: sideQuests.trim(),
      environment: environment.trim(),
      map: map.trim(),
      data: extraDataText.trim(),
      narrativeMode,
      tags: selectedTags.join(','),
      referenceWorks: referenceWorks.trim(),
      eraBackground: eraBackground.trim(),
      protagonistDilemma: protagonistDilemma.trim(),
      coreCheat: coreCheat.trim(),
      ageRule: ageRule.trim(),
      timeline: timeline.trim(),
      chapters: chapters.trim(),
      strictMode, workflowMode, recapMode, periodicSummary, ruleSelfCheck, banghuiEnabled,
      styleProfileEnabled,
      protagonistName, protagonistPersonality,
      lorebook,
    };

    /** Try/catch guards against missing DB columns or constraint violations.
     *  try/catch 保护：防止数据库缺失列或约束违规导致崩溃。 */
    try {
      if (editingScript) {
        await editScript(editingScript.id, {
          title: title.trim(), worldSetting: worldSetting.trim(), background: background.trim(),
          extraData,
        });
      } else {
        const newId = generateId();
        const now = Date.now();
        await addScript({
          id: newId,
          title: title.trim(),
          worldSetting: worldSetting.trim(),
          background: background.trim(),
          extraData,
          createdAt: now,
          updatedAt: now,
        });
        // Auto-create protagonist character / 自动创建主角
        if (autoCreateProtagonist && protagonistName.trim()) {
          try {
            await window.electronAPI.createCharacter({
              id: generateId(), scriptId: newId,
              name: protagonistName.trim(), personality: protagonistPersonality.trim(),
              background: '', speakingStyle: '', appearance: '', avatar: '',
              createdAt: Date.now(),
            } as any);
          } catch { /* non-critical */ }
        }
      }
      setShowForm(false);
    } catch (err: any) {
      alert('保存失败：' + (err.message || String(err)));
    }
  };

  const handleDelete = async (id: string) => {
    try { await removeScript(id); if (selectedScriptId === id) selectScript(null); }
    catch (err: any) { alert('删除失败：' + (err.message || '未知错误')); }
  };

  const handleSelect = (id: string) => {
    selectScript(id);
  };

  const goToCharacters = () => {
    if (selectedScriptId) navigate('characters');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">📜 剧本管理</h2>
            <p className="text-sm text-gray-500 mt-1">创建和管理你的故事剧本</p>
          </div>
          <div className="flex gap-2">
            <ImportExportButtons />
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建剧本
            </button>
            <button onClick={() => setShowImporter(v => !v)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors">
              📤 从小说提取
            </button>
          </div>
        </div>

        {showImporter && <NovelImporter configId={activeConfigId} scriptId={editingScript?.id || null} onExtract={(fields: any) => {
          if (fields.title) setTitle(fields.title);
          if (fields.worldSetting) setWorldSetting(fields.worldSetting);
          if (fields.background) setBackground(fields.background);
          if (fields.tags) setSelectedTags(fields.tags.split(/[,，]/).filter(Boolean));
          if (fields.mainQuests) setMainQuests(fields.mainQuests);
          if (fields.sideQuests) setSideQuests(fields.sideQuests);
          if (fields.referenceWorks) setReferenceWorks(fields.referenceWorks);
          if (fields.eraBackground) setEraBackground(fields.eraBackground);
          if (fields.protagonistDilemma) setProtagonistDilemma(fields.protagonistDilemma);
          if (fields.coreCheat) setCoreCheat(fields.coreCheat);
          if (fields.chapters) setChapters(fields.chapters);
          if (fields.environment) setEnvironment(fields.environment);
          if (fields.map) setMap(fields.map);
          if (fields.data) setExtraDataText(fields.data);
          if (fields.timeline) setTimeline(fields.timeline);
          if (fields.ageRule) setAgeRule(fields.ageRule);
          if (Array.isArray(fields.lorebook)) {
            setLorebook(prev => [...prev, ...fields.lorebook.map((item: any) =>
              ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), keywords: item.keywords || '', content: item.content || '' }))]);
          }
          setShowImporter(false);
          setShowForm(true);
        }} />}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">
                {editingScript ? '编辑剧本' : '新建剧本'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-gray-400">标题 *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { if (activeConfigId) navigate('aiDiscuss'); }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        💬 讨论
                      </button>
                      <button
                        type="button"
                        onClick={handleAiComplete}
                        disabled={aiLoading || !title.trim() || !activeConfigId}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:text-gray-600"
                      >
                        {aiLoading ? '⏳ 生成中...' : '✨ AI 补全'}
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="输入标题后点击 AI 补全自动生成世界观和背景"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">创作模式</label>
                    <select value={narrativeMode} onChange={(e) => setNarrativeMode(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200">
                      <option value="mode1">模式1 · 沉浸式角色扮演</option>
                      <option value="mode2">模式2 · 上帝视角共同创作</option>
                      <option value="mode3">模式3 · 混合模式</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">世界观</label>
                  <input
                    type="text"
                    value={worldSetting}
                    onChange={(e) => setWorldSetting(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="如：赛博朋克2077、仙侠修真世界"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">故事背景</label>
                  <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-28 resize-none"
                    placeholder="详细的故事背景描述..."
                  />
                </div>

                {/* Genre tags */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    类型标签 {selectedTags.length > 0 && <span className="text-purple-400">（{selectedTags.length}个已选）</span>}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                    {GENRE_CATEGORIES.map((cat) => (
                      <div key={cat.label}>
                        <div className="text-xs text-gray-600 mb-1">{cat.label}</div>
                        <div className="flex gap-1 flex-wrap">
                          {cat.tags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setSelectedTags(isSelected ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag])}
                                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-purple-900/60 text-purple-300 border-purple-500/60'
                                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expandable extra fields */}
                <button type="button" onClick={() => setShowExtra(!showExtra)}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                  {showExtra ? '▼' : '▶'} 更多设定（主线/支线/环境/地图）
                </button>
                {showExtra && (
                  <div className="space-y-4 pl-2 border-l-2 border-gray-700">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">主线任务</label>
                      <textarea value={mainQuests} onChange={(e) => setMainQuests(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="主要剧情线索和目标..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">支线任务</label>
                      <textarea value={sideQuests} onChange={(e) => setSideQuests(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="可选的分支剧情..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">环境描述</label>
                      <textarea value={environment} onChange={(e) => setEnvironment(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="气候、地理、建筑风格、科技水平等..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">地图</label>
                      <textarea value={map} onChange={(e) => setMap(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="区域划分、关键地点、路径等..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">数据/其他设定</label>
                      <textarea value={extraDataText} onChange={(e) => setExtraDataText(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="势力关系、等级系统、货币、特殊规则等..." />
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <LorebookEditor entries={lorebook} onChange={setLorebook} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">对标作品</label>
                      <input type="text" value={referenceWorks} onChange={(e) => setReferenceWorks(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500"
                        placeholder="1-3部对标作品，用逗号分隔，如：斗破苍穹,凡人修仙传" />
                      <p className="text-xs text-gray-600 mt-0.5">AI将学习对标作品的文风、世界观和情节模式</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">时代背景</label>
                      <input type="text" value={eraBackground} onChange={(e) => setEraBackground(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500"
                        placeholder="如：近未来赛博朋克2077年、古代架空仙侠世界" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">主角极限困境（多层级绝境）</label>
                      <textarea value={protagonistDilemma} onChange={(e) => setProtagonistDilemma(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="宏观(天灾/战争)+中观(权贵压榨)+微观(平民苦难)+个人(主角承受最直接后果)" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">核心信息差（金手指）</label>
                      <textarea value={coreCheat} onChange={(e) => setCoreCheat(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 h-12 resize-none"
                        placeholder="主角独有的信息、能力或系统，如：重生机密、签到系统、能看见古董气运的异能" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">适用年龄规则</label>
                      <input type="text" value={ageRule} onChange={(e) => setAgeRule(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500"
                        placeholder="如：18+、全年龄、16+（覆盖默认值）" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">事件时间线</label>
                      <textarea value={timeline} onChange={(e) => setTimeline(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="按时间顺序列出关键事件，如：第1章：主角觉醒金手指 → 第2章：第一次打脸反派 → ..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">章节/幕管理</label>
                      <textarea value={chapters} onChange={(e) => setChapters(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                        placeholder="卷/幕/章节划分，如：第一卷：崛起之路\n  第1章：废柴觉醒\n  第2章：初露锋芒\n第二卷：宗门风云..." />
                    </div>
                    <div className="border-t border-gray-700 pt-3 mt-2">
                      <label className="block text-xs text-gray-500 mb-2">系统执行模式</label>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">执行严格度</span>
                            <select value={strictMode} onChange={(e) => setStrictMode(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="strict">严格模式</option>
                              <option value="loose">宽松模式</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">严格：100%遵守描写规范与内容限制；宽松：优先核心方法论，微规则可灵活偏离</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">工作流模式</span>
                            <select value={workflowMode} onChange={(e) => setWorkflowMode(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="guided">引导模式</option>
                              <option value="flexible">灵活启动模式</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">引导：严格走完十二步；灵活：可从任意步骤开始但需提供前置产出</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">前情提要</span>
                            <select value={recapMode} onChange={(e) => setRecapMode(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="N">不开启</option>
                              <option value="Y">开启</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">开启后每次回复含前情提要和剧情引导，帮助推进主线</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">定期总结</span>
                            <select value={periodicSummary} onChange={(e) => setPeriodicSummary(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="O">开启</option>
                              <option value="P">不开启</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">AI每10轮对话进行一次内部剧情总结，确保长线记忆一致性</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">文风模仿</span>
                            <select value={styleProfileEnabled} onChange={(e) => setStyleProfileEnabled(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="N">不开启</option>
                              <option value="Y">开启</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">从小说提取文风后，开启此选项让AI模仿该风格写作。在「📤从小说提取→📝分析文风」中生成</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">规则自检</span>
                            <select value={ruleSelfCheck} onChange={(e) => setRuleSelfCheck(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="Y">开启</option>
                              <option value="N">不开启</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">生成超3000字或完成工作流步骤后内部检查规则是否偏离并修正</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-400">帮回辅助系统</span>
                            <select value={banghuiEnabled} onChange={(e) => setBanghuiEnabled(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200">
                              <option value="N">关闭</option>
                              <option value="Y">开启</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-600">开启[帮回]核心辅助系统：帮回剧情总结/章节规划/爽点分析/人设检查/主动/被动/黑暗/推进等指令</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {editingScript ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Script List */}
        {loading ? (
          <div className="text-center text-gray-500 py-12">加载中...</div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📜</div>
            <p className="text-gray-500 mb-4">还没有剧本，点击上方按钮创建第一个</p>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建剧本
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scripts.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onSelect={handleSelect}
                  isSelected={selectedScriptId === script.id}
                />
              ))}
            </div>
            {selectedScriptId && (
              <div className="mt-6 text-center">
                <button
                  onClick={goToCharacters}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  → 管理「{scripts.find((s) => s.id === selectedScriptId)?.title}」的角色
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
