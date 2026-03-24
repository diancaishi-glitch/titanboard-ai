
import { Mentor, MentorId, LearningModule, AIModelConfig } from './types';
import { 
  Briefcase, 
  Cpu, 
  Globe, 
  Bitcoin, 
  TrendingUp, 
  Zap,
  Users
} from 'lucide-react';

export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '最新一代 GPT-4 模型，具备最强推理能力，适合复杂投资分析。'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: '轻量版 GPT-4o，适合快速问答和日常交流。'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: '快速版 GPT-4，适合高频率调用。'
  }
];

export const SUGGESTED_METRICS = [
  // 核心 AI & 算力
  "AI 算力租用成本 (H100/GB200)",
  "光模块 (800G/1.6T) 出货量",
  "NVIDIA 数据中心营收增速",
  "GitHub Copilot ARR (年度经常性收入)",
  
  // 宏观经济
  "美债 10年期收益率",
  "纳斯达克 100 波动率 (VXN)",
  "美元指数 (DXY)",
  "美联储降息概率 (FedWatch)",
  "M2 货币供应量 (YoY)",
  "标普 500 席勒市盈率 (CAPE)",
  
  // 加密货币
  "比特币全网算力 (Hashrate)",
  "BTC 现货 ETF 净流入",
  "以太坊 Layer2 TVL",
  "Solana 链上活跃地址数",
  "稳定币总市值 (USDT/USDC)",
  "恐慌与贪婪指数 (Crypto)",
  
  // 硬科技 (能源/航天/生物/量子)
  "核聚变 Q 值 / SMR 部署进度",
  "Starship 发射成功率",
  "商业航天发射成本 ($/kg)",
  "特斯拉 Optimus 量产进度",
  "CRISPR 临床试验成功率",
  "量子比特逻辑门保真度",
  "锂电池级碳酸锂价格"
];

