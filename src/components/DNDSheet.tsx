/**
 * D&D Character Sheet — stat block, skills, HP/AC, equipment.
 * D&D角色卡 — 属性面板+技能列表+HP/AC+装备。
 */
import { useState } from 'react';
import { RACES, CLASSES, SKILLS, STAT_ZH, LEVELS } from '@/data/dnd5e';
import { abilityMod, profBonus, maxHP } from '@/lib/dice';

export interface CharSheet {
  name: string; race: string; className: string; level: number; xp: number;
  stats: Record<string, number>; hp: { max: number; current: number }; ac: number;
  profSkills: string[]; equipment: string[];
}

interface Props { sheet: CharSheet; onChange: (s: CharSheet) => void; readOnly?: boolean }

export function DNDSheet({ sheet, onChange, readOnly }: Props) {
  const update = (patch: Partial<CharSheet>) => onChange({ ...sheet, ...patch });
  const updateStat = (k: string, v: number) => {
    const s = { ...sheet.stats, [k]: v };
    const c = CLASSES.find(x => x.name === sheet.className);
    const hp = c ? maxHP(c.hitDice, abilityMod(s.con), sheet.level) : sheet.hp.max;
    update({ stats: s, hp: { max: hp, current: Math.min(sheet.hp.current, hp) } });
  };
  const pBonus = profBonus(sheet.level);
  const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3 text-xs">
      {/* Header */}
      <div className="text-center border-b border-gray-700 pb-2">
        <div className="text-sm font-bold text-gray-100">{sheet.name || '未命名'}</div>
        <div className="text-gray-400 mt-0.5">{sheet.race} · {sheet.className} · Lv{sheet.level}</div>
      </div>

      {/* Stats / 属性 */}
      <div className="grid grid-cols-3 gap-1">
        {stats.map(k => (
          <div key={k} className="bg-gray-900 rounded p-1.5 text-center">
            <div className="text-gray-500">{STAT_ZH[k]}</div>
            <div className="text-lg font-bold text-gray-100">{sheet.stats[k] || 10}</div>
            <div className="text-xs text-purple-400">
              {abilityMod(sheet.stats[k] || 10) >= 0 ? '+' : ''}{abilityMod(sheet.stats[k] || 10)}
            </div>
          </div>
        ))}
      </div>

      {/* HP + AC + Initiative */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-gray-500">HP</div>
          <div className="font-bold text-red-400">{sheet.hp.current}/{sheet.hp.max}</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-gray-500">AC</div>
          <div className="font-bold text-blue-400">{sheet.ac || 10}</div>
        </div>
        <div className="bg-gray-900 rounded p-2 text-center">
          <div className="text-gray-500">先攻</div>
          <div className="font-bold text-green-400">
            {abilityMod(sheet.stats.dex) >= 0 ? '+' : ''}{abilityMod(sheet.stats.dex)}
          </div>
        </div>
      </div>

      {/* Skills / 技能 */}
      <div>
        <div className="text-gray-500 mb-1">技能 (熟练+{pBonus})</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-32 overflow-y-auto">
          {SKILLS.map(sk => {
            const mod = abilityMod(sheet.stats[sk.stat] || 10);
            const prof = sheet.profSkills.includes(sk.name) ? pBonus : 0;
            const total = mod + prof;
            return (
              <div key={sk.name} className={`flex justify-between text-xs px-1 py-0.5 rounded ${prof > 0 ? 'bg-purple-900/20' : ''}`}>
                <span className="text-gray-400">{sk.name}</span>
                <span className="text-gray-200">{total >= 0 ? '+' : ''}{total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment / 装备 */}
      <div>
        <div className="text-gray-500 mb-1">装备</div>
        <div className="text-gray-400 space-y-0.5">
          {sheet.equipment.length === 0 && <div className="text-gray-600">无</div>}
          {sheet.equipment.map((e, i) => <div key={i}>⚔️ {e}</div>)}
        </div>
      </div>
    </div>
  );
}

/** Character creation wizard / 角色创建向导 */
export function CharacterCreator({ onCreate }: { onCreate: (s: CharSheet) => void }) {
  const [step, setStep] = useState(0);
  const [race, setRace] = useState('人类');
  const [className, setClassName] = useState('战士');
  const [stats, setStats] = useState<Record<string,number>>({ str:15,dex:14,con:13,int:12,wis:10,cha:8 });
  const [profSkills, setProfSkills] = useState<string[]>(['运动','察觉']);
  const [equipment, setEquipment] = useState<string[]>(['长剑','盾牌','探索套件']);
  const [name, setName] = useState('');

  const finish = () => {
    const r = RACES.find(x => x.name === race);
    const finalStats = { ...stats };
    if (r) for (const [k, v] of Object.entries(r.bonus)) finalStats[k] = (finalStats[k] || 0) + v!;
    const c = CLASSES.find(x => x.name === className);
    const hp = c ? maxHP(c.hitDice, abilityMod(finalStats.con), 1) : 10;
    const ac = 10 + abilityMod(finalStats.dex) + (equipment.includes('盾牌') ? 2 : 0);
    onCreate({ name: name||'冒险者', race, className, level:1, xp:0, stats:finalStats, hp:{max:hp,current:hp}, ac, profSkills, equipment });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3 text-xs max-w-md mx-auto">
      <div className="text-sm font-bold text-gray-100">创建角色 · 第{step+1}/5步</div>
      <div className="flex gap-1">
        {['种族','职业','属性','技能','命名'].map((s,i) => (
          <div key={i} className={`flex-1 h-1 rounded ${i <= step ? 'bg-purple-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-3 gap-1">
          {RACES.map(r => (
            <button key={r.name} onClick={() => { setRace(r.name); setStep(1); }}
              className={`p-2 rounded text-center ${race===r.name?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
              <div className="font-medium">{r.name}</div>
              <div className="text-gray-500">{r.traits.slice(0,20)}...</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-1">
          {CLASSES.map(c => (
            <button key={c.name} onClick={() => { setClassName(c.name); setProfSkills(c.skills.slice(0,c.skillCount)); setStep(2); }}
              className={`p-2 rounded ${className===c.name?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400'}`}>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.hitDice} HP · {STAT_ZH[c.primary]}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="text-gray-500 mb-2">分配属性值（可用27点点数购买，或使用标准数组 15/14/13/12/10/8）</div>
          <div className="space-y-1">
            {Object.entries(stats).map(([k,v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-10 text-gray-400">{STAT_ZH[k]}</span>
                <input type="range" min={3} max={18} value={v} onChange={e => setStats({...stats,[k]:parseInt(e.target.value)})}
                  className="flex-1 accent-purple-500" />
                <span className="w-12 text-right text-gray-200">
                  {v} ({abilityMod(v)>=0?'+':''}{abilityMod(v)})
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="mt-3 w-full py-1.5 bg-purple-600 text-white rounded">下一步</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="text-gray-500 mb-2">选择熟练技能（{CLASSES.find(x=>x.name===className)?.skillCount}项）</div>
          <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
            {(CLASSES.find(x=>x.name===className)?.skills||[]).map(sk => (
              <button key={sk} onClick={() => {
                if (profSkills.includes(sk)) setProfSkills(profSkills.filter(x=>x!==sk));
                else setProfSkills([...profSkills,sk].slice(0, CLASSES.find(x=>x.name===className)?.skillCount||2));
              }} className={`p-1 rounded text-xs ${profSkills.includes(sk)?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400'}`}>
                {sk}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(4)} className="mt-3 w-full py-1.5 bg-purple-600 text-white rounded">下一步</button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="角色名字..." autoFocus
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
          <select multiple={false} onChange={e => {
            const v = e.target.value;
            if (v && !equipment.includes(v)) setEquipment([...equipment, v]);
          }} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200">
            <option value="">添加装备...</option>
            <option>长剑</option><option>长弓</option><option>皮甲</option><option>链甲衫</option><option>盾牌</option><option>探索套件</option>
          </select>
          <div className="text-gray-400 text-xs">已选: {equipment.join('、') || '无'}</div>
          <button onClick={finish} disabled={!name.trim()} className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded text-sm font-medium">
            创建角色
          </button>
        </div>
      )}
    </div>
  );
}
