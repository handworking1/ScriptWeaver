/**
 * D&D 5e presets — 9 races, 4 classes, 18 skills, equipment, level table.
 * Based on 2024 PHB + 2014 SRD.
 */
export const RACES = [
  { name:'人类', bonus:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, traits:'多一个技能熟练，每日一次英雄激励', speed:30, size:'中型' },
  { name:'精灵', bonus:{dex:2,int:1}, traits:'黑暗视觉60尺，察觉熟练，冥想代替睡眠，魅惑抗性', speed:30, size:'中型' },
  { name:'矮人', bonus:{con:2,str:1}, traits:'黑暗视觉60尺，毒抗，HP+1/级，石工知识', speed:25, size:'中型' },
  { name:'半身人', bonus:{dex:2,cha:1}, traits:'幸运(1可重掷)，勇敢(恐慌优势)，敏捷穿行', speed:25, size:'小型' },
  { name:'龙裔', bonus:{str:2,cha:1}, traits:'吐息武器(30尺锥形2d6)，对应龙类伤害抵抗', speed:30, size:'中型' },
  { name:'侏儒', bonus:{int:2,con:1}, traits:'黑暗视觉60尺，魔法抵抗(心智豁免优势)', speed:25, size:'小型' },
  { name:'半精灵', bonus:{cha:2,dex:1,con:1}, traits:'黑暗视觉60尺，多两个技能熟练，魅惑抗性', speed:30, size:'中型' },
  { name:'半兽人', bonus:{str:2,con:1}, traits:'黑暗视觉60尺，顽强(HP归零留1血/日)，威慑熟练，重击+1骰', speed:30, size:'中型' },
  { name:'提夫林', bonus:{cha:2,int:1}, traits:'黑暗视觉60尺，火焰抵抗，奇术戏法', speed:30, size:'中型' },
];

export const CLASSES = [
  { name:'战士', hitDice:'d10', primary:'str', saves:['str','con'],
    armor:'全护甲+盾', weapons:'简易+军用', skillCount:2,
    skills:['运动','驯兽','体操','历史','洞察','威吓','察觉','生存'],
    features:['战斗风格','回气(1d10+等级)','动作如潮(L2)','额外攻击(L5)'] },
  { name:'法师', hitDice:'d6', primary:'int', saves:['int','wis'],
    armor:'无', weapons:'匕首/飞镖/投石索/长棍/轻弩', skillCount:2,
    skills:['奥秘','历史','洞察','调查','医药','宗教'],
    features:['施法','奥术恢复','奥术传承(L2)'] },
  { name:'游荡者', hitDice:'d8', primary:'dex', saves:['dex','int'],
    armor:'轻甲', weapons:'简易武器+手弩/长剑/刺剑/短剑', skillCount:4,
    skills:['体操','运动','欺瞒','洞察','威吓','调查','察觉','表演','游说','巧手','隐匿'],
    features:['专精(2技能翻倍)','偷袭1d6','灵巧动作(L2)'] },
  { name:'牧师', hitDice:'d8', primary:'wis', saves:['wis','cha'],
    armor:'中甲+盾', weapons:'简易武器', skillCount:2,
    skills:['历史','洞察','医药','游说','宗教'],
    features:['施法','神圣领域','驱散不死(L2)'] },
];

export const SKILLS = [
  { name:'运动', stat:'str' },{ name:'体操', stat:'dex' },{ name:'巧手', stat:'dex' },{ name:'隐匿', stat:'dex' },
  { name:'奥秘', stat:'int' },{ name:'历史', stat:'int' },{ name:'调查', stat:'int' },{ name:'自然', stat:'int' },{ name:'宗教', stat:'int' },
  { name:'驯兽', stat:'wis' },{ name:'洞察', stat:'wis' },{ name:'医药', stat:'wis' },{ name:'察觉', stat:'wis' },{ name:'生存', stat:'wis' },
  { name:'欺瞒', stat:'cha' },{ name:'威吓', stat:'cha' },{ name:'表演', stat:'cha' },{ name:'游说', stat:'cha' },
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
