/**
 * Compact character settings panel for AI discuss page.
 * 紧凑角色设置面板 — AI 讨论页随时调整角色。
 * Loads existing characters for the selected script, allows inline edit/add/delete.
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
  collapsed: boolean;
  onToggle: () => void;
}

export function DiscussCharacterPanel({ scriptId, collapsed, onToggle }: Props) {
  const [chars, setChars] = useState<Character[]>([]);
  const [newName, setNewName] = useState('');
  const [newPersonality, setNewPersonality] = useState('');

  useEffect(() => { load(); }, [scriptId]);

  const load = async () => {
    if (!scriptId) return;
    try {
      const list = await window.electronAPI.getCharacters(scriptId);
      setChars(list);
    } catch (err) { console.error('[charPanel] load:', err); }
  };

  const addChar = async () => {
    if (!newName.trim()) return;
    try {
      await window.electronAPI.createCharacter({
        id: generateId(),
        scriptId,
        name: newName.trim(),
        personality: newPersonality.trim(),
        background: '',
        speakingStyle: '',
        appearance: '',
        avatar: '',
        createdAt: Date.now(),
      } as any);
      setNewName('');
      setNewPersonality('');
      load();
    } catch (err: any) { console.error('[charPanel] add:', err); }
  };

  const updateName = async (id: string, name: string) => {
    setChars(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    await window.electronAPI.updateCharacter(id, { name });
  };

  const updatePersonality = async (id: string, personality: string) => {
    setChars(prev => prev.map(c => c.id === id ? { ...c, personality } : c));
    await window.electronAPI.updateCharacter(id, { personality });
  };

  const removeChar = async (id: string) => {
    await window.electronAPI.deleteCharacter(id);
    setChars(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
      {/* Header toggle */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-1.5 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-750 transition-colors"
      >
        <span className={`transform transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        <span>🎭 角色设置</span>
        <span className="text-gray-600">({chars.length})</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {/* Quick add bar / 快速添加栏 */}
          <div className="flex gap-2 items-center">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addChar(); }}
              placeholder="角色名"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 w-24 focus:outline-none focus:border-purple-500"
            />
            <input
              value={newPersonality}
              onChange={e => setNewPersonality(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addChar(); }}
              placeholder="性格"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 flex-1 focus:outline-none focus:border-purple-500"
            />
            <button onClick={addChar} className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded flex-shrink-0">
              + 添加
            </button>
          </div>

          {/* Character list / 角色列表 */}
          {chars.length === 0 ? (
            <div className="text-xs text-gray-600">暂无角色，上方快速添加</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {chars.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 bg-gray-900 rounded px-2 py-1">
                  <input
                    value={c.name}
                    onChange={e => updateName(c.id, e.target.value)}
                    className="bg-transparent text-xs text-gray-200 w-20 focus:outline-none border-b border-transparent focus:border-purple-500"
                  />
                  <input
                    value={c.personality}
                    onChange={e => updatePersonality(c.id, e.target.value)}
                    className="bg-transparent text-xs text-gray-500 flex-1 focus:outline-none border-b border-transparent focus:border-purple-500"
                    placeholder="性格..."
                  />
                  <button onClick={() => removeChar(c.id)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
