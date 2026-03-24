
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Brain, 
  Zap, 
  Dna, 
  Cpu, 
  Lock, 
  CheckCircle, 
  PlayCircle,
  AlertTriangle,
  ArrowRight,
  Atom,
  Server,
  TrendingDown,
  Plus,
  X,
  Search,
  Activity,
  RefreshCw,
  Sparkles,
  Target,
  MessageSquarePlus,
  Loader2,
  Bot,
  Rocket,
  Award,
  Layers,
  BarChart2,
  Scale,
  PieChart
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { INITIAL_MODULES, MENTORS } from '../constants';
import { UserProfile, LearningModule, MentorId, Message, Task } from '../types';
import { mentorService, extractTasksFromText } from '../services/minimaxService';
import { storageService } from '../services/storageService';

import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  Legend,
  Tooltip
} from 'recharts';

interface DashboardProps {
  userProfile: UserProfile;
  onNavigateToModule: (moduleId: string) => void;
  activeMentorId: MentorId;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile, onNavigateToModule, activeMentorId }) => {
  const isSuperUser = userProfile.name === 'laoshi';

  // --- 行业模拟 / 认知矩阵 (Industry Simulation) ---
  // 保留用户喜欢的行业雷达图
  const radarData = [
    { subject: 'AI 人工智能', A: isSuperUser ? 95 : 35, B: 90, fullMark: 100 },
    { subject: 'AGI/奇点', A: isSuperUser ? 98 : 15, B: 95, fullMark: 100 },
    { subject: '具身智能', A: isSuperUser ? 92 : 10, B: 85, fullMark: 100 },
    { subject: '能源/核聚变', A: isSuperUser ? 90 : 20, B: 85, fullMark: 100 },
    { subject: '商业航天', A: isSuperUser ? 85 : 5, B: 60, fullMark: 100 },
    { subject: '量子计算', A: isSuperUser ? 88 : 5, B: 70, fullMark: 100 },
    { subject: '前沿材料', A: isSuperUser ? 90 : 20, B: 75, fullMark: 100 },
    { subject: '生物/基因', A: isSuperUser ? 92 : 10, B: 75, fullMark: 100 },
    { subject: '算力基建', A: isSuperUser ? 96 : 40, B: 95, fullMark: 100 },
    { subject: '区块链金融', A: isSuperUser ? 94 : 25, B: 80, fullMark: 100 },
  ];

  const [visibleSeries, setVisibleSeries] = useState({ current: true, target: true });

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    if (dataKey === 'A') setVisibleSeries(p => ({ ...p, current: !p.current }));
    if (dataKey === 'B') setVisibleSeries(p => ({ ...p, target: !p.target }));
  };

  // --- 四大因子战法 (4-Factor Strategy) ---
  const strategyFactors = [
    { name: '价值因子 (Value)', desc: '安全边际 / 低估值 / 高股息', icon: Scale, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: '质量因子 (Quality)', desc: '高ROE / 护城河 / 现金流', icon: Award, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { name: '成长因子 (Growth)', desc: 'SUE超预期 / 爆发式增长', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { name: '情绪因子 (Sentiment)', desc: 'RPS动量 / 筹码结构 / 舆情', icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  // Initialize from local storage if available
  const [marketAnalysis, setMarketAnalysis] = useState<string>(() => {
    return localStorage.getItem('titan_latest_market_analysis') || '';
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState<boolean>(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [learningModules, setLearningModules] = useState<LearningModule[]>(INITIAL_MODULES);

  useEffect(() => {
    const savedModules = localStorage.getItem('titan_learning_modules');
    let modules = INITIAL_MODULES;

    if (isSuperUser) {
      modules = INITIAL_MODULES.map(m => ({
        ...m,
        status: 'completed',
        progress: 100
      }));
    } else if (savedModules) {
      try {
        const parsed = JSON.parse(savedModules) as LearningModule[];
        modules = INITIAL_MODULES.map(initMod => {
           const savedMod = parsed.find(m => m.id === initMod.id);
           if (savedMod) {
             return {
               ...initMod, 
               progress: savedMod.progress,
               status: savedMod.status === 'completed' ? 'completed' : initMod.status
             };
           }
           return initMod;
        });
      } catch (e) {
        console.error("Failed to load learning modules", e);
      }
    }

    if (!isSuperUser) {
      for (let i = 1; i < modules.length; i++) {
          if (modules[i-1].status === 'completed' && modules[i].status === 'locked') {
              modules[i] = { ...modules[i], status: 'active' };
          }
      }
    }
    
    setLearningModules(modules);
  }, [isSuperUser]);

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await mentorService.generateMarketAnalysis(userProfile);
      setMarketAnalysis(analysis);
      localStorage.setItem('titan_latest_market_analysis', analysis); // Save for Chat Interface
      setLastUpdated(Date.now());
      
      const tasks = extractTasksFromText(analysis);
      if (tasks.length > 0) {
         for (const item of tasks) {
             if (item.content) {
               const newTask: Task = {
                   id: Date.now().toString() + Math.random().toString().slice(2, 5),
                   content: item.content,
                   type: item.type || 'action',
                   significance: item.significance,
                   completed: false,
                   source: 'TitanBoard Analysis',
                   timestamp: Date.now()
               };
               await storageService.saveTask(newTask);
             }
         }
         showToast(`已提取 ${tasks.length} 个多因子选股信号到作业本。`, 'success');
      }

    } catch (error) {
      setMarketAnalysis("分析生成失败，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!marketAnalysis && !isAnalyzing) {
      handleGenerateAnalysis();
    }
  }, []);

  const activeMentorName = MENTORS.find(m => m.id === activeMentorId)?.name || '董事会';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeepAnalysis = async () => {
    if (isDeepAnalyzing) return;
    setIsDeepAnalyzing(true);
    try {
       const content = await mentorService.generateFirstPrinciplesAnalysis(userProfile, activeMentorId);
       
       const msg: Message = {
         id: Date.now().toString(),
         role: 'model',
         mentorId: activeMentorId,
         content: `**[来自作战室的深度分析请求]**\n\n${content}`,
         timestamp: Date.now(),
         isThinking: false
       };
       
       await storageService.saveMessage(msg);

       const tasks = extractTasksFromText(content);
       if (tasks.length > 0) {
          for (const item of tasks) {
              if (item.content) {
                const newTask: Task = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 5),
                    content: item.content,
                    type: item.type || 'action',
                    significance: item.significance,
                    completed: false,
                    source: activeMentorName,
                    timestamp: Date.now()
                };
                await storageService.saveTask(newTask);
              }
          }
       }

       showToast(`分析已生成！${tasks.length > 0 ? `已提取 ${tasks.length} 个建议。` : ''} 请前往“导师董事会”查看。`, 'success');
    } catch(e) {
       console.error(e);
       showToast("深度分析生成失败，请检查网络或 API 配置。", 'error');
    } finally {
       setIsDeepAnalyzing(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-20">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-mono uppercase">当前资产 (模拟)</p>
              <h3 className="text-2xl font-bold text-white mt-1">{userProfile.currentCapital}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-400">
            <span>准备部署</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-mono uppercase">学习进度</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                 {isSuperUser ? '已圆满 (365/365)' : '第 1 / 365 天'}
              </h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Brain className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-blue-400">
            <span>{isSuperUser ? '导师模式激活' : '正常推进中'}</span>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
           <div className="relative z-10">
             <div className="flex items-center space-x-2 mb-2">
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-500/30">Alpha 策略引擎</span>
                {isSuperUser && <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 ml-2">SUPER USER</span>}
             </div>
             <h3 className="text-lg font-bold text-white">宏观赛道 (Beta) + 四维因子 (Alpha)</h3>
             <p className="text-sm text-indigo-200 mt-2 italic">
               "在正确的行业赛道（雷达图）中，利用四大因子（仪表盘）精选出具备百倍潜力的标的。"
             </p>
             <div className="flex items-center mt-3 space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">🏛️</div>
                <span className="text-xs text-slate-400">- 董事会 (The Board)</span>
             </div>
           </div>
           <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
             <PieChart size={120} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Learning & Factors */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Factor Scanning Dashboard (New Request) */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
               <Activity size={16} className="mr-2" /> 四维因子扫描 (Alpha Factors)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {strategyFactors.map((factor) => (
                 <div key={factor.name} className={`bg-slate-900 border ${factor.border} p-4 rounded-xl flex items-center space-x-4 hover:bg-slate-800 transition-colors cursor-default`}>
                    <div className={`p-3 rounded-lg ${factor.bg} ${factor.color}`}>
                      <factor.icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{factor.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {factor.desc}
                      </span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-200 pt-2">年度精通路径</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {learningModules.map((module, idx) => (
              <div 
                key={module.id} 
                onClick={() => onNavigateToModule(module.id)}
                className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${module.status === 'completed' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500' : ''}
                    ${module.status === 'active' ? 'border-blue-500 bg-blue-500/20 text-blue-500 group-hover:scale-110' : ''}
                    ${module.status === 'locked' ? 'border-slate-700 bg-slate-800 text-slate-600' : ''}
                  `}>
                    {module.status === 'completed' && <CheckCircle size={20} />}
                    {module.status === 'active' && <PlayCircle size={20} />}
                    {module.status === 'locked' && <Lock size={18} />}
                  </div>
                  <div>
                    <h4 className={`font-medium ${module.status === 'locked' ? 'text-slate-500' : 'text-slate-200 group-hover:text-white'}`}>
                      第 {idx + 1} 周: {module.title}
                    </h4>
                    <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${module.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <button 
                  className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center
                    ${module.status === 'locked' 
                      ? 'bg-slate-800 text-slate-500' 
                      : 'bg-slate-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                    }
                  `}
                >
                  {module.status === 'completed' ? '回顾' : module.status === 'locked' ? '锁定' : '继续'}
                  {module.status !== 'locked' && <ArrowRight size={12} className="ml-1" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Radar & Analysis */}
        <div className="flex flex-col space-y-6">
          
          {/* Radar Chart (Industry Simulation) - KEPT AS REQUESTED */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center">
               <Layers size={18} className="mr-2 text-indigo-500" />
               十维赛道认知矩阵 (Beta)
            </h2>
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', fontSize: '12px' }} 
                    itemStyle={{ color: '#f1f5f9' }} 
                  />
                  
                  <Legend 
                    onClick={handleLegendClick} 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    formatter={(value) => <span style={{ color: '#94a3b8', cursor: 'pointer' }}>{value === 'A' ? '当前认知' : '大师级目标'}</span>}
                  />

                  {visibleSeries.current && (
                    <Radar
                      name="A"
                      dataKey="A"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="#10b981"
                      fillOpacity={0.3}
                      isAnimationActive={true}
                    />
                  )}
                  {visibleSeries.target && (
                     <Radar
                      name="B"
                      dataKey="B"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="#3b82f6"
                      fillOpacity={0.1}
                      strokeDasharray="4 4"
                      isAnimationActive={true}
                    />
                  )}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col flex-1 min-h-[400px] relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-12 bg-blue-500/10 blur-3xl rounded-full -mr-6 -mt-6 pointer-events-none"></div>
             
             <div className="flex items-center justify-between mb-2 z-10">
                <h2 className="text-lg font-bold text-slate-200 flex items-center">
                  <Activity size={18} className="mr-2 text-blue-500" />
                  AI 策略官简报 (Pro)
                </h2>
                <div className="flex items-center space-x-2">
                   <button
                     onClick={handleDeepAnalysis}
                     disabled={isDeepAnalyzing}
                     className={`p-2 rounded-lg transition-all ${
                        isDeepAnalyzing ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed' : 'hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300'
                     }`}
                     title={`生成 ${activeMentorName} 的深度分析`}
                   >
                     {isDeepAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />}
                   </button>

                   <button 
                    onClick={handleGenerateAnalysis}
                    disabled={isAnalyzing}
                    className={`p-2 rounded-lg transition-all ${
                      isAnalyzing ? 'bg-slate-800 text-slate-500' : 'hover:bg-slate-800 text-blue-400 hover:text-blue-300'
                    }`}
                    title="刷新市场简报"
                   >
                    <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                  </button>
                </div>
             </div>

             {userProfile.customMetrics && userProfile.customMetrics.length > 0 && (
               <div className="flex flex-wrap gap-1 mb-4 z-10">
                 {userProfile.customMetrics.slice(0, 3).map(metric => (
                   <span key={metric} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50 flex items-center">
                     <Target size={10} className="mr-1 text-emerald-500" />
                     {metric}
                   </span>
                 ))}
                 {userProfile.customMetrics.length > 3 && (
                   <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
                     +{userProfile.customMetrics.length - 3}
                   </span>
                 )}
               </div>
             )}
             
             <div className="flex-1 overflow-y-auto pr-2 z-10 scrollbar-thin">
                {isAnalyzing ? (
                  <div className="space-y-4 animate-pulse pt-4">
                    <div className="flex items-center space-x-2 text-blue-400/50">
                       <Sparkles size={14} />
                       <span className="text-xs font-mono">正在扫描价值与成长因子...</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-20 bg-slate-800 rounded w-full mt-2"></div>
                  </div>
                ) : marketAnalysis ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <ReactMarkdown
                      components={{
                        p(props) {
                          const {children} = props;
                          if (typeof children === 'string') {
                             if (children.includes('[[TASK:')) {
                                return <p className="text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-500/20">{children.replace(/\[\[TASK:(.*?)\]\]/g, '✅ 建议行动: $1')}</p>
                             }
                             if (children.includes('[[MONITOR:')) {
                                return <p className="text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-500/20">{children.replace(/\[\[MONITOR:\s*(.*?)\s*(?:\||:|：)\s*(.*?)\]\]/g, '📡 监测信号: $1 ($2)')}</p>
                             }
                          }
                          return <p {...props} />
                        }
                      }}
                    >
                        {marketAnalysis}
                    </ReactMarkdown>
                    {lastUpdated && (
                       <p className="text-[10px] text-slate-600 mt-4 text-right border-t border-slate-800/50 pt-2">
                         上次更新: {new Date(lastUpdated).toLocaleTimeString()}
                       </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                    <Activity size={32} className="mb-2 opacity-50" />
                    <p>点击刷新以运行四维因子扫描</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
      
      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-fade-in z-50 flex items-center space-x-3 border border-emerald-500/50 backdrop-blur-md">
          <div className="bg-white/20 p-2 rounded-full">
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-sm">{toast.type === 'success' ? '指令已执行' : '系统警报'}</h4>
            <p className="text-xs text-emerald-100">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-2 text-emerald-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