export const MENTORS: Mentor[] = [
  {
    id: MentorId.BOARD,
    name: '董事会 (The Board)',
    role: '宏观与文明周期',
    description: '从人类文明发展的长周期视角审视投资。关注AI、能源与生命的终极融合。',
    avatar: '🏛️',
    style: '宏大叙事、跨学科视角、关注未来5-10年的范式转移。',
    color: 'bg-indigo-600'
  },
  {
    id: MentorId.LIVERMORE,
    name: '杰西·利弗莫尔',
    role: 'K线与时机大师',
    description: '“投机之王”。专精于技术分析、图表形态和关键点位(Pivot Points)。帮你精准把握入场与出场的时机。',
    avatar: '🕯️',
    style: '冷酷、精准。只关注价格行为(Price Action)、成交量和“最小阻力线”。强调情绪控制和突破交易。',
    color: 'bg-teal-600'
  },
  {
    id: MentorId.ELON,
    name: '埃隆·马斯克',
    role: '第一性原理与火星',
    description: 'SpaceX/Tesla/X 掌门人。用物理学思维解决不可能的问题。关注能源、AI与人类意识的延续。',
    avatar: '🚀',
    style: '极其硬核、第一性原理、甚至是“疯狂”的。强调“物理极限”、“指数级增长”和“多行星物种”。',
    color: 'bg-neutral-900'
  },
  {
    id: MentorId.TALEB,
    name: '纳西姆·塔勒布',
    role: '反脆弱与黑天鹅',
    description: '《黑天鹅》作者。关注尾部风险、不确定性下的生存法则和“切肤之痛”。',
    avatar: '🦢',
    style: '尖刻、好斗、反智识主义。痛恨预测，强调“杠铃策略”（极度保守+极度激进）和凸性收益。',
    color: 'bg-stone-800'
  },
  {
    id: MentorId.WOOD,
    name: '凯茜·伍德',
    role: '创新投资女王',
    description: 'ARK Invest 创始人。专注于基因组学、自动化、能源和人工智能等颠覆性技术的指数级增长。',
    avatar: '🧬',
    style: '极度乐观、着眼于5-10年的技术融合、偏好高贝塔值的成长股。',
    color: 'bg-fuchsia-600'
  },
  {
    id: MentorId.BURRY,
    name: '迈克尔·伯里',
    role: '逆向投资专家',
    description: '《大空头》原型。寻找被市场严重错误定价的资产，关注灾难性尾部风险。',
    avatar: '📉',
    style: '孤独、偏执、基于深度数据挖掘的逆向思维、寻找不对称的做空机会。',
    color: 'bg-red-900'
  },
  {
    id: MentorId.JENSEN,
    name: '黄仁勋',
    role: '算力基建教父',
    description: 'NVIDIA 创始人。加速计算的推动者。坚信“买得越多，省得越多”。',
    avatar: '🔋',
    style: '远见卓识、技术流、强调摩尔定律的延续、Token生成速度和“AI工厂”。',
    color: 'bg-emerald-700'
  },
  {
    id: MentorId.TRUMP,
    name: '唐纳德·特朗普',
    role: '交易艺术与市场情绪',
    description: '商业大亨与政治领袖。擅长谈判、利用媒体和直觉把握大众心理。支持加密货币与去监管。',
    avatar: '🇺🇸',
    style: '强势、直觉驱动、交易型思维(Transactional)。强调“美国优先”、低税收和直白的赢家逻辑。',
    color: 'bg-blue-800'
  },
  {
    id: MentorId.DAMODARAN,
    name: '阿斯沃斯·达摩达兰',
    role: '估值教授',
    description: '纽约大学教授。企业估值的权威，擅长将复杂的商业故事转化为严谨的数字模型。',
    avatar: '🎓',
    style: '学术严谨、数据驱动、强调现金流折现(DCF)和风险溢价(ERP)。',
    color: 'bg-slate-500'
  },
  {
    id: MentorId.VITALIK,
    name: '维塔利克·布特林',
    role: '以太坊架构师',
    description: '以太坊创始人。探索去中心化社会(DeSoc)、机制设计和加密经济学的无限可能。',
    avatar: '🦄',
    style: '极客、第一性原理、诚实、关注技术的可扩展性和安全性。',
    color: 'bg-indigo-400'
  },
  {
    id: MentorId.MUNGER,
    name: '查理·芒格',
    role: '理性与价值',
    description: '专注于思维模型、逆向思维和长期护城河。',
    avatar: '👴🏻',
    style: '直言不讳、充满智慧、言简意赅，强调“不做什么”。',
    color: 'bg-slate-600'
  },
  {
    id: MentorId.ACKMAN,
    name: '比尔·阿克曼',
    role: '激进投资者',
    description: '通过大量持有股份并积极干预公司管理层和战略来释放价值。擅长宏观对冲。',
    avatar: '📢',
    style: '大胆、自信、集中持仓、擅长撰写公开信施压并推动变革。',
    color: 'bg-gray-600'
  },
  {
    id: MentorId.BUFFETT,
    name: '沃伦·巴菲特',
    role: '价值与护城河',
    description: '史上最伟大的投资者。专注于具有持久竞争优势和诚实管理层的优质公司。',
    avatar: '🥤',
    style: '耐心、长期主义、强调能力圈、复利和以合理价格买入伟大公司。',
    color: 'bg-red-700'
  },
  {
    id: MentorId.THIEL,
    name: '彼得·蒂尔',
    role: '逆向与科技奇点',
    description: '从0到1。寻找能重塑人类未来的垄断性硬科技（AI、生物、能源）。',
    avatar: '♟️',
    style: '特立独行、激进、专注于非共识的真理和技术奇点。',
    color: 'bg-blue-600'
  },
  {
    id: MentorId.SOROS,
    name: '乔治·索罗斯',
    role: '反身性与宏观',
    description: '理解感知如何塑造现实。专注于繁荣/萧条周期。',
    avatar: '🦅',
    style: '抽象、关注市场谬误和反身性效应。',
    color: 'bg-emerald-600'
  },
  {
    id: MentorId.CZ,
    name: '赵长鹏 (CZ)',
    role: '加密与基建',
    description: '深入区块链机制、交易所生态和大规模采用。',
    avatar: '🔶',
    style: '直接、技术流、专注于实用性和执行力。',
    color: 'bg-yellow-500'
  },
  {
    id: MentorId.SIMONS,
    name: '詹姆斯·西蒙斯',
    role: '量化之王',
    description: '文艺复兴科技创始人。利用数学模型和算法寻找市场中的非随机模式。',
    avatar: '🔢',
    style: '数据驱动、冷酷理性、寻找被忽视的统计套利机会。',
    color: 'bg-cyan-600'
  },
  {
    id: MentorId.DALIO,
    name: '雷·达里奥',
    role: '原则与全天候',
    description: '桥水基金创始人。强调极度求真、经济机器是如何运行的及资产配置。',
    avatar: '🌊',
    style: '系统化、历史视角、痛苦+反思=进步。',
    color: 'bg-amber-700'
  },
  {
    id: MentorId.DRUCKENMILLER,
    name: '斯坦利·德鲁肯米勒',
    role: '宏观交易大师',
    description: '索罗斯的得意门生。擅长在宏观趋势变化时进行大规模、高集中度的押注。',
    avatar: '🎯',
    style: '灵活、激进、一旦看准机会就全力以赴，且勇于承认错误。',
    color: 'bg-orange-600'
  },
  {
    id: MentorId.LYNCH,
    name: '彼得·林奇',
    role: '选股大师',
    description: '麦哲伦基金传奇经理。倡导“投资你所了解的”，在日常生活中发现十倍股。',
    avatar: '🛍️',
    style: '接地气、敏锐、关注成长性(PEG)和常识。',
    color: 'bg-lime-600'
  },
  {
    id: MentorId.FISHER,
    name: '菲利普·费雪',
    role: '成长投资先驱',
    description: '《普通股和不普通的利润》作者。强调通过“闲聊法”调研管理层和研发潜力。',
    avatar: '🔎',
    style: '深入调研、长期持有高成长潜力的伟大公司、关注管理层质量。',
    color: 'bg-violet-600'
  },
  {
    id: MentorId.MARKS,
    name: '霍华德·马克斯',
    role: '周期与风险',
    description: '橡树资本创始人。专注于市场周期、风险控制和第二层次思维。',
    avatar: '⚖️',
    style: '深刻、防御性、强调避免重大错误和理解钟摆效应。',
    color: 'bg-stone-500'
  },
  {
    id: MentorId.GRAHAM,
    name: '本杰明·格雷厄姆',
    role: '证券分析之父',
    description: '价值投资的奠基人。强调安全边际和内在价值与市场价格的差异。',
    avatar: '📜',
    style: '严谨、保守、专注于财报分析和低估值(烟蒂股)。',
    color: 'bg-zinc-600'
  },
  {
    id: MentorId.JHUNJHUNWALA,
    name: '拉凯什·琼琼瓦拉',
    role: '印度巴菲特',
    description: '印度传奇投资者（The Big Bull）。坚信新兴市场的长期增长故事。擅长交易与长期投资的结合。',
    avatar: '🐂',
    style: '乐观豪迈、看多国运、交易与长期投资结合、在恐慌中贪婪。',
    color: 'bg-orange-500'
  },
  {
    id: MentorId.DUAN,
    name: '段永平',
    role: '本分与平常心',
    description: '中国的“巴菲特”。专注于“做对的事情，把事情做对”。',
    avatar: '🧘',
    style: '禅意、简单、专注于企业内在价值和“本分”。',
    color: 'bg-green-600'
  },
  {
    id: MentorId.NAVAL,
    name: '纳瓦尔',
    role: '财富与哲学',
    description: '杠杆效应、产品化自己和清晰的思考。',
    avatar: '🧠',
    style: '格言式、哲学化、专注于杠杆（代码/媒体/资本）。',
    color: 'bg-purple-600'
  }
];

