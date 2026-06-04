/**
 * Character relationship graph — SVG visualization with drag editing.
 * 人物关系图 — SVG可视化 + 拖拽编辑。
 */
import { useState, useEffect, useRef } from 'react';

interface Relation {
  from: string;
  to: string;
  type: string;
  strength: number;
  note: string;
}

const RELATION_TYPES = [
  '暗恋', '明恋', '挚友', '普通朋友', '师徒', '师门', '家人', '主仆',
  '竞争/敌视', '仇恨', '利用', '暗中观察', '敬畏', '崇拜', '爱恨交织',
];

const REL_COLORS: Record<number, string> = {
  80: '#ec4899', 60: '#f59e0b', 40: '#6b7280', 20: '#ef4444',
};

function getRelColor(strength: number): string {
  if (strength >= 80) return REL_COLORS[80];
  if (strength >= 60) return REL_COLORS[60];
  if (strength >= 40) return REL_COLORS[40];
  return REL_COLORS[20];
}

interface Props {
  chars: { name: string }[];
  relations: Relation[];
  onChange: (relations: Relation[]) => void;
  onAddRelation: (r: Relation) => void;
}

export function RelationGraph({ chars, relations, onChange, onAddRelation }: Props) {
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newType, setNewType] = useState('普通朋友');
  const newStrength = 50;
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-layout: circular positioning / 自动环形布局
  useEffect(() => {
    if (chars.length === 0) return;
    const cx = 150, cy = 130, r = 100;
    const pos: Record<string, { x: number; y: number }> = {};
    chars.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2;
      pos[c.name] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    setPositions(pos);
  }, [chars.length]);

  const handleMouseDown = (name: string) => setDragging(name);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setPositions(prev => ({ ...prev, [dragging]: { x: e.clientX - rect.left, y: e.clientY - rect.top } }));
  };
  const handleMouseUp = () => setDragging(null);

  const addRel = () => {
    if (!newFrom || !newTo || newFrom === newTo) return;
    onAddRelation({ from: newFrom, to: newTo, type: newType, strength: newStrength, note: '' });
    setNewFrom(''); setNewTo('');
  };

  return (
    <div className="space-y-3">
      {/* SVG graph / 关系图 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <svg ref={svgRef} width="300" height="260" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          className="w-full cursor-default">
          {/* Lines / 连线 */}
          {relations.map((r, i) => {
            const f = positions[r.from], t = positions[r.to];
            if (!f || !t) return null;
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
            return (
              <g key={i}>
                <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={getRelColor(r.strength)} strokeWidth={1.5} opacity={0.5} />
                <text x={mx} y={my} textAnchor="middle" className="text-[8px] fill-gray-400" dy={-3}>{r.type}</text>
              </g>
            );
          })}
          {/* Nodes / 节点 */}
          {chars.map(c => {
            const p = positions[c.name];
            if (!p) return null;
            return (
              <g key={c.name} onMouseDown={() => handleMouseDown(c.name)} className="cursor-grab">
                <circle cx={p.x} cy={p.y} r={18} fill="#374151" stroke="#7c3aed" strokeWidth={1.5} />
                <text x={p.x} y={p.y} textAnchor="middle" dy={4} className="text-xs fill-gray-200">{c.name.slice(0, 2)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Add relation / 添加关系 */}
      <div className="flex gap-1 flex-wrap items-center text-xs">
        <select value={newFrom} onChange={e => setNewFrom(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-200 w-20">
          <option value="">从</option>
          <option value="主角">主角</option>
          {chars.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <span className="text-gray-500">→</span>
        <select value={newTo} onChange={e => setNewTo(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-200 w-20">
          <option value="">到</option>
          <option value="主角">主角</option>
          {chars.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={newType} onChange={e => setNewType(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-200">
          {RELATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={addRel} disabled={!newFrom || !newTo}
          className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded">+</button>
      </div>

      {/* Relation list / 关系列表 */}
      {relations.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {relations.map((r, i) => (
            <div key={i} className="flex items-center gap-1 text-xs bg-gray-800 rounded px-2 py-1">
              <span className="text-gray-300">{r.from}</span>
              <span className="text-gray-600">→</span>
              <span className="text-gray-300">{r.to}</span>
              <span className="text-purple-400">{r.type}</span>
              <span className="text-gray-500">{r.strength}</span>
              <button onClick={() => onChange(relations.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 ml-auto">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
