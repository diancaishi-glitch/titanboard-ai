
export enum MentorId {
  BOARD = 'board',
  MUNGER = 'munger',
  THIEL = 'thiel',
  SOROS = 'soros',
  CZ = 'cz',
  DUAN = 'duan',
  NAVAL = 'naval',
  BUFFETT = 'buffett',
  GRAHAM = 'graham',
  SIMONS = 'simons',
  LIVERMORE = 'livermore',
  TALEB = 'taleb',
  DALIO = 'dalio',
  DRUCKENMILLER = 'druckenmiller',
  LYNCH = 'lynch',
  FISHER = 'fisher',
  MARKS = 'marks',
  VITALIK = 'vitalik',
  ELON = 'elon',
  JENSEN = 'jensen',
  TRUMP = 'trump',
  DAMODARAN = 'damodaran',
  WOOD = 'wood',
  ACKMAN = 'ackman',
  BURRY = 'burry',
  JHUNJHUNWALA = 'jhunjhunwala'
}

export interface Mentor {
  id: MentorId;
  name: string;
  role: string;
  description: string;
  avatar: string;
  style: string;
  color: string;
}

export interface Attachment {
  type: 'image' | 'audio' | 'file';
  mimeType: string;
  data: string;
  fileName?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mentorId?: MentorId;
  isThinking?: boolean;
  groundingMetadata?: any;
  attachments?: Attachment[];
}

export interface UserProfile {
  name: string;
  experienceLevel: string;
  currentCapital: string; // This is the total capital display string
  estimatedCash: number;  // New: Raw numerical cash balance
  maxBuyingPower: number; // New: Derived or set buying power
  riskTolerance: string;
  learningFocus: string[];
  primaryGoal: string;
  customMetrics?: string[];
  longTermMemory?: string; // New: Core investment principles (MEMORY.md equivalent)
}

export interface LearningModule {
  id: string;
  title: string;
  status: 'locked' | 'active' | 'completed';
  progress: number;
  description: string;
  duration: string;
  topics: string[];
  isCustom?: boolean;
  preferredMentorId?: MentorId;
}

export interface AIModelConfig {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
}

export interface Task {
  id: string;
  subject?: string; // New: The asset or topic (e.g., "BTC", "Macro")
  content: string;
  type?: 'action' | 'signal';
  significance?: string;
  source: string;
  timestamp: number;
  completed: boolean;
  isMonitoring?: boolean;
  priority?: 'high' | 'normal';
  lastChecked?: number;
  triggerResult?: string;
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  avgCost: number;
  quantity: number;
  currentPrice?: number;
  dailyChangePercent?: number; // New: Daily fluctuation
  sector?: string;
  timestamp: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  type: 'crypto' | 'stock';
  targetBuyPrice?: number;
  targetSellPrice?: number;
  observationPrice: number; // New: The price when user started watching
  dailyChangePercent?: number; // New: Daily percentage change fetched from API
  note?: string;
  currentPrice?: number;
  timestamp: number;
  aiRating?: string; // e.g., "Strong Buy", "Wait"
}
