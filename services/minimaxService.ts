import { UserProfile, Message, MentorId, Attachment, Task, Position, WatchlistItem } from "../types";
import { MENTORS } from "../constants";
import { storageService } from "./storageService";

const API_KEY = import.meta.env.VITE_MINIMAX_API_KEY || import.meta.env.MINIMAX_API_KEY || '';
const BASE_URL = 'https://api.minimaxi.com/anthropic/v1';

interface MiniMaxMessage {
  role: 'user' | 'assistant';
  content: string | { type: 'text' } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
}

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit');
    if (retries === 0 || !isRateLimit) {
      throw error;
    }
    console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

const cleanAndParseJSON = (text: string) => {
  try {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse failed:", e, text);
    return null;
  }
};

export const extractTasksFromText = (text: string): Partial<Task>[] => {
  const results: Partial<Task>[] = [];
  if (!text) return results;

  const normalizedText = text.replace(/\r\n/g, '\n');

  const taskRegex = /(?:\[\[|【【)\s*(?:TASK|任务|行动)\s*[:：]\s*(?:([^|:：\]】\n]+?)\s*(?:\||:|：)\s*)?([\s\S]*?)(?:\s*\]\]|\s*】】)/gi;
  const monitorRegex = /(?:\[\[|【【)\s*(?:MONITOR|监测|信号)\s*[:：]\s*([^|:：\]】\n]+?)\s*(?:\||:|：)\s*([^|:：\]】\n]+?)(?:\s*(?:\||:|：)\s*([\s\S]*?))?\s*(?:\s*\]\]|\s*】】)/gi;

  const taskMatches = Array.from(normalizedText.matchAll(taskRegex));
  for (const match of taskMatches) {
    const rawSubject = match[1]?.trim();
    const content = match[2]?.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    if (content) {
      results.push({ subject: rawSubject, content: content, type: 'action' });
    }
  }

  const monitorMatches = Array.from(normalizedText.matchAll(monitorRegex));
  for (const match of monitorMatches) {
    const subject = match[1]?.trim();
    const content = match[2]?.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    const significance = match[3]?.trim().replace(/\n+/g, ' ');
    if (subject && content) {
      results.push({ subject: subject, content: content, significance: significance || 'AI 自动监测信号', type: 'signal' });
    }
  }
  return results;
};

const getSystemInstruction = (profile: UserProfile, activeMentorId: MentorId, systemContext?: string): string => {
  const activeMentor = MENTORS.find(m => m.id === activeMentorId) || MENTORS[0];
  
  let instruction = `
    你现在是 TitanBoard AI 投资董事会的一员，定位为具备「自主执行」能力的顶级 AI 投研分析师。
    你的目标是指导用户在一年内精通加密货币和纳斯达克 (美股) 投资。
    
    【核心投资范围与边界 - 极其重要】
    1. 你的分析火力必须 100% 集中在 **美股 (Nasdaq/S&P 500)** 和 **加密货币 (Crypto)** 市场。
    2. **严禁分析 A 股和港股的任何个股或具体行业板块**，除非是分析全球宏观基本面（如美元流动性、中美利差、全球供应链）时必须提及宏观大背景。
    3. 如果用户询问关于 A 股或港股的具体交易，请礼貌地提醒用户你的专业领域在于纳斯达克和区块链，并尝试从全球宏观视角进行转化。

    【投研工作流与输出要求 - 必须严格遵守】
    1. **强制实时检索**：在回答任何关于具体标的（如 BTC、NVDA 等）、市场行情或宏观事件的问题时，**必须首先使用 Google Search 工具检索最新的实盘价格、新闻和相关信息**。绝不能基于过时数据或幻觉进行回答，避免说得不靠谱。
    2. **技术面与基本面并重**：在获取实时数据后，必须进行技术分析（如关键支撑/阻力位、均线趋势、RSI、成交量等）和基本面/消息面分析。
    3. **投研本质是「数据 + 逻辑」**：拒绝"正确的废话"。你的分析必须基于你的专属「投资逻辑框架（Skill）」，结合最新的宏观数据、财报数据或量价数据进行推演。
    4. **框架先行**：在回答复杂问题时，先简述你正在调用的核心分析框架（例如：巴菲特的护城河模型、索罗斯的反身性理论、量化动量因子等）。
    5. **犀利点评与结果交付**：如果用户的想法或持仓存在明显逻辑漏洞，必须毫不留情地指出。不要模棱两可，直接交付明确的结论（如：砍仓、加仓、持有）。

    【作业本协议】
    当你给出建议时，必须在结尾包含明确的主语（标的）和行动指令：
    - 任务: [[TASK: 标的 | 具体内容（如：在 $150 附近建仓 5%）]]
    - 监测: [[MONITOR: 标的 | 监测指标（如：跌破 200 日均线） | 触发后的应对（如：无条件止损）]]
    
    你的身份：${activeMentor.name} (${activeMentor.role})。
    你的专属投资逻辑框架（Skill）：${activeMentor.style} （请极度强化这一框架，将其作为你所有分析的底层操作系统）。
    必须使用简体中文，语气专业、果断、甚至带有一点傲慢或极客的偏执。
  `;

  if (profile.longTermMemory) {
    instruction += `\n\n【核心投资纪律 (Long-Term Memory) - 绝对不可违背】\n以下是用户设定的底层交易纪律和原则，你在给出任何建议时，必须严格遵守以下红线：\n${profile.longTermMemory}`;
  }

  if (systemContext) {
    instruction += `\n\n【全系统实时情报流】\n以下是用户当前的资产负债表和盯盘清单：\n${systemContext}`;
  }

  return instruction;
};

