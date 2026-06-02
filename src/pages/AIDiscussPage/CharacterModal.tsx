/**
 * Character management modal — full CRUD like CharactersPage.
 * 角色管理弹窗 — 完整的角色增删改查，与角色管理页功能一致。
 */
import { useEffect, useState } from 'react';
import { generateId } from '@/lib/id';

interface Character {
  id: string;
  scriptId: string;
  name: string;
  personality: string;
  background: string;
  speakingStyle: string;
  appearance: string;
  avatar: string;
  createdAt: number;
}

interface Props {
  scriptId: string;
  configId: string | null;
  onClose: () => void;
}

export function CharacterModal({ scriptId, configId, onClose }: Props) {
  const [chars, setChars] = useState<Character[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state / 表单状态
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [background, setBackground] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [appearance, setAppearance] = useState('');

  // AI parse state / AI识别状态
  const [parseLoading, setParseLoading] = useState(false);
  const [showParse, setShowParse] = useState(false);
  const [parseText, setParseText] = useState('');

  useEffect(() => { load(); }, [scriptId]);

  const load = async () => {
    try { setChars(await window.electronAPI.getCharacters(scriptId)); }
    catch (err) { console.error('[charModal] load:', err); }
  };

  const resetForm = () => {
    setName(''); setPersonality(''); setBackground(''); setSpeakingStyle(''); setAppearance('');
    setEditingId(null); setShowParse(false); setParseText('');
  };

  const openCreate = () => { resetForm(); };

  const openEdit = (c: Character) => {
    setEditingId(c.id);
    setName(c.name);
    setPersonality(c.personality);
    setBackground(c.background);
    setSpeakingStyle(c.speakingStyle);
    setAppearance(c.appearance);
    setShowParse(false);
  };

  /** Parse pasted character description into form fields / 识别人设文本 */
  const handleParse = async () => {
    if (!parseText.trim() || !configId) return;
    setParseLoading(true);
    try {
      const result = await window.electronAPI.discussSettings(configId, 'character',
        { name: '', personality: '', background: '', speakingStyle: '', appearance: '' },
        [{ role: 'system', content: `从以下人物描述中提取角色信息，只输出JSON：\n{"name":"角色名","personality":"性格","background":"背景故事","speakingStyle":"说话风格","appearance":"外貌"}\n\n描述：${parseText.trim()}` }]);
      if (result.reply) {
        const match = result.reply.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const data = JSON.parse(match[0]);
            if (data.name) setName(data.name);
            if (data.personality) setPersonality(data.personality);
            if (data.background) setBackground(data.background);
            if (data.speakingStyle) setSpeakingStyle(data.speakingStyle);
            if (data.appearance) setAppearance(data.appearance);
            setParseText('');
            setShowParse(false);
          } catch { /* ignore */ }
        }
      }
    } catch (err) { console.error('[charModal] parse:', err); }
    finally { setParseLoading(false); }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const data = {
      id: editingId || generateId(),
      scriptId,
      name: name.trim(),
      personality: personality.trim(),
      background: background.trim(),
      speakingStyle: speakingStyle.trim(),
      appearance: appearance.trim(),
      avatar: '',
      createdAt: Date.now(),
    };
    if (editingId) {
      await window.electronAPI.updateCharacter(editingId, data);
    } else {
      await window.electronAPI.createCharacter(data as any);
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个角色？')) return;
    await window.electronAPI.deleteCharacter(id);
    if (editingId === id) resetForm();
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">🎭 角色管理</h2>
            <p className="text-xs text-gray-500 mt-0.5">{chars.length} 个角色</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
        </div>

        {/* Body: list + form */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: character list / 角色列表 */}
          <div className="w-48 border-r border-gray-700 overflow-y-auto p-3 space-y-1 flex-shrink-0">
            {chars.map(c => (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  editingId === c.id
                    ? 'bg-purple-900/40 text-purple-300'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={openCreate}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                editingId === null ? 'bg-purple-900/40 text-purple-300' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              + 新建角色
            </button>
          </div>

          {/* Right: edit form / 编辑表单 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {editingId === null && !name ? (
              <div className="text-center text-gray-600 text-sm py-8">
                左侧选择角色编辑，或点击「+ 新建角色」
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">姓名 *</label>
                  <button onClick={() => setShowParse(v => !v)}
                    className="text-xs text-amber-400 hover:text-amber-300">
                    📝 一键识别人设
                  </button>
                </div>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  placeholder="角色名" />

                {showParse && (
                  <div>
                    <textarea value={parseText} onChange={e => setParseText(e.target.value)}
                      className="w-full bg-gray-900 border border-amber-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 h-20 resize-none"
                      placeholder="粘贴任意格式的人物描述..." />
                    <button onClick={handleParse} disabled={parseLoading || !parseText.trim()}
                      className="mt-1 px-3 py-1 text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded">
                      {parseLoading ? '⏳' : '🤖 识别'}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">性格描述</label>
                  <textarea value={personality} onChange={e => setPersonality(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                    placeholder="如：傲娇、温柔、腹黑..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">背景故事</label>
                  <textarea value={background} onChange={e => setBackground(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                    placeholder="过往经历..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">说话风格（口癖）</label>
                  <input value={speakingStyle} onChange={e => setSpeakingStyle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="如：句尾加喵~、自称本小姐..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">外貌描述</label>
                  <input value={appearance} onChange={e => setAppearance(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="发型、瞳色、服饰..." />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSubmit}
                    className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                    {editingId ? '💾 保存修改' : '➕ 创建角色'}
                  </button>
                  {editingId && (
                    <button onClick={() => handleDelete(editingId)}
                      className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg">
                      🗑 删除
                    </button>
                  )}
                  <button onClick={resetForm}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
