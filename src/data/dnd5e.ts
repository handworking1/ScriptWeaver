/**
 * D&D 5e presets — 9 races, 4 classes, 18 skills, equipment, level table.
 * Based on 2024 PHB + 2014 SRD.
 */
export const RACES = [
  { name:'人类', bonus:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, traits:'多一个技能熟练。每日一次英雄激励（d20重掷）。人类是多元宇宙中最普遍的种族，以强大的适应力著称。寿命约80年。', speed:30, size:'中型' },
  { name:'精灵', bonus:{dex:2,int:1}, traits:'黑暗视觉60尺。察觉技能熟练。4小时出神代替8小时睡眠。对抗魅惑豁免优势，免疫魔法睡眠。寿命可达700年，身材修长。', speed:30, size:'中型' },
  { name:'矮人', bonus:{con:2,str:1}, traits:'黑暗视觉60尺。毒素抗性（豁免优势）。HP上限+1/级。石材相关历史检定有双倍熟练加值。寿命约350年，以锻造和酿酒闻名。', speed:25, size:'中型' },
  { name:'半身人', bonus:{dex:2,cha:1}, traits:'幸运：d20掷出1可重掷一次（必须接受新结果）。对抗恐慌豁免优势。可穿过体型大于你的生物空间。身高约3尺，爱安逸却意外擅长冒险。', speed:25, size:'小型' },
  { name:'龙裔', bonus:{str:2,cha:1}, traits:'吐息武器：30尺锥形或5×30尺线形，伤害2d6（体质豁免DC=8+体质+熟练），每短休恢复一次。选择龙类颜色获得对应伤害抵抗（红-火/蓝-电/绿-毒/黑-酸/白-寒）。身高6尺以上，覆鳞有尾。', speed:30, size:'中型' },
  { name:'侏儒', bonus:{int:2,con:1}, traits:'黑暗视觉60尺。对法术的智力/感知/魅力豁免有优势。身高约3尺，充满好奇心，擅长发明创造。', speed:25, size:'小型' },
  { name:'半精灵', bonus:{cha:2,dex:1,con:1}, traits:'黑暗视觉60尺。额外获得两项技能熟练。对抗魅惑豁免优势，免疫魔法睡眠。半精灵结合了人类的野心与精灵的优雅，在两个世界中游走。', speed:30, size:'中型' },
  { name:'半兽人', bonus:{str:2,con:1}, traits:'黑暗视觉60尺。顽强：HP归零时改为降到1（每次长休限一次）。威慑技能熟练。重击时多掷一颗武器伤害骰。体格魁梧獠牙外露。', speed:30, size:'中型' },
  { name:'提夫林', bonus:{cha:2,int:1}, traits:'黑暗视觉60尺。火焰抵抗。1级获得奇术戏法。血脉中有下位面诅咒，皮肤呈红/紫色，有角有尾，常被视为不祥之兆。', speed:30, size:'中型' },
];

export const CLASSES = [
  { name:'战士', hitDice:'d10', primary:'str', saves:['str','con'],
    armor:'全护甲+盾', weapons:'简易+军用', skillCount:2,
    skills:['运动','驯兽','体操','历史','洞察','威吓','察觉','生存'],
    features:['L1战斗风格（防御/对决/巨武器/保护/箭术）','L1回气：附赠动作为自己恢复1d10+战士等级HP，短休恢复','L2动作如潮：本回合额外获得一个动作，短休恢复','L5额外攻击：攻击动作可攻击两次','L9不屈：重掷一次失败的豁免，必须用新结果'] },
  { name:'法师', hitDice:'d6', primary:'int', saves:['int','wis'],
    armor:'无', weapons:'匕首/飞镖/投石索/长棍/轻弩', skillCount:2,
    skills:['奥秘','历史','洞察','调查','医药','宗教'],
    features:['L1施法：法术书+戏法+一环法术','L1奥术恢复：短休恢复法术位（合计环数=法师等级一半）','L2奥术传承：选择学派（防护/咒法/预言/附魔/塑能/幻术/死灵/变化），学派法术抄写费用减半','每级可学2个新法术'] },
  { name:'游荡者', hitDice:'d8', primary:'dex', saves:['dex','int'],
    armor:'轻甲', weapons:'简易武器+手弩/长剑/刺剑/短剑', skillCount:4,
    skills:['体操','运动','欺瞒','洞察','威吓','调查','察觉','表演','游说','巧手','隐匿'],
    features:['L1专精：选择两个熟练技能或盗贼工具，熟练加值翻倍','L1偷袭：攻击优势或目标旁有盟友时，额外造成1d6伤害（每2级+1d6）','L1盗贼黑话：能理解和使用盗贼间的秘密暗语','L2灵巧动作：附赠动作执行疾走/撤离/躲藏'] },
  { name:'牧师', hitDice:'d8', primary:'wis', saves:['wis','cha'],
    armor:'中甲+盾', weapons:'简易武器', skillCount:2,
    skills:['历史','洞察','医药','游说','宗教'],
    features:['L1施法：戏法+一环法术（感知决定可准备数量）','L1神圣领域：选择领域（生命/光明/诡术/战争/知识/自然/风暴/锻造/坟冢/秩序/和平/暮光），获得领域法术','L2驱散不死：动作驱散30尺内不死生物，感知豁免DC，失败则逃跑1分钟','L2引导神力：获得领域特有的神力能力，短休恢复'] },
];

