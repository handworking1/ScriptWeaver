import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';

interface Props {
  scriptId: string;
  selectedId: string | null;
}

export function CharacterSelector({ scriptId, selectedId }: Props) {
  const [chars, setChars] = useState<any[]>([]);
  const selectCharacter = useNavStore((s) => s.selectCharacter);
  useEffect(() => { window.electronAPI.getCharacters(scriptId).then(setChars).catch(console.error); }, [scriptId]);
  if (chars.length === 0) return <p className="text-xs text-gray-600">该剧本下暂无角色</p>;
  return (
    <div className="flex gap-2 flex-wrap">
      {chars.map((c) => (
        <button key={c.id} onClick={() => selectCharacter(c.id)}
          className={`px-3 py-1.5 rounded-lg text-sm ${selectedId === c.id ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{c.name}</button>
      ))}
    </div>
  );
}
