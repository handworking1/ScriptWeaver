/**
 * D&D TTRPG Page — character sheet + AI GM chat + dice.
 * D&D跑团页 — 角色卡+AI GM聊天+骰子。
 */
import { useState, useRef, useEffect } from 'react';
import { DNDSheet, CharacterCreator, CharSheet } from '@/components/DNDSheet';
import { useConfigStore } from '@/stores/configStore';
import { roll, d20Check, abilityMod, profBonus, attackRoll, damageRoll, maxHP } from '@/lib/dice';
import { STAT_ZH, SKILLS, CLASSES } from '@/data/dnd5e';

export default function DNDPage() {
  const [sheet, setSheet] = useState<CharSheet | null>(null);
  const [showCreator, setShowCreator] = useState(true);
  const [messages, setMessages] = useState<{ role: string; content: string; rollResult?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [diceLog, setDiceLog] = useState<string[]>([]);
  const [showDice, setShowDice] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const activeConfig = useConfigStore(s => s.activeConfigId);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  const buildGMPrompt = (s: CharSheet): string => {
    const r = `你是D&D地下城主。玩家角色：${s.name}，${s.race} ${s.className}，Lv${s.level}。
${Object.entries(s.stats).map(([k,v])=>`${STAT_ZH[k]}${v}(${abilityMod(v)>=0?'+':''}${abilityMod(v)})`).join(' ')}
HP ${s.hp.current}/${s.hp.max} AC ${s.ac} 技能:${s.profSkills.join('、')} 熟练:+${profBonus(s.level)}
装备:${s.equipment.join('、')}

【怪物数据 - 可在战斗中引用】
哥布林 HP7 AC15 攻击+4/1d6+2 敏捷隐蔽+6 | 兽人 HP15 AC13 攻击+5/1d12+3 | 骷髅 HP13 AC13 攻击+4/1d6+2 穿刺挥砍易伤 | 巨蜘蛛 HP26 AC14 攻击+5/1d8+3+毒素(体质DC11/2d8) | 石像鬼 HP52 AC15 攻击+6/2d6+3 非魔法武器抵抗 | 龙崽 HP33 AC17 攻击+6/2d6+4 喷吐武器DC11/4d6

【战斗规则 - 必须遵守】
进入战斗时：1)掷先攻→按顺序行动 2)每回合附回复末尾标注当前状态: [回合X | 敌人A HP 5/12 | 敌人B HP 0/7死亡] 3)怪物HP归零立即移除 4)战斗结束宣布经验值
【长休/短休】短休1小时→可花费生命骰恢复HP。长休8小时→HP回满+回复一半生命骰+法术位回满
【裁决】需检定时报DC。成功→叙事成功。失败→有趣的意外。支持指令:/check、/roll、/attack(默认vs AC12)。/status查看PC状态`;
    return r;
  };

  if (showCreator || !sheet) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center pt-16">
        <div className="w-full max-w-lg">
          <h2 className="text-xl font-bold text-gray-100 mb-4 text-center">🎲 D&D 跑团</h2>
          <CharacterCreator onCreate={s => { setSheet(s); setShowCreator(false);
            setMessages([{ role:'system', content: buildGMPrompt(s) }]); }} />
        </div>
      </div>
    );
  }

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Handle commands / 处理骰子指令
    if (text.startsWith('/roll ')) {
      const expr = text.slice(6);
      const r = roll(expr);
      setDiceLog(prev => [...prev, `🎲 ${expr}=${r.total} [${r.rolls.join(',')}]`].slice(-20));
      setMessages(prev => [...prev, { role:'assistant', content: `🎲 ${expr} = ${r.total}`, rollResult: `${r.total}` }]);
      return;
    }
    if (text.startsWith('/check ')) {
      const parts = text.slice(7).split(' ');
      const skillName = parts[0];
      const dc = parseInt(parts[1]?.replace('DC','') || '15');
      const sk = SKILLS.find(s => s.name === skillName);
      if (!sk) { setMessages(prev => [...prev, { role:'assistant', content: '❌ 未知技能' }]); return; }
      const mod = abilityMod(sheet.stats[sk.stat]);
      const prof = sheet.profSkills.includes(skillName) ? profBonus(sheet.level) : 0;
      const check = d20Check({ attrMod: mod, profBonus: prof, dc });
      const result = `${check.success ? '✓ 成功' : '✗ 失败'} [d20=${check.roll}+${mod}${prof?'+'+prof:''}=${check.total} vs DC${dc}]`;
      setMessages(prev => [...prev, { role:'assistant', content: `🎲 ${skillName}检定：${result}`, rollResult: check.success ? 'success' : 'fail' }]);
      return;
    }
    if (text.startsWith('/attack')) {
      const strMod = abilityMod(sheet.stats.str);
      const check = attackRoll(strMod, profBonus(sheet.level), 12);
      const dmg = check.hit ? damageRoll('1d8', strMod) : 0;
      setMessages(prev => [...prev, { role:'assistant' as const, content: `⚔️ ${check.crit?'重击! ':''}${check.hit?'命中':'未命中'}${check.hit?` 造成 ${dmg} 伤害`:''}`, rollResult: String(dmg) }]);
      return;
    }

    // AI GM call (needs config) / AI调用需要配置
    if (!activeConfig) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.discussSettings(activeConfig, 'script',
        { title:'D&D跑团', worldSetting:'', background:'', mainQuests:'', sideQuests:'', environment:'', map:'', data:'' },
        [...messages.slice(-10), { role:'user', content: text }]);
      if (result.reply) {
        setMessages(prev => [...prev, { role:'assistant' as const, content: result.reply! }]);
      }
    } catch (err: any) { setMessages(prev => [...prev, { role:'assistant', content: '❌ ' + (err.message||'未知错误') }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex">
      {/* Left: Character Sheet / 角色卡 */}
      <div className="w-72 border-r border-gray-800 overflow-y-auto p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-200">🎲 D&D 跑团</span>
          <button onClick={() => setShowCreator(true)} className="text-xs text-gray-500 hover:text-purple-400">✏️</button>
        </div>
        <div className="flex gap-1 mb-2">
          <select value={sheet.level} onChange={e => {
            const lv = parseInt(e.target.value);
            const c = CLASSES.find(x=>x.name===sheet.className);
            const hp = c ? maxHP(c.hitDice, abilityMod(sheet.stats.con), lv) : sheet.hp.max;
            setSheet({...sheet, level:lv, hp:{max:hp,current:hp}});
          }} className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs text-gray-200 flex-1">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(lv=>
              <option key={lv} value={lv}>Lv {lv}</option>)}
          </select>
          <button onClick={() => setSheet({...sheet, hp:{...sheet.hp, current:Math.min(sheet.hp.current+Math.ceil(sheet.hp.max/4), sheet.hp.max)}})}
            className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded" title="短休">🛌短休</button>
          <button onClick={() => setSheet({...sheet, hp:{...sheet.hp, current:sheet.hp.max}})}
            className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded" title="长休">💤长休</button>
        </div>
        <DNDSheet sheet={sheet} onChange={setSheet} />
      </div>

      {/* Right: Chat + Dice / 聊天+骰子 */}
      <div className="flex-1 flex flex-col">
        {/* Chat / 聊天区 */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`${m.role==='user'?'text-right':'text-left'}`}>
              <div className={`inline-block max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.role==='user'?'bg-purple-600 text-white rounded-tr-md':'bg-gray-800 text-gray-200 rounded-tl-md'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div className="text-center text-purple-400 text-xs animate-pulse">🎲 AI思考中...</div>}
        </div>

        {/* Dice log / 骰子日志 */}
        {showDice && (
          <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2 max-h-32 overflow-y-auto">
            {diceLog.length === 0 ? <div className="text-xs text-gray-600">暂无掷骰记录</div> :
              diceLog.map((l,i) => <div key={i} className="text-xs text-gray-400">{l}</div>)}
          </div>
        )}

        {/* Input / 输入区 */}
        <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-3 flex gap-2">
          <button onClick={() => setShowDice(v=>!v)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${showDice?'bg-purple-700 text-white':'bg-gray-700 text-gray-400'}`} title="骰子">🎲</button>
          <div className="flex-1 flex gap-2">
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setInput('/roll d20')} className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">d20</button>
              <button onClick={() => setInput('/check 察觉 DC15')} className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">检定</button>
              <button onClick={() => setInput('/attack')} className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">攻击</button>
            </div>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="描述你的行动，或输入指令 /roll /check /attack"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
          </div>
          <button onClick={send} disabled={!input.trim() || loading || !activeConfig}
            className="px-4 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium">
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