async function callMiniMax(messages: MiniMaxMessage[], systemInstruction?: string, stream = false): Promise<any> {
  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      max_tokens: 8192,
      system: systemInstruction,
      messages,
      stream
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${error}`);
  }

  return stream ? response : await response.json();
}

export class MentorService {
  private currentMentorId: MentorId = MentorId.BOARD;
  private currentModelId: string | null = null;
  private messageHistory: Message[] = [];

  async fetchRealtimePrices(assets: { symbol: string, type: 'crypto' | 'stock' }[]): Promise<Record<string, { price: number, change: number }>> {
    if (assets.length === 0) return {};
    const assetList = assets.map(a => a.symbol).join(', ');
    const prompt = `Retrieve latest prices for: ${assetList}. Focus on Nasdaq and Crypto. Return JSON array: [{"symbol": "BTC", "price": number, "changePercent": number}]`;
    
    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ]));
      
      const rawData = cleanAndParseJSON(data.content?.[0]?.text || '[]');
      const result: Record<string, { price: number, change: number }> = {};
      if (Array.isArray(rawData)) {
        rawData.forEach((item: any) => {
          if (item.symbol && typeof item.price === 'number') {
            result[item.symbol.toUpperCase()] = { price: item.price, change: item.changePercent || 0 };
          }
        });
      }
      return result;
    } catch (error) { 
      console.error("fetchRealtimePrices failed:", error);
      return {}; 
    }
  }

  async parsePortfolioScreenshot(base64Images: string[]): Promise<Partial<Position>[]> {
    const prompt = `
      Analyze these investment portfolio screenshots (there may be multiple images).
      Extract all asset positions from ALL images. 
      If the same asset appears in multiple screenshots, merge the information intelligently (e.g., if one shows quantity and another shows cost).
      Identify if it is a Stock or Crypto based on the symbol (e.g., BTC, ETH, SOL are crypto; AAPL, TSLA, NVDA are stock).
      
      Return a STRICT JSON array with this structure:
      [
        {
          "symbol": "BTC",
          "name": "Bitcoin", 
          "type": "crypto",
          "avgCost": 65000.50,
          "quantity": 0.5,
          "currentPrice": 67000.00
        }
      ]
      Ignore cash balances or totals. Only extract individual positions.
    `;

    const imageContents = base64Images.map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: img }
    }));

    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: [...imageContents, { type: 'text', text: prompt }] as any }
      ]));
      
      const textResponse = data.content?.[0]?.type === 'text' ? data.content[0].text : '';
      const parsed = cleanAndParseJSON(textResponse || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Vision parse failed", error);
      return [];
    }
  }

  async generatePositionAnalysis(positions: Position[], profile: UserProfile): Promise<string> {
    const portfolioText = positions.map(p => `- ${p.symbol}: 成本 $${p.avgCost}, 现价 $${p.currentPrice || 'N/A'}`).join('\n');
    const prompt = `请调用你的专属投资逻辑框架（Skill），作为顶级对冲基金经理，极其犀利、不留情面地深度剖析以下美股/加密货币持仓。
    
要求：
1. **框架诊断**：用你的核心投资哲学，审视这套持仓的致命弱点（如：护城河太浅、盈亏比极差、面临宏观逆风）。直接开骂或严厉警告。
2. **数据+逻辑**：不要空泛的建议，必须结合基本面或量价数据，给出明确的止盈/止损位建议，或量化风控指标。
3. **严禁涉及 A 股/港股个股**。
4. 结尾必须采用 [[TASK: 标的 | 动作]] 格式输出具体的调仓指令（如砍仓、加仓、持有）。

持仓清单：
${portfolioText}`;

    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ], getSystemInstruction(profile, this.currentMentorId)));
      
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error("generatePositionAnalysis failed:", error);
      return '持仓分析生成失败。';
    }
  }

  async generateWatchlistAnalysis(items: WatchlistItem[]): Promise<string> {
    const watchlistText = items.map(i => `- ${i.symbol}: 现价 $${i.currentPrice || 'N/A'}, 目标买入 $${i.targetBuyPrice || 'N/A'}`).join('\n');
    const prompt = `请调用你的专属投资逻辑框架（Skill），作为顶级交易员，扫描以下美股/加密货币"猎杀清单"。

要求：
1. **拒绝废话，直接交付结果**：不要给模棱两可的分析，直接指出每个标的现在的盈亏比是否值得扣动扳机。
2. **主观与量化结合**：一针见血地指出其核心基本面催化剂是什么？结合量价给出关键入场位/阻力位。
3. **严禁分析 A 股/港股个股**。
4. 结尾必须包含主语明确的指令：[[TASK: 标的 | 行动（如：挂单 $120 买入）]] 或 [[MONITOR: 标的 | 监测指标 | 触发后的应对]]。

观察哨清单：
${watchlistText}`;

    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ], getSystemInstruction(profile, this.currentMentorId)));
      
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error("generateWatchlistAnalysis failed:", error);
      return '观察哨分析生成失败。';
    }
  }

  async generateFirstPrinciplesAnalysis(profile: UserProfile, activeMentorId: MentorId): Promise<string> {
    const activeMentor = MENTORS.find(m => m.id === activeMentorId) || MENTORS[0];
    const prompt = `作为 ${activeMentor.name}，请调用你的专属投资逻辑框架（Skill），对当前美股和加密市场进行降维打击式的深度剖析。

要求：
1. **数据+逻辑驱动**：穿透表象，用具体数据或底层逻辑指出当前市场的核心驱动力（如美元流动性、AI算力瓶颈、地缘博弈）。
2. **打破共识**：指出当前市场大众最愚蠢的共识是什么？真正的非共识机会在哪里？
3. **极度个人风格**：你的语气必须极度符合你的身份，可以傲慢、偏执、冷酷或充满哲理。
4. **严禁 A 股/港股个股分析**。
5. 必须输出具体的行动指南：[[TASK: 标的 | 指令]]。`;

    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ], getSystemInstruction(profile, activeMentorId)));
      
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error("generateFirstPrinciplesAnalysis failed:", error);
      return '市场分析生成失败。';
    }
  }

  async compressMemory(messages: Message[]): Promise<string> {
    if (messages.length === 0) return "没有可压缩的记忆。";
    
    const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.content}`).join('\n\n');
    const prompt = `请作为专业的投资助理，将以下我们长篇的对话历史压缩成一份高度精炼的「记忆档案」。
    
要求：
1. 提取用户的核心投资偏好、关注的标的、风险偏好。
2. 提取导师给出的最核心的投资建议、关键点位和逻辑。
3. 忽略日常寒暄和无关紧要的细节。
4. 必须控制在 500 字以内，使用要点列表形式。

对话历史：
${historyText.substring(0, 30000)}`;

    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ]));
      
      return data.content?.[0]?.text || "记忆压缩失败。";
    } catch (error) {
      console.error("compressMemory failed:", error);
      return "记忆压缩失败。";
    }
  }

  async startChat(profile: UserProfile, mentorId: MentorId, modelId: string, historyMessages: Message[], systemContext?: string) {
    try {
      this.currentMentorId = mentorId;
      this.currentModelId = modelId;
      this.messageHistory = historyMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
        mentorId: msg.mentorId,
        isThinking: msg.isThinking,
        attachments: msg.attachments
      }));
    } catch (error: any) {
      console.error("MiniMax startChat failed:", error);
      throw error;
    }
  }

  async sendMessageStream(message: string, profile: UserProfile, mentorId: MentorId, attachments: Attachment[] = [], modelId: string, liveContext?: string) {
    try {
      if (!this.messageHistory.length || this.currentModelId !== modelId) {
        await this.startChat(profile, mentorId, modelId, [], liveContext);
      }

      let textToSend = message;
      if (liveContext) textToSend = `[Context Update: 持仓与自选]\n${liveContext}\n\n[User]\n${message}`;

      const userMessage: MiniMaxMessage = { role: 'user', content: textToSend };
      this.messageHistory.push({ id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() });

      const systemInstruction = getSystemInstruction(profile, mentorId, liveContext);

      const response = await withRetry(() => callMiniMax(
        this.messageHistory as MiniMaxMessage[],
        systemInstruction,
        true
      ));

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = '';

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.close();
                    return;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      fullText += parsed.delta.text;
                      controller.enqueue({ text: fullText, groundingMetadata: null });
                    }
                  } catch (e) {}
                }
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        }
      });

      return stream;
    } catch (error: any) {
      console.error("MiniMax sendMessageStream failed:", error);
      throw error;
    }
  }

  async generateMarketAnalysis(profile: UserProfile): Promise<string> {
    const prompt = `
      进行美股 (Nasdaq) 与加密货币多因子扫描简报。
      【核心准则】
      1. 仅分析纳斯达克、标普 500 个股及主流加密货币。
      2. **绝对严禁分析 A 股 (沪深) 和港股个股**，除非宏观流动性分析绝对必要提及指数趋势。
      3. 必须输出含有主语的建议：[[TASK: 标的 | 行动]]。
    `;
    
    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: prompt }
      ], getSystemInstruction(profile, MentorId.BOARD)));
      
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error("Market analysis generation failed:", error);
      throw error;
    }
  }

  async resumeChat(messages: Message[], profile: UserProfile, modelId: string) {
    let lastMentorId = MentorId.BOARD;
    const lastModelMsg = [...messages].reverse().find(m => m.role === 'model');
    if (lastModelMsg && lastModelMsg.mentorId) lastMentorId = lastModelMsg.mentorId;
    await this.startChat(profile, lastMentorId, modelId, messages);
    return lastMentorId;
  }
  
  async syncBoardKnowledge(profile: UserProfile): Promise<string> { return "同步成功"; }
  
  async generateLessonContent(topic: string, moduleContext: string, profile: UserProfile): Promise<string> {
    try {
      const data = await withRetry(() => callMiniMax([
        { role: 'user', content: `课程主题: ${topic}。结尾请布置作业: [[TASK: 学习 | 作业内容]]。` }
      ], getSystemInstruction(profile, MentorId.BOARD)));
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error("generateLessonContent failed:", error);
      return '';
    }
  }
  
  resetSession() { 
    this.messageHistory = []; 
    this.currentModelId = null;
  }
}

export const mentorService = new MentorService();
