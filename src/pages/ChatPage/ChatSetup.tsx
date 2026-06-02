import { useEffect, useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';
import { useChatStore } from '@/stores/chatStore';
import { CharacterSelector } from './CharacterSelector';

interface Props {
  chatMode: '1v1' | 'world';
  setChatMode: (m: '1v1' | 'world') => void;
  selectedScriptId: string | null;
  selectedCharacterId: string | null;
  activeConfigId: string | null;
  activeTemplateId: string | null;
  replyLength: string;
  setReplyLength: (v: any) => void;
  interactionOpts: string;
  setInteractionOpts: (v: any) => void;
  onStart: () => void;
}

export function ChatSetup({
  chatMode, setChatMode, selectedScriptId, selectedCharacterId, activeConfigId,
  activeTemplateId, replyLength, setReplyLength, interactionOpts, setInteractionOpts, onStart,
}: Props) {
  const { scripts } = useScriptStore();
  const { configs } = useConfigStore();
  const { templates } = useTemplateStore();
  const selectScript = useNavStore((s) => s.selectScript);
  const selectCharacter = useNavStore((s) => s.selectCharacter);
  const setActiveTemplate = useTemplateStore((s) => s.setActiveTemplate);
  const setActiveConfig = useConfigStore((s) => s.setActiveConfig);
  const navigate = useNavStore((s) => s.navigate);

  const [recentConvs, setRecentConvs] = useState<any[]>([]);
  useEffect(() => {
    if (selectedScriptId) {
      window.electronAPI.getConversations(selectedScriptId).then(c => setRecentConvs(c.slice(0, 5)));
    } else { setRecentConvs([]); }
  }, [selectedScriptId]);

  const resumeConv = async (convId: string) => {
    const conv = await window.electronAPI.getConversation(convId);
    if (!conv) return;
    selectScript(conv.scriptId);
    selectCharacter(conv.characterId || null);
    useChatStore.getState().setActiveConversation(convId);
    useChatStore.getState().loadMessages(convId);
    navigate('chat');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto mt-20">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">开始聊天</h2>
          <p className="text-sm text-gray-500">选择剧本、角色、提示词模板和 AI 配置</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">选择剧本</label>
            <div className="flex gap-2 flex-wrap">
              {scripts.map((s) => (
                <button key={s.id} onClick={() => { selectScript(s.id); selectCharacter(null); }}
                  className={`px-3 py-1.5 rounded-lg text-sm ${selectedScriptId === s.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setChatMode('1v1')} className={`flex-1 py-2 rounded-lg text-sm ${chatMode === '1v1' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>💬 角色对话</button>
            <button onClick={() => setChatMode('world')} className={`flex-1 py-2 rounded-lg text-sm ${chatMode === 'world' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>🌍 世界参与</button>
          </div>

          {chatMode === '1v1' && selectedScriptId && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">选择角色</label>
              <CharacterSelector scriptId={selectedScriptId} selectedId={selectedCharacterId || null} />
            </div>
          )}

          {chatMode === '1v1' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">提示词模板</label>
              <div className="flex gap-2 flex-wrap">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => setActiveTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${activeTemplateId === t.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">AI 配置</label>
            <div className="flex gap-2 flex-wrap">
              {configs.map((c) => (
                <button key={c.id} onClick={() => setActiveConfig(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${activeConfigId === c.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">回复长度</label>
              <select value={replyLength} onChange={(e) => setReplyLength(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-200">
                <option value="A">A · 3000+字</option><option value="B">B · 1500字</option>
                <option value="C">C · 800字</option><option value="D">D · 自主决定</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">互动选项</label>
              <select value={interactionOpts} onChange={(e) => setInteractionOpts(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-200">
                <option value="F">F · 不提供</option><option value="T">T · 提供选项</option>
              </select>
            </div>
          </div>

          <button onClick={onStart}
            disabled={chatMode === '1v1' ? !selectedScriptId || !selectedCharacterId || !activeConfigId : !selectedScriptId || !activeConfigId}
            className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium">
            {chatMode === 'world' ? '🌍 我要去了' : '我要去了'}
          </button>

          {recentConvs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">或继续之前的对话：</div>
              <div className="space-y-1">
                {recentConvs.map((c: any) => (
                  <button key={c.id} onClick={() => resumeConv(c.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                    <div className="truncate">{c.title || '未命名'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{new Date(c.updatedAt).toLocaleString('zh-CN')}{c.parentId ? ' · 🔀分支' : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
