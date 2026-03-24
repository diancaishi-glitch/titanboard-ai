
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Bot, 
  Loader2, 
  Globe, 
  ExternalLink,
  Mic,
  Image as ImageIcon,
  Paperclip,
  X,
  StopCircle,
  FileText,
  AtSign,
  ClipboardList,
  Archive
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MENTORS } from '../constants';
import { Message, MentorId, UserProfile, Attachment, Task } from '../types';
import { mentorService, extractTasksFromText } from '../services/openaiService';
import { storageService } from '../services/storageService';

interface ChatInterfaceProps {
  userProfile: UserProfile;
  selectedModelId: string;
  activeMentorId: MentorId;
  setActiveMentorId: (id: MentorId) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  userProfile, 
  selectedModelId,
  activeMentorId,
  setActiveMentorId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredMentors, setFilteredMentors] = useState(MENTORS);

  // New Task Notification
  const [newTaskCount, setNewTaskCount] = useState(0);

  // Scroll State for Mentor List
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Initialization & History Loading ---
  useEffect(() => {
    const initChat = async () => {
      try {
        const history = await storageService.getMessages();
        
        if (history.length > 0) {
          setMessages(history);
          // Resume the AI session with this history
          const lastMentor = await mentorService.resumeChat(history, userProfile, selectedModelId);
          setActiveMentorId(lastMentor);
        } else {
          // New Chat Initialization
          const welcomeMsg: Message = {
            id: 'welcome',
            role: 'model',
            content: `欢迎回到董事会，${userProfile.name}。已校准系统：**超长科技周期模式** (运行内核: \`${selectedModelId}\`)。\n\n我们完全认同您关于 **“AI + AGI + 机器人 + 能源 + 量子 + 基因 + 算力 + 航天 + 材料 + 区块链”** 十维大融合的愿景。这正是未来10年百倍回报 (100x Gems) 的诞生地。\n\n请告诉我您目前关注的细分赛道，或者上传一份研报，我们将用最长远的眼光为您剖析。`,
            timestamp: Date.now(),
            mentorId: MentorId.BOARD
          };
          setMessages([welcomeMsg]);
          await storageService.saveMessage(welcomeMsg);
          await mentorService.startChat(userProfile, MentorId.BOARD, selectedModelId, [welcomeMsg]);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initChat();
  }, [userProfile, selectedModelId]);

  // --- Scroll Logic for Mentor List ---
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachments, isLoadingHistory]);

  // --- Input Handling & Mentions ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const cursor = e.target.selectionStart;
    // Get text before cursor to check for @
    const textBefore = val.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');

    if (lastAt !== -1) {
       const query = textBefore.slice(lastAt + 1);
       if (query.length <= 20 && !query.includes('\n')) {
           const lowerQuery = query.toLowerCase();
           const filtered = MENTORS.filter(m => 
             m.name.toLowerCase().includes(lowerQuery) || 
             m.id.toLowerCase().includes(lowerQuery) ||
             m.role.toLowerCase().includes(lowerQuery)
           );
           
           if (filtered.length > 0) {
               setFilteredMentors(filtered);
               setShowMentions(true);
               setMentionQuery(query);
               return;
           }
       }
    }
    setShowMentions(false);
  };

  const insertMention = (mentor: typeof MENTORS[0]) => {
    const lastAt = inputValue.lastIndexOf('@' + mentionQuery);
    
    if (lastAt !== -1) {
      const before = inputValue.substring(0, lastAt);
      const after = inputValue.substring(lastAt + 1 + mentionQuery.length);
      const newValue = `${before}@${mentor.name} ${after}`;
      setInputValue(newValue);
      setShowMentions(false);
      inputRef.current?.focus();
    }
  };

  const detectMentorInMessage = (text: string): MentorId | null => {
    for (const mentor of MENTORS) {
      if (text.includes(`@${mentor.name}`) || text.toLowerCase().includes(`@${mentor.id.toLowerCase()}`)) {
        return mentor.id;
      }
      const nameParts = mentor.name.split(/[·\s]/).filter(p => p.length > 1);
      for (const part of nameParts) {
        if (text.includes(`@${part}`)) {
          return mentor.id;
        }
      }
    }
    return null;
  };

  // --- File Handling ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          let type: 'image' | 'file' = 'file';
          if (file.type.startsWith('image/')) type = 'image';
          setAttachments(prev => [...prev, {
            type,
            mimeType: file.type,
            data: base64Data,
            fileName: file.name
          }]);
        };
        reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // --- Audio Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          setAttachments(prev => [...prev, {
            type: 'audio',
            mimeType: 'audio/webm',
            data: base64Data,
            fileName: 'Voice Message'
          }]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风。请确保已授予权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- Memory Compression ---
  const handleCompressMemory = async () => {
    if (messages.length < 3) {
      alert("对话太短，暂不需要压缩。");
      return;
    }
    
    if (!window.confirm("这会将之前的对话浓缩为一份「记忆档案」并清理旧消息，以大幅节省 Token 消耗。确定要压缩吗？")) {
      return;
    }

    setIsCompressing(true);
    try {
      const summary = await mentorService.compressMemory(messages);
      
      const memoryMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `**🧠 记忆档案已生成 (节省 Token 模式)**\n\n之前的对话已归档并压缩为以下核心记忆点：\n\n${summary}\n\n*系统提示：后续对话将基于此记忆继续，大幅降低了 API 额度消耗。*`,
        timestamp: Date.now(),
        mentorId: activeMentorId
      };

      // Clear old messages and save only the memory message
      await storageService.clearMessages();
      await storageService.saveMessage(memoryMsg);
      
      setMessages([memoryMsg]);
      
      // Restart the backend chat session with the new compressed history
      await mentorService.startChat(userProfile, activeMentorId, selectedModelId, [memoryMsg]);
      
    } catch (error) {
      console.error("Compression failed:", error);
      alert("记忆压缩失败，请稍后重试。");
    } finally {
      setIsCompressing(false);
    }
  };

  // --- Helper to build context string ---
  const getSystemContext = async (): Promise<string> => {
    try {
      const [positions, watchlist] = await Promise.all([
        storageService.getPositions(),
        storageService.getWatchlistItems()
      ]);

      let posString = "（无）";
      if (positions.length > 0) {
        posString = positions.map(p => {
          const profitP = p.currentPrice ? ((p.currentPrice - p.avgCost) / p.avgCost) * 100 : 0;
          return `- ${p.symbol} (${p.type}): ${p.quantity} @ $${p.avgCost} (Now $${p.currentPrice || 'N/A'}, PnL ${profitP.toFixed(2)}%)`;
        }).join('\n');
      }

      let watchString = "（无）";
      if (watchlist.length > 0) {
        watchString = watchlist.map(w => {
           return `- ${w.symbol} (${w.type}): Target Buy $${w.targetBuyPrice || 'N/A'}, Sell $${w.targetSellPrice || 'N/A'} (Now $${w.currentPrice || 'N/A'})`;
        }).join('\n');
      }

      const analysis = localStorage.getItem('titan_latest_market_analysis') || "暂无最新作战室研报。";

      return `**【持仓指挥部】**\n${posString}\n\n**【自选股观察哨】**\n${watchString}\n\n**【作战室最新研报】**\n${analysis.slice(0, 800)}...`;
    } catch (e) {
      return "获取系统上下文数据失败。";
    }
  };

  // --- Messaging ---
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isStreaming) return;

    let targetMentorId = activeMentorId;
    const detectedId = detectMentorInMessage(inputValue);
    
    if (detectedId && detectedId !== activeMentorId) {
      targetMentorId = detectedId;
      setActiveMentorId(detectedId);
    }

    const currentAttachments = [...attachments];
    let currentInput = inputValue;

    if (detectedId) {
      const mentionedMentor = MENTORS.find(m => m.id === detectedId);
      if (mentionedMentor) {
        currentInput = currentInput.replace(new RegExp(`@${mentionedMentor.name}`, 'g'), `**@${mentionedMentor.name}**`);
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      attachments: currentAttachments
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    
    await storageService.saveMessage(userMsg);

    setInputValue('');
    setAttachments([]);
    setShowMentions(false);
    setIsStreaming(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMsgPlaceholder: Message = {
      id: botMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      mentorId: targetMentorId,
      isThinking: true
    };
    
    setMessages(prev => [...prev, botMsgPlaceholder]);

    try {
      const liveContext = await getSystemContext();

      const stream = await mentorService.sendMessageStream(
        currentInput, 
        userProfile, 
        targetMentorId,
        currentAttachments,
        selectedModelId,
        liveContext
      );
      
      let fullContent = '';
      let currentMetadata: any = null;
      
      for await (const chunk of stream) {
        fullContent += chunk.text;
        if (chunk.groundingMetadata) currentMetadata = chunk.groundingMetadata;

        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId 
            ? { 
                ...msg, 
                content: fullContent, 
                isThinking: false,
                groundingMetadata: currentMetadata
              } 
            : msg
        ));
      }

      const completedBotMsg: Message = {
        id: botMsgId,
        role: 'model',
        content: fullContent,
        timestamp: Date.now(),
        mentorId: targetMentorId,
        groundingMetadata: currentMetadata,
        isThinking: false
      };
      await storageService.saveMessage(completedBotMsg);

      // --- Enhanced Task Extraction Logic ---
      const extractedItems = extractTasksFromText(fullContent);
      if (extractedItems.length > 0) {
          const mentorName = MENTORS.find(m => m.id === targetMentorId)?.name || 'Board';
          let savedCount = 0;
          for (const item of extractedItems) {
             if (item.content) {
               const newTask: Task = {
                   id: Date.now().toString() + Math.random().toString().slice(2, 5),
                   subject: item.subject, // Capture subject
                   content: item.content,
                   type: item.type || 'action',
                   significance: item.significance,
                   completed: false,
                   source: mentorName,
                   timestamp: Date.now()
               };
               await storageService.saveTask(newTask);
               savedCount++;
             }
          }
          setNewTaskCount(prev => prev + savedCount);
          setTimeout(() => setNewTaskCount(0), 4000);
      }

    } catch (error: any) {
      console.error("Chat error details:", error);
      const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('429') || error?.status === 429;
      
      let errorMsg = "";
      if (isQuotaError) {
        errorMsg = "**配额耗尽:** 您当前的 Gemini API 调用已超出限额。请稍后再试，或者点击上方状态栏的「🗜️ 压缩记忆」按钮清理历史记录，也可以在左下角设置中切换到更轻量的 `gemini-3.1-flash-lite-preview` 模型。";
      } else {
        const technicalDetails = error?.message || "未知错误";
        errorMsg = `**连接错误:** 董事会目前无法联系。请检查网络或配置的模型 ID 是否有效。\n\n**技术细节:** ${technicalDetails}`;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, content: errorMsg, isThinking: false } 
          : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="image/*,application/pdf"
        multiple
      />
      
      {/* New Task Toast */}
      {newTaskCount > 0 && (
         <div className="absolute top-32 right-4 z-50 animate-bounce bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm border border-emerald-500/50">
            <ClipboardList size={16} />
            <span>已添加 {newTaskCount} 项内容到作业本!</span>
         </div>
      )}

      {/* Mentor Selector Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur relative">
        <div 
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="overflow-x-auto p-4 pb-4 snap-x snap-proximity scrollbar-custom scroll-smooth relative z-0"
        >
          <div className="flex space-x-3 min-w-max">
            {MENTORS.map((mentor) => (
              <button
                key={mentor.id}
                onClick={() => setActiveMentorId(mentor.id)}
                className={`snap-center flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 ${
                  activeMentorId === mentor.id
                    ? `${mentor.color} border-transparent text-white shadow-lg scale-105`
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-750'
                }`}
              >
                <span className="text-xl">{mentor.avatar}</span>
                <span className="font-medium text-sm">{mentor.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Fixed Status Bar */}
        <div className="px-4 pb-2 text-xs text-slate-500 text-center flex items-center justify-center space-x-3 bg-slate-900/50 backdrop-blur-sm border-t border-white/5 py-1">
          <span>当前对话: <span className="text-emerald-400 font-semibold">{MENTORS.find(m => m.id === activeMentorId)?.role}</span></span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span>运行内核: <span className="text-blue-400 font-mono">{selectedModelId}</span></span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <button 
            onClick={handleCompressMemory}
            disabled={isCompressing || messages.length < 3}
            className="flex items-center space-x-1 hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="将长对话压缩为记忆档案，大幅节省 Token 消耗"
          >
            {isCompressing ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
            <span>压缩记忆</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoadingHistory ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-500">
             <Loader2 className="animate-spin mb-2" size={32} />
             <p>正在从加密档案库读取历史记录...</p>
           </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const mentor = msg.mentorId ? MENTORS.find(m => m.id === msg.mentorId) : MENTORS[0];

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[95%] md:max-w-[75%] space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      isUser ? 'bg-indigo-600' : (mentor?.color || 'bg-slate-700')
                    }`}>
                      {isUser ? <User size={18} className="text-white" /> : <span className="text-xl">{mentor?.avatar}</span>}
                    </div>

                    {/* Bubble Container */}
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
                      
                      {/* Attachments Display */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`mb-2 flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="overflow-hidden rounded-lg border border-slate-700 shadow-sm max-w-[200px]">
                              {att.type === 'image' ? (
                                <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-auto max-h-48 object-cover" />
                              ) : (
                                <div className="bg-slate-800 p-3 flex items-center space-x-2">
                                  <FileText size={20} className="text-blue-400" />
                                  <span className="text-xs text-slate-300 truncate max-w-[120px]">{att.fileName || 'Document'}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={`px-5 py-3 rounded-2xl shadow-sm border w-full ${
                        isUser 
                          ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' 
                          : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.isThinking && !msg.content ? (
                          <div className="flex items-center space-x-2 text-slate-400">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-xs italic">董事会正在分析...</span>
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                code(props) {
                                  const {children, className, node, ...rest} = props
                                  const match = /language-(\w+)/.exec(className || '')
                                  return match ? (
                                    <code {...rest} className={className}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code {...rest} className="bg-slate-800 text-emerald-400 px-1 py-0.5 rounded font-mono text-xs">
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                                {msg.content
                                  .replace(/\[\[TASK:(.*?)\]\]/g, '✅ **作业:** $1')
                                  .replace(/\[\[MONITOR:(.*?)\]\]/g, '📡 **监测:** $1')
                                }
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!isUser && (
                        <span className="text-[10px] text-slate-500 mt-1 ml-1 uppercase tracking-wider">{mentor?.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 relative">
        <div className="max-w-4xl mx-auto relative">
          
          {/* Mention Suggestions Popup */}
          {showMentions && filteredMentors.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
              <div className="max-h-60 overflow-y-auto">
                {filteredMentors.map(mentor => (
                  <button
                    key={mentor.id}
                    onClick={() => insertMention(mentor)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center space-x-3 transition-colors"
                  >
                    <span className="text-xl">{mentor.avatar}</span>
                    <div className="overflow-hidden">
                       <p className="text-sm font-bold text-slate-200 truncate">{mentor.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group flex-shrink-0">
                  <div className="h-16 w-16 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                    {att.type === 'image' ? (
                      <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="text-blue-400" />
                    )}
                  </div>
                  <button 
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 text-white shadow-md hover:bg-rose-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2">
             <div className="flex pb-2 gap-1">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"
                 title="上传图片或文件"
               >
                 <Paperclip size={20} />
               </button>
               
               <button 
                 onMouseDown={startRecording}
                 onMouseUp={stopRecording}
                 onTouchStart={startRecording}
                 onTouchEnd={stopRecording}
                 className={`p-2 rounded-full transition-all duration-300 ${
                   isRecording 
                     ? 'bg-rose-500/20 text-rose-500 animate-pulse scale-110' 
                     : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                 }`}
                 title="按住说话"
               >
                 <Mic size={20} />
               </button>
             </div>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "正在录音..." : `向 ${MENTORS.find(m => m.id === activeMentorId)?.name.split(' ')[0]} 提问 (输入 @ 切换导师)...`}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none shadow-inner min-h-[48px] max-h-32"
              rows={1}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && attachments.length === 0) || isStreaming}
              className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
                (inputValue.trim() || attachments.length > 0) && !isStreaming
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isStreaming ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
          
          <p className="text-center text-[10px] text-slate-600 mt-2 flex items-center justify-center">
             <Globe size={10} className="mr-1" />
             全时记忆已启用。Gemini 3 系列内核驱动。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
