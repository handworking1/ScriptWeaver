import { useEffect, useState } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { useScriptStore } from '@/stores/scriptStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import { CharacterCard } from '@/components/CharacterCard';
import { generateId } from '@/lib/id';
import type { Character } from '@/types';

export function CharactersPage() {
  const { scripts, loadScripts } = useScriptStore();
  const { activeConfigId } = useConfigStore();
  const { characters, loading, loadCharacters, addCharacter, editCharacter, removeCharacter } = useCharacterStore();
  const { selectedScriptId, selectScript, selectedCharacterId, selectCharacter, navigate } = useNavStore();

  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [showParse, setShowParse] = useState(false);
  const [parseText, setParseText] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [background, setBackground] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [appearance, setAppearance] = useState('');
  const [avatar, setAvatar] = useState('');



  const handleAiComplete = async () => {
    if (!name.trim() || !activeConfigId) return;
    setAiLoading(true);
    try {
      const result = await window.electronAPI.aiComplete(activeConfigId, 'character', {
        name: name.trim(),
        personality,
        background,
        speakingStyle,
        appearance,
      });
      if (result.error) { alert('AI 补全失败：' + result.error); return; }
      if (result.personality) setPersonality(result.personality);
      if (result.background) setBackground(result.background);
      if (result.speakingStyle) setSpeakingStyle(result.speakingStyle);
      if (result.appearance) setAppearance(result.appearance);
    } catch (err: any) {
      alert('AI 补全失败：' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  /** Parse pasted character description into structured fields / 识别人设文本自动填入表单 */
  const handleParseProfile = async () => {
    if (!parseText.trim() || !activeConfigId) return;
    setParseLoading(true);
    try {
      const result = await window.electronAPI.discussSettings(activeConfigId, 'character',
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
          } catch { alert('AI 返回格式异常，请重试'); }
        }
      }
    } catch (err: any) { alert('识别失败：' + err.message); }
    finally { setParseLoading(false); }
  };

  useEffect(() => {
    loadScripts();
  }, []);

  useEffect(() => {
    if (selectedScriptId) {
      loadCharacters(selectedScriptId);
    }
  }, [selectedScriptId]);

  const currentScript = scripts.find((s) => s.id === selectedScriptId);

  const openCreate = () => {
    setEditingCharacter(null);
    setName('');
    setPersonality('');
    setBackground('');
    setSpeakingStyle('');
    setAppearance('');
    setAvatar('');
    setShowParse(false);
    setParseText('');
    setShowForm(true);
  };

  const openEdit = (character: Character) => {
    setEditingCharacter(character);
    setName(character.name);
    setPersonality(character.personality);
    setBackground(character.background);
    setSpeakingStyle(character.speakingStyle);
    setAppearance(character.appearance);
    setAvatar(character.avatar);
    setShowParse(false);
    setParseText('');
    setShowForm(true);
  };

  const handlePickAvatar = async () => {
    const path = await window.electronAPI.pickAvatar();
    if (path) setAvatar(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedScriptId) return;

    if (editingCharacter) {
      await editCharacter(editingCharacter.id, {
        name: name.trim(),
        personality: personality.trim(),
        background: background.trim(),
        speakingStyle: speakingStyle.trim(),
        appearance: appearance.trim(),
        avatar,
      });
    } else {
      await addCharacter({
        id: generateId(),
        scriptId: selectedScriptId,
        name: name.trim(),
        personality: personality.trim(),
        background: background.trim(),
        speakingStyle: speakingStyle.trim(),
        appearance: appearance.trim(),
        avatar,
        createdAt: Date.now(),
      });
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await removeCharacter(id);
    if (selectedCharacterId === id) selectCharacter(null);
  };

  const handleSelect = (id: string) => {
    selectCharacter(id);
  };

  const goToChat = () => {
    if (selectedScriptId && selectedCharacterId) navigate('chat');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">🎭 角色管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              {currentScript ? `剧本：${currentScript.title}` : '请先在剧本管理中选择一个剧本'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
              input.onchange = async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
                try { const d = JSON.parse(await f.text());
                  if (typeof d !== 'object' || !d.name) throw new Error('无效的角色卡：缺少角色名');
                  await addCharacter({ id: generateId(), scriptId: selectedScriptId!, name: String(d.name), personality: String(d.personality||''), background: String(d.background||''), speakingStyle: String(d.speakingStyle||''), appearance: String(d.appearance||''), avatar: String(d.avatar||''), createdAt: Date.now() });
                  alert('导入成功！');
                } catch (err: any) { alert('导入失败：'+err.message); } }; input.click();
            }} disabled={!selectedScriptId}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded-lg text-xs font-medium">📥 导入角色卡</button>
            <button
              onClick={openCreate}
              disabled={!selectedScriptId}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建角色
            </button>
          </div>
        </div>

        {/* Script Selector */}
        {scripts.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {scripts.map((s) => (
              <button
                key={s.id}
                onClick={() => selectScript(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedScriptId === s.id
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">
                {editingCharacter ? '编辑角色' : '新建角色'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-gray-400">姓名 *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAiComplete}
                        disabled={aiLoading || !name.trim() || !activeConfigId}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:text-gray-600"
                      >
                        {aiLoading ? '⏳ 生成中...' : '✨ AI 补全人设'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowParse(v => !v)}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        📝 一键识别人设
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="输入角色名后点击 AI 补全自动生成性格、背景等"
                    required
                  />
                </div>
                {/* Parse profile textarea / 识别人设文本输入区 */}
                {showParse && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      📝 粘贴人物描述（AI 自动识别填入）
                    </label>
                    <textarea
                      value={parseText}
                      onChange={e => setParseText(e.target.value)}
                      className="w-full bg-gray-900 border border-amber-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 h-24 resize-none"
                      placeholder="粘贴任意格式的人物描述，AI 会自动提取姓名、性格、背景、说话风格和外貌。&#10;&#10;例：苏灵儿是青云宗掌门之女，十五岁，性格天真活泼，笑起来有两个酒窝。母亲早逝，父亲严厉，擅长炼丹术。说话喜欢用'呀''呢'语气词..."
                    />
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={handleParseProfile}
                        disabled={parseLoading || !parseText.trim() || !activeConfigId}
                        className="px-3 py-1 text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded"
                      >
                        {parseLoading ? '⏳ 识别中...' : '🤖 开始识别'}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">性格描述</label>
                  <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-20 resize-none"
                    placeholder="如：傲娇、温柔、腹黑..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">背景故事</label>
                  <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-20 resize-none"
                    placeholder="角色的过往经历..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">说话风格（口癖）</label>
                  <input
                    type="text"
                    value={speakingStyle}
                    onChange={(e) => setSpeakingStyle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="如：句尾加喵~、自称本小姐、说话文绉绉..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">外貌描述</label>
                  <textarea
                    value={appearance}
                    onChange={(e) => setAppearance(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                    placeholder="发型、瞳色、服饰..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">头像</label>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={handlePickAvatar}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
                    >
                      选择图片
                    </button>
                    {avatar && (
                      <span className="text-xs text-gray-400 truncate max-w-[200px]">{avatar}</span>
                    )}
                  </div>
                  {avatar && (
                    <div className="mt-2 w-16 h-16 rounded-full overflow-hidden bg-gray-700">
                      <img src={`file://${avatar}`} alt="头像预览" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
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
                    {editingCharacter ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Character List */}
        {!selectedScriptId ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👆</div>
            <p className="text-gray-500">请先在剧本管理中创建剧本，然后选择剧本</p>
          </div>
        ) : loading ? (
          <div className="text-center text-gray-500 py-12">加载中...</div>
        ) : characters.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎭</div>
            <p className="text-gray-500 mb-4">该剧本下还没有角色</p>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建角色
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onSelect={handleSelect}
                  isSelected={selectedCharacterId === character.id}
                />
              ))}
            </div>
            {selectedCharacterId && (
              <div className="mt-6 text-center">
                <button
                  onClick={goToChat}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  → 与「{characters.find((c) => c.id === selectedCharacterId)?.name}」开始对话
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
