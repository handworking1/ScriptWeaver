import { useState } from 'react';
import type { Character } from '@/types';

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function CharacterCard({ character, onEdit, onDelete, onSelect, isSelected }: CharacterCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all hover:border-purple-500/50 ${
        isSelected ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-gray-700'
      }`}
      onClick={() => onSelect(character.id)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
          {character.avatar ? (
            <img src={`file://${character.avatar}`} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <span>{character.name.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-100">{character.name}</h3>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(character)}
                className="text-gray-500 hover:text-blue-400 p-1 text-xs"
                title="编辑"
              >
                ✏️
              </button>
              {confirmDelete ? (
                <span className="flex gap-1">
                  <button
                    onClick={() => { onDelete(character.id); setConfirmDelete(false); }}
                    className="text-red-400 hover:text-red-300 p-1 text-xs"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-gray-400 hover:text-gray-300 p-1 text-xs"
                  >
                    取消
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-gray-500 hover:text-red-400 p-1 text-xs"
                  title="删除"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          {character.personality && (
            <p className="text-xs text-gray-400 line-clamp-1">性格：{character.personality}</p>
          )}
          {character.speakingStyle && (
            <p className="text-xs text-gray-500 line-clamp-1">口癖：{character.speakingStyle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