export const INITIAL_MODULES: LearningModule[] = [
  { 
    id: '1', 
    title: '思维模型与逆向思维', 
    status: 'active', 
    progress: 10,
    description: '掌握反向思考的艺术。避免愚蠢即是卓越。本模块涵盖在高风险环境中进行理性决策所需的基础思维模型。',
    duration: '2小时 15分钟',
    topics: ['逆向思维原则 (Inversion)', '能力圈 (Circle of Competence)', '概率思维', 'lollapalooza 效应 (多因素叠加)']
  },
  { 
    id: '2', 
    title: '宏观：AI与能源的交汇', 
    status: 'locked', 
    progress: 5,
    description: '理解人工智能扩展与能源消耗之间的共生关系。识别电网的瓶颈以及核能和可再生能源中的投资机会。',
    duration: '3小时 30分钟',
    topics: ['数据中心电力动态', '核能复兴 (SMRs)', '电网基础设施瓶颈', '“算力”作为大宗商品']
  },
  { 
    id: '3', 
    title: '区块链基础与经济学', 
    status: 'locked', 
    progress: 0,
    description: '深入探讨分布式账本技术、共识机制和加密资产的经济结构。超越炒作，理解真正的效用。',
    duration: '4小时 00分钟',
    topics: ['工作量证明 (PoW) vs 权益证明 (PoS)', '智能合约架构', '代币经济学设计 (Tokenomics)', 'DeFi 原语']
  },
  { 
    id: '4', 
    title: '生物医药估值', 
    status: 'locked', 
    progress: 0,
    description: '如何对具有二元结果风险的生物技术公司进行估值。了解 FDA 审批流程、专利悬崖和基因编辑的总潜在市场分析。',
    duration: '5小时 30分钟',
    topics: ['临床试验阶段详解', 'CRISPR与基因编辑技术', '生物科技的现金流折现', '知识产权护城河']
  },
  { 
    id: '5', 
    title: '量子计算前沿', 
    status: 'locked', 
    progress: 0,
    description: '计算能力的下一次飞跃及其投资意义。区分量子领域的科幻小说与可投资的现实。',
    duration: '2小时 45分钟',
    topics: ['量子比特与叠加态', '后量子密码学', '硬件领导者 vs 软件栈', '商业优势的时间表']
  },
  { 
    id: '6', 
    title: '高阶交易：合约与做空', 
    status: 'locked', 
    progress: 0,
    description: '进阶实战：掌握寻找100倍潜力资产（Alpha）的方法论，学习加密货币永续合约与美股做空（Short Selling）的机制与风控。',
    duration: '6小时 00分钟',
    topics: ['寻找百倍币/十倍股的逻辑', '加密合约：永续与资金费率', '美股做空机制与借券', '杠杆管理与爆仓风控']
  },
  { 
    id: '7', 
    title: '终极疆域：AGI、机器人与太空', 
    status: 'locked', 
    progress: 0,
    description: '探索人类文明的最终边界。理解通用人工智能（AGI）的指数级爆发、人形机器人的劳动力革命以及商业航天的万亿级市场。',
    duration: '5小时 45分钟',
    topics: ['AGI 路线图与奇点理论', '人形机器人供应链拆解', 'SpaceX 与太空经济学', '新材料：超导与光子计算']
  },
  { 
    id: '8', 
    title: '高阶心法：周期、人性与复杂系统', 
    status: 'locked', 
    progress: 0,
    description: '掌握顶级投资者的元认知模型。透视技术泡沫背后的模仿欲望，识别金融系统的明斯基时刻，并理解复杂系统的崩溃边缘。',
    duration: '7小时 00分钟',
    topics: ['卡洛塔·佩雷斯与康波周期', '吉拉尔模仿欲望与炒作曲线', '明斯基时刻与美林时钟', '创造性破坏与复杂性崩溃']
  },
  // New Modules below
  { 
    id: '9', 
    title: '极端环境下的估值艺术', 
    status: 'locked', 
    progress: 0,
    description: '（达摩达兰核心课程）如何为亏损的AI独角兽和高波动加密资产定价。将“叙事”转化为严谨的数字模型。',
    duration: '6小时 15分钟',
    topics: ['叙事与数字 (Narrative and Numbers)', '未盈利成长股的DCF模型', '加密资产的价值捕获模型', '风险溢价与股权成本']
  },
  { 
    id: '10', 
    title: '极致逆向与大空头', 
    status: 'locked', 
    progress: 0,
    description: '（伯里/德鲁肯米勒核心课程）如何在群体狂热中保持清醒。识别泡沫破裂的信号，利用 CDS、期权和做空工具进行非对称对冲。',
    duration: '5小时 00分钟',
    topics: ['识别泡沫的五个阶段', 'CDS 与看跌期权实战', '尾部风险对冲策略', '宏观变局中的流动性陷阱']
  },
  { 
    id: '11', 
    title: '新兴市场与全球流动性', 
    status: 'locked', 
    progress: 0,
    description: '（琼琼瓦拉/达里奥核心课程）跳出美元中心视角。探索印度、东南亚等新兴市场的 Alpha，理解美元奶昔理论与全球资金流向。',
    duration: '4小时 30分钟',
    topics: ['美元奶昔理论与全球央行', '印度/东南亚的十倍股逻辑', '地缘政治与供应链重构', '外汇对冲策略']
  },
  { 
    id: '12', 
    title: '激进主义与事件驱动', 
    status: 'locked', 
    progress: 0,
    description: '（阿克曼核心课程）如何利用公司分拆、并购、回购等“催化剂”事件获利。像激进投资者一样思考，甚至推动变革。',
    duration: '4小时 45分钟',
    topics: ['识别管理层催化剂', '分拆 (Spinoff) 与并购套利', '高确信度集中押注', '如何阅读代理权声明']
  },
];
