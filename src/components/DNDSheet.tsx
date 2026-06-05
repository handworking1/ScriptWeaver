/**
 * D&D Character Sheet — stat block, skills, HP/AC, equipment.
 * D&D角色卡 — 属性面板+技能列表+HP/AC+装备。
 */
import { useState } from 'react';
import { RACES, CLASSES, SKILLS, STAT_ZH, LEVELS, EQUIP } from '@/data/dnd5e';
import { abilityMod, profBonus, maxHP } from '@/lib/dice';

export interface CharSheet {
  name: string; race: string; className: string; level: number; xp: number;
  stats: Record<string, number>; hp: { max: number; current: number }; ac: number;
  profSkills: string[]; equipment: string[];
}

interface Props { sheet: CharSheet; onChange: (s: CharSheet) => void; readOnly?: boolean }

export function DNDSheet({ sheet, onChange, readOnly }: Props) {
  const [showSkills, setShowSkills] = useState(false);
  const [showEquip, setShowEquip] = useState(false);
  const pBonus = profBonus(sheet.level);
  const stats = ['str','dex','con','int','wis','cha'] as const;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 text-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-gray-800 p-3 text-center">
        <div className="text-sm font-bold text-gray-100">{sheet.name || '未命名'}</div>
        <div className="text-gray-400 mt-0.5">{sheet.race} · {sheet.className} · Lv{sheet.level}</div>
      </div>

      <div className="p-3 space-y-2">
      {/* Stats */}
      <div className="grid grid-cols-6 gap-0.5">
        {stats.map(k => {
          const mod = abilityMod(sheet.stats[k]);
          return (
          <div key={k} className="bg-gray-900 rounded p-1 text-center">
            <div className="text-gray-600 text-[10px]">{STAT_ZH[k]}</div>
            <div className="font-bold text-gray-200 text-sm">{sheet.stats[k]}</div>
            <div className="text-purple-400 text-[10px]">{mod>=0?'+':''}{mod}</div>
          </div>
        )})}
      </div>

      {/* HP/AC/INI bar */}
      <div className="flex gap-1">
        <div className="flex-1 bg-gray-900 rounded p-1.5 text-center">
          <div className="text-gray-600 text-[10px]">生命</div>
          <div className="font-bold text-red-400">{sheet.hp.current}<span className="text-gray-600 text-[10px]">/{sheet.hp.max}</span></div>
        </div>
        <div className="flex-1 bg-gray-900 rounded p-1.5 text-center">
          <div className="text-gray-600 text-[10px]">AC</div>
          <div className="font-bold text-blue-400">{sheet.ac}</div>
        </div>
        <div className="flex-1 bg-gray-900 rounded p-1.5 text-center">
          <div className="text-gray-600 text-[10px]">先攻</div>
          <div className="font-bold text-green-400">{abilityMod(sheet.stats.dex)>=0?'+':''}{abilityMod(sheet.stats.dex)}</div>
        </div>
        <div className="flex-1 bg-gray-900 rounded p-1.5 text-center">
          <div className="text-gray-600 text-[10px]">熟练</div>
          <div className="font-bold text-amber-400">+{pBonus}</div>
        </div>
      </div>

      {/* Collapsible Skills */}
      <button onClick={() => setShowSkills(v=>!v)} className="w-full flex items-center justify-between bg-gray-900 rounded p-1.5 hover:bg-gray-850">
        <span className="text-gray-400 text-[10px]">技能熟练</span>
        <span className="text-gray-500 text-[10px]">{showSkills?'▲':'▼'}</span>
      </button>
      {showSkills && (
        <div className="space-y-0.5 bg-gray-900/50 rounded p-1.5 max-h-40 overflow-y-auto">
          {sheet.profSkills.map(sk => {
            const s = SKILLS.find(x=>x.name===sk);
            const mod = abilityMod(sheet.stats[s?.stat||'str']);
            return (
              <div key={sk} className="flex justify-between items-center text-[10px] py-0.5 px-1 rounded hover:bg-gray-800" title={s?.desc}>
                <div>
                  <span className="text-gray-300">{sk}</span>
                  <span className="text-gray-600 ml-1">({STAT_ZH[s?.stat||'']})</span>
                </div>
                <span className="text-purple-300">{mod+pBonus>=0?'+':''}{mod+pBonus}</span>
              </div>
            )})}
          <div className="text-gray-600 text-[10px] mt-1 italic border-t border-gray-800 pt-1">hover查看技能说明</div>
        </div>
      )}

      {/* Collapsible Equipment */}
      <button onClick={() => setShowEquip(v=>!v)} className="w-full flex items-center justify-between bg-gray-900 rounded p-1.5 hover:bg-gray-850">
        <span className="text-gray-400 text-[10px]">装备 ({sheet.equipment.length})</span>
        <span className="text-gray-500 text-[10px]">{showEquip?'▲':'▼'}</span>
      </button>
      {showEquip && (
        <div className="space-y-0.5 bg-gray-900/50 rounded p-1.5 max-h-32 overflow-y-auto">
          {sheet.equipment.map((ename,i) => {
            const eq = EQUIP.find(e=>e.name===ename) as any;
            return (
              <div key={i} className="text-[10px] py-0.5 px-1 rounded hover:bg-gray-800" title={eq?.desc || ''}>
                <div className="flex justify-between">
                  <span className="text-gray-300">{ename}</span>
                  <span className="text-gray-600">{eq?.cat}</span>
                </div>
                <div className="text-gray-500">{eq?.desc}</div>
              </div>
            )})}
          <div className="text-gray-600 text-[10px] mt-1 italic border-t border-gray-800 pt-1">hover查看装备说明</div>
        </div>
      )}
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
    let armorAc = 10;
    for (const e of equipment) {
      const eq = EQUIP.find(x => x.name === e);
      if (eq && eq.ac) armorAc = Math.max(armorAc, eq.ac);
    }
    const ac = armorAc + abilityMod(finalStats.dex) + (equipment.includes('盾牌') ? 2 : 0);
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

      {step === 0 && (<>
        <div className="grid grid-cols-3 gap-1">
          {RACES.map(r => (
            <button key={r.name} onClick={() => setRace(r.name)}
              className={`p-2 rounded text-center ${race===r.name?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">
                {Object.entries(r.bonus).map(([k,v]) => `${STAT_ZH[k]}+${v}`).join(' ')}
              </div>
            </button>
          ))}
        </div>
        {/* Race detail / 种族详情 */}
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 text-xs space-y-1">
          <div className="font-medium text-gray-200">{race}</div>
          <div className="text-gray-400">{RACES.find(r=>r.name===race)?.traits}</div>
          <div className="text-gray-500">速度：{RACES.find(r=>r.name===race)?.speed}尺 · {RACES.find(r=>r.name===race)?.size}</div>
          <div className="text-purple-400">
            属性加成：{Object.entries(RACES.find(r=>r.name===race)?.bonus||{}).map(([k,v])=>`${STAT_ZH[k]}+${v}`).join('、')}
          </div>
        </div>
        <button onClick={() => setStep(1)} className="w-full py-1.5 bg-purple-600 text-white rounded">选定 {race}</button>
      </>)}

      {step === 1 && (<>
        <div className="grid grid-cols-2 gap-1">
          {CLASSES.map(c => (
            <button key={c.name} onClick={() => setClassName(c.name)}
              className={`p-2 rounded ${className===c.name?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400'}`}>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.hitDice} HP · {STAT_ZH[c.primary]}</div>
            </button>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 text-xs space-y-1">
          <div className="font-medium text-gray-200">{className}</div>
          <div className="text-gray-400">生命骰：{CLASSES.find(x=>x.name===className)?.hitDice} · 主属性：{STAT_ZH[CLASSES.find(x=>x.name===className)?.primary||'str']}</div>
          <div className="text-gray-500">护甲：{CLASSES.find(x=>x.name===className)?.armor}</div>
          <div className="text-gray-500">武器：{CLASSES.find(x=>x.name===className)?.weapons}</div>
          <div className="text-purple-400">特性：{CLASSES.find(x=>x.name===className)?.features.join('、')}</div>
        </div>
        <button onClick={() => { setProfSkills(CLASSES.find(x=>x.name===className)!.skills.slice(0,CLASSES.find(x=>x.name===className)!.skillCount)); setStep(2); }} className="w-full py-1.5 bg-purple-600 text-white rounded">选定 {className}</button>
      </>)}

      {step === 2 && (
        <div>
          <div className="text-gray-500 mb-2">分配属性值（点击+/−调整，推荐总和不超过72）</div>
          <div className="space-y-1">
            {Object.entries(stats).map(([k,v]) => (
              <div key={k} className="flex items-center gap-2 bg-gray-900 rounded p-2">
                <span className="w-12 text-gray-300 text-sm">{STAT_ZH[k]}</span>
                <button onClick={() => setStats({...stats,[k]:Math.max(8,v-1)})}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-lg leading-none">−</button>
                <span className="flex-1 text-center text-lg font-bold text-purple-300">{v}</span>
                <button onClick={() => setStats({...stats,[k]:Math.min(18,v+1)})}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-lg leading-none">+</button>
                <span className="w-12 text-right text-sm text-gray-400">
                  {abilityMod(v)>=0?'+':''}{abilityMod(v)}
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
          <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
            {(CLASSES.find(x=>x.name===className)?.skills||[]).map(sk => {
              const detail = SKILLS.find(s=>s.name===sk);
              return (
                <button key={sk} onClick={() => {
                  if (profSkills.includes(sk)) setProfSkills(profSkills.filter(x=>x!==sk));
                  else setProfSkills([...profSkills,sk].slice(0, CLASSES.find(x=>x.name===className)?.skillCount||2));
                }} className={`p-2 rounded text-left ${profSkills.includes(sk)?'bg-purple-900/60 text-purple-300':'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  <div className="flex justify-between text-xs">
                    <span>{sk}</span>
                    <span className="text-gray-500">({STAT_ZH[detail?.stat||'']?.[0]})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{detail?.desc}</div>
                </button>
              );
            })}
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