export const SKILLS = [
  { name:'运动', stat:'str', desc:'攀爬、跳跃、游泳等体能活动' },
  { name:'体操', stat:'dex', desc:'平衡、翻腾、空中保持姿态' },
  { name:'巧手', stat:'dex', desc:'扒窃、开锁、机关操作' },
  { name:'隐匿', stat:'dex', desc:'潜行、躲藏、不被发现' },
  { name:'奥秘', stat:'int', desc:'魔法、符文、位面知识' },
  { name:'历史', stat:'int', desc:'历史事件、王朝、古代文明' },
  { name:'调查', stat:'int', desc:'寻找线索、推理分析、鉴别假货' },
  { name:'自然', stat:'int', desc:'动植物、地理、天气' },
  { name:'宗教', stat:'int', desc:'神祇、祭祀、圣物、教派' },
  { name:'驯兽', stat:'wis', desc:'安抚动物、判断其意图' },
  { name:'洞察', stat:'wis', desc:'识破谎言、揣摩动机' },
  { name:'医药', stat:'wis', desc:'诊断伤情、稳定濒死同伴' },
  { name:'察觉', stat:'wis', desc:'观察环境、发现隐藏线索' },
  { name:'生存', stat:'wis', desc:'追踪、觅食、辨别方向' },
  { name:'欺瞒', stat:'cha', desc:'说谎、伪装、隐瞒真相' },
  { name:'威吓', stat:'cha', desc:'威胁、逼供、制造恐惧' },
  { name:'表演', stat:'cha', desc:'弹唱、演讲、吸引注意' },
  { name:'游说', stat:'cha', desc:'谈判、交涉、建立关系' },
];

export const STAT_ZH: Record<string,string> = { str:'力量',dex:'敏捷',con:'体质',int:'智力',wis:'感知',cha:'魅力' };

export const LEVELS = [
  { lv:1,xp:0,prof:2 },{ lv:2,xp:300,prof:2 },{ lv:3,xp:900,prof:2 },{ lv:4,xp:2700,prof:2 },{ lv:5,xp:6500,prof:3 },
  { lv:6,xp:14000,prof:3 },{ lv:7,xp:23000,prof:3 },{ lv:8,xp:34000,prof:3 },{ lv:9,xp:48000,prof:4 },{ lv:10,xp:64000,prof:4 },
  { lv:11,xp:85000,prof:4 },{ lv:12,xp:100000,prof:4 },{ lv:13,xp:120000,prof:5 },{ lv:14,xp:140000,prof:5 },
  { lv:15,xp:165000,prof:5 },{ lv:16,xp:195000,prof:5 },{ lv:17,xp:225000,prof:6 },{ lv:18,xp:265000,prof:6 },
  { lv:19,xp:305000,prof:6 },{ lv:20,xp:355000,prof:6 },
];

export const EQUIP = [
  { name:'长剑', cat:'军用近战', dmg:'1d8', prop:'多用(1d10)', cost:'15gp', wt:3 },
  { name:'短剑', cat:'军用近战', dmg:'1d6', prop:'灵巧,轻型', cost:'10gp', wt:2 },
  { name:'巨剑', cat:'军用近战', dmg:'2d6', prop:'重型,双手', cost:'50gp', wt:6 },
  { name:'长弓', cat:'军用远程', dmg:'1d8', prop:'弹药(150/600)', cost:'50gp', wt:2 },
  { name:'匕首', cat:'简易近战', dmg:'1d4', prop:'灵巧,轻型,投掷', cost:'2gp', wt:1 },
  { name:'轻弩', cat:'简易远程', dmg:'1d8', prop:'弹药(80/320),装填', cost:'25gp', wt:5 },
  { name:'皮甲', cat:'轻甲', ac:11, cost:'10gp', wt:10 },
  { name:'镶钉皮甲', cat:'轻甲', ac:12, cost:'45gp', wt:13 },
  { name:'链甲衫', cat:'中甲', ac:13, cost:'50gp', wt:20 },
  { name:'胸甲', cat:'中甲', ac:14, cost:'400gp', wt:20 },
  { name:'链甲', cat:'重甲', ac:16, cost:'75gp', wt:55 },
  { name:'板甲', cat:'重甲', ac:18, cost:'1500gp', wt:65 },
  { name:'盾牌', cat:'盾牌', ac:2, cost:'10gp', wt:6 },
];
