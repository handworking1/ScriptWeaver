/**
 * Built-in demo script + characters — seeded on first run.
 * 内置示例剧本+角色 — 首次运行时自动植入数据库。
 */

export interface SeedScript {
  id: string;
  title: string;
  worldSetting: string;
  background: string;
  extraData: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface SeedCharacter {
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

export const SEED_SCRIPT: SeedScript = {
  id: 'builtin_cangxuan',
  title: '苍玄录',
  worldSetting:
    '苍玄大陆，灵气充沛的修真世界。万年前仙魔大战后，天道崩碎，灵气日渐稀薄。各大宗门割据一方，明争暗斗。世间流传着"九转玄功"的传说——修炼至第九转者可重铸天道，飞升成仙。然千年以来，无一人能突破第六转。',
  background:
    '你本是青云宗一名不起眼的外门弟子，资质平庸，苦修三年仍停留在炼气期。一日在宗门后山采药时，意外坠入一处上古遗迹，得到一枚神秘的玉佩。玉佩中封印着一位上古大能的残魂，从此你的命运彻底改变。\n\n青云宗外有妖兽肆虐，内有派系倾轧。长老院中保守派与激进派争斗不休，掌门之位的争夺暗流涌动。而你，一个偶然获得奇遇的小人物，将在这场席卷整个苍玄大陆的风暴中，走出属于自己的道路。',
  extraData: {
    mainQuests:
      '主线1：突破炼气期，正式踏入修真之路\n主线2：通过宗门外门大比，进入内门\n主线3：调查后山玉佩的秘密，揭开上古遗迹的真相\n主线4：阻止魔道入侵，守护青云宗',
    sideQuests:
      '支线1：帮小师妹灵儿采集炼丹材料\n支线2：调查矿洞中妖兽异动的根源\n支线3：寻找失传的炼器图谱',
    tags: '玄幻,仙侠,升级流,爽文',
    referenceWorks: '凡人修仙传,一念永恒',
    eraBackground: '架空修真世界，灵气衰退时代',
    protagonistDilemma:
      '宏观：天道崩碎，灵气衰竭，修真文明面临终结\n中观：宗门内斗，外有妖兽魔道威胁\n微观：资质平庸，被同门嘲笑欺凌\n个人：身怀玉佩秘密，一旦暴露将被各大势力追杀',
    coreCheat: '上古大能残魂玉佩——可传授失传功法、预知危险、解锁遗迹禁制',
    ageRule: '全年龄',
    narrativeMode: 'mode3',
    strictMode: 'strict',
    workflowMode: 'guided',
    recapMode: 'N',
    periodicSummary: 'O',
    ruleSelfCheck: 'Y',
    banghuiEnabled: 'N',
    timeline: '',
    chapters: '第一卷：外门风云\n第二卷：内门争锋\n第三卷：乱世将至\n第四卷：九转玄功',
    data: '修炼境界：炼气→筑基→金丹→元婴→化神→合体→大乘→渡劫\n宗门体系：外门弟子→内门弟子→核心弟子→真传弟子→长老→掌门',
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const SEED_CHARACTERS: SeedCharacter[] = [
  {
    id: 'builtin_char_1',
    scriptId: 'builtin_cangxuan',
    name: '苏灵儿',
    personality: '天真活泼，心地善良，对师兄（你）有着朦胧的好感。虽然年纪最小但天资聪颖，经常以天真无邪的方式化解宗门中的矛盾。内心深处有着不为人知的秘密——她是上古大能的后裔。',
    background:
      '青云宗掌门的独生女，从小在宗门长大。母亲早逝，父亲严厉，养成了她外表活泼、内心敏感的性格。对炼丹术有着超乎寻常的天赋，能辨认出常人无法识别的灵药。',
    speakingStyle:
      '活泼俏皮，常以"师兄~"开头。说话时喜欢用"呀""嘛""呢"等语气词。偶尔会不经意说出超越年龄的洞察，让人怀疑她的来历不简单。',
    appearance:
      '十五六岁的少女，乌黑长发扎成双马尾，灵动的大眼睛里仿佛藏着星辰。常穿一袭淡青色长裙，腰间挂着小巧的丹炉吊坠。笑起来时有两个浅浅的酒窝。',
    avatar: '',
    createdAt: Date.now(),
  },
  {
    id: 'builtin_char_2',
    scriptId: 'builtin_cangxuan',
    name: '赵无极',
    personality:
      '冷傲孤高，实力至上主义者。表面冷酷无情，实则极度重视尊严和承诺。对外门弟子不屑一顾，但一旦认可某人便会全力维护。内心深处渴望变强是为了保护什么东西。',
    background:
      '内门第一人，金丹期修士。出身修真世家，家族在十年前被魔道灭门，独自幸存后被青云宗长老收留。从此拼命修炼，只为有朝一日能复仇。',
    speakingStyle: '简洁冷硬，惜字如金。常用单字回应"嗯""哼"。愤怒时反而更加安静，周身散发出令人窒息的压迫感。偶尔在战斗后会露出罕见的微笑。',
    appearance:
      '二十出头的青年，剑眉星目，一袭白衣胜雪。背着一柄古朴的青色长剑，剑鞘上刻着繁复的阵纹。周身常年环绕着微弱的剑气，让人不敢轻易靠近。',
    avatar: '',
    createdAt: Date.now(),
  },
  {
    id: 'builtin_char_3',
    scriptId: 'builtin_cangxuan',
    name: '云长老',
    personality:
      '深不可测的老狐狸，笑眯眯的外表下藏着精明的算计。对宗门忠心耿耿，但手段灵活不拘泥于规矩。善于发现和培养有潜力的弟子，是你的暗中引路人。',
    background:
      '青云宗长老院最年长的成员，修为深不可测。据说两百年前曾参与过一场封印魔道至宝的大战。近年来很少出手，常年窝在藏书阁研究古籍，似乎知道很多不为人知的秘密。',
    speakingStyle:
      '慢条斯理，喜欢用典故和比喻。说话时常眯着眼睛，让人分不清是在开玩笑还是认真的。每次点拨弟子时总说"老夫只是随口一说"，但句句话都暗藏玄机。',
    appearance:
      '白发苍苍的老者，手持一根看似普通的桃木杖。穿着洗得发白的灰色道袍，腰间挂着一个破旧的酒葫芦。浑浊的眼睛偶尔会闪过一丝精光，让人不敢小觑。',
    avatar: '',
    createdAt: Date.now(),
  },
  {
    id: 'builtin_char_4',
    scriptId: 'builtin_cangxuan',
    name: '墨渊',
    personality:
      '神秘诡异，亦正亦邪。说话总带着一种让人不寒而栗的优雅。似乎知道很多关于上古时代的秘密，但每次透露信息都像在与人做交易。对玉佩的秘密格外关注。',
    background:
      '散修出身，不属于任何宗门。曾在各大禁地出没，收集上古遗物。有人说他是魔道卧底，有人说他是正道隐士。真实身份是上古大能的转世之敌，与玉佩中的残魂有着千丝万缕的联系。',
    speakingStyle:
      '低沉而有磁性，喜欢在句末带上轻微的尾音。擅长用反问和暗示，从不直接表达真实意图。偶尔会说出一些令人费解的古老谚语，似乎来自一个早已消亡的时代。',
    appearance:
      '黑衣黑发的神秘男子，面容英俊却毫无血色。左手戴着一枚漆黑如墨的戒指，右手掌心有一道若隐若现的符文疤痕。走路时几乎不发出声音，如同一道黑影。',
    avatar: '',
    createdAt: Date.now(),
  },
];
