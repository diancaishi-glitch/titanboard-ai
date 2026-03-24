
import React, { useState, useEffect } from 'react';
import { WatchlistItem, Task } from '../types';
import { storageService } from '../services/storageService';
import { mentorService, extractTasksFromText } from '../services/geminiService';
import { 
  Eye, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Bitcoin, 
  Globe, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  X,
  Target,
  FileText,
  Clock,
  Crosshair,
  Calendar
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Watchlist: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  
  // Helper to get local ISO string for datetime-local input
  const getLocalISOString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [addForm, setAddForm] = useState<{
    symbol: string;
    type: 'crypto' | 'stock';
    observationPrice: string;
    targetBuy: string;
    targetSell: string;
    note: string;
    observationTime: string;
  }>({
    symbol: '',
    type: 'stock',
    observationPrice: '',
    targetBuy: '',
    targetSell: '',
    note: '',
    observationTime: ''
  });

  useEffect(() => {
    loadWatchlist();
    // Initialize with current local time
    setAddForm(prev => ({ ...prev, observationTime: getLocalISOString() }));
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const data = await storageService.getWatchlistItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.symbol || !addForm.observationPrice) return;
    
    // Parse time or default to now
    const obsDate = new Date(addForm.observationTime);
    const timestamp = !isNaN(obsDate.getTime()) ? obsDate.getTime() : Date.now();

    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      symbol: addForm.symbol.toUpperCase(),
      type: addForm.type,
      observationPrice: parseFloat(addForm.observationPrice),
      targetBuyPrice: addForm.targetBuy ? parseFloat(addForm.targetBuy) : undefined,
      targetSellPrice: addForm.targetSell ? parseFloat(addForm.targetSell) : undefined,
      note: addForm.note,
      timestamp: timestamp
    };
    await storageService.saveWatchlistItem(newItem);
    setItems(prev => [...prev, newItem]);
    setIsAdding(false);
    setAddForm({ 
      symbol: '', 
      type: 'stock', 
      observationPrice: '', 
      targetBuy: '', 
      targetSell: '', 
      note: '', 
      observationTime: getLocalISOString() 
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("确定移除此观察项？")) {
      await storageService.deleteWatchlistItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleRefreshPrices = async () => {
    if (items.length === 0 || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const assetsToFetch = items.map(i => ({ symbol: i.symbol, type: i.type }));
      // Service now returns { price, change }
      const priceDataMap = await mentorService.fetchRealtimePrices(assetsToFetch);
      
      const updatedItems = items.map(item => {
        const key = item.symbol.toUpperCase();
        if (priceDataMap[key]) {
          return { 
            ...item, 
            currentPrice: priceDataMap[key].price,
            dailyChangePercent: priceDataMap[key].change
          };
        }
        return item;
      });

      // Save all updated items back to storage
      for (const item of updatedItems) {
        await storageService.saveWatchlistItem(item);
      }
      setItems(updatedItems);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAnalyze = async () => {
    if (items.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const result = await mentorService.generateWatchlistAnalysis(items);
      setAnalysisResult(result);
      
      // Auto-extract tasks
      const tasks = extractTasksFromText(result);
      for (const task of tasks) {
        if (task.content) {
          await storageService.saveTask({
             id: `auto-${Date.now()}-${Math.random()}`,
             content: task.content,
             type: 'action',
             significance: '观察哨自动分析',
             source: 'Watchlist AI',
             timestamp: Date.now(),
             completed: false
          });
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriceStatus = (current: number | undefined, buy: number | undefined, sell: number | undefined) => {
    if (!current) return { color: 'text-slate-500', text: '等待报价' };
    if (buy && current <= buy * 1.05) return { color: 'text-emerald-400', text: '接近买点' };
    if (sell && current >= sell * 0.95) return { color: 'text-rose-400', text: '接近卖点' };
    return { color: 'text-blue-400', text: '持仓观察' };
  };

  const calculateObservationChange = (current: number | undefined, observation: number) => {
    if (!current) return 0;
    return ((current - observation) / observation) * 100;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32 animate-fade-in relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <Eye size={28} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">自选股观察哨 (Watchlist)</h1>
            <p className="text-slate-500 text-xs mt-1">实时监控买卖点位与基本面异动。</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleRefreshPrices} 
            disabled={isRefreshing || items.length === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl border border-slate-700 font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            实时询价
          </button>
          
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || items.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            AI 深度扫描
          </button>

          <button 
            onClick={() => setIsAdding(true)} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} />
            新增关注
          </button>
        </div>
      </div>

      {/* Analysis Result Area */}
      {analysisResult && (
        <div className="mb-8 bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl animate-fade-in">
           <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 blur-3xl rounded-full -mr-6 -mt-6 pointer-events-none"></div>
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                <Target size={20} /> 观察哨情报简报
              </h3>
              <button onClick={() => setAnalysisResult('')} className="text-slate-500 hover:text-white"><X size={20} /></button>
           </div>
           <div className="prose prose-invert prose-sm max-w-none text-slate-300">
              <ReactMarkdown>{analysisResult}</ReactMarkdown>
           </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
           <Eye size={48} className="mx-auto text-slate-700 mb-4" />
           <p className="text-slate-500 font-bold">暂无观察对象</p>
           <p className="text-xs text-slate-600 mt-1">添加感兴趣的标的，让 AI 帮您盯盘。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
             const status = getPriceStatus(item.currentPrice, item.targetBuyPrice, item.targetSellPrice);
             const obsChange = calculateObservationChange(item.currentPrice, item.observationPrice);
             const dailyChange = item.dailyChangePercent || 0;
             const isObsProfit = obsChange >= 0;
             const isDailyProfit = dailyChange >= 0;
             const obsDateDisplay = new Date(item.timestamp).toLocaleDateString();

             return (
               <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6 z-10 relative">
                     <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${item.type === 'crypto' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                           {item.type === 'crypto' ? <Bitcoin size={20} /> : <Globe size={20} />}
                        </div>
                        <div>
                           <h3 className="font-black text-white text-lg">{item.symbol}</h3>
                           <div className="flex items-center gap-2">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.text}</p>
                              <span className="text-[10px] text-slate-600 flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800" title={`开始观察: ${new Date(item.timestamp).toLocaleString()}`}>
                                <Calendar size={8} className="mr-1" /> {obsDateDisplay}
                              </span>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => handleDelete(item.id)} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>

                  <div className="space-y-4 z-10 relative">
                     <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 font-bold uppercase">当前价格 (USD)</span>
                        <span className={`text-2xl font-black ${item.currentPrice ? 'text-white' : 'text-slate-600'}`}>
                           {item.currentPrice ? `$${item.currentPrice.toLocaleString()}` : '---'}
                        </span>
                     </div>
                     
                     <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-slate-700 w-full"></div> 
                     </div>

                     {/* Percentage Grid */}
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                           <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1 flex items-center">
                              <Clock size={10} className="mr-1" /> 日内涨跌 (24h)
                           </span>
                           <span className={`text-sm font-black flex items-center ${isDailyProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isDailyProfit ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                              {dailyChange > 0 ? '+' : ''}{dailyChange.toFixed(2)}%
                           </span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                           <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1 flex items-center">
                              <Crosshair size={10} className="mr-1" /> 锚点盈亏 (Since Obs)
                           </span>
                           <span className={`text-sm font-black flex items-center ${isObsProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isObsProfit ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                              {obsChange > 0 ? '+' : ''}{obsChange.toFixed(2)}%
                           </span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
                        <div>
                           <span className="text-[10px] text-slate-600 font-bold uppercase block mb-1">目标买入</span>
                           <span className="text-sm font-bold text-emerald-400">{item.targetBuyPrice ? `$${item.targetBuyPrice.toLocaleString()}` : '---'}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] text-slate-600 font-bold uppercase block mb-1">目标止盈</span>
                           <span className="text-sm font-bold text-rose-400">{item.targetSellPrice ? `$${item.targetSellPrice.toLocaleString()}` : '---'}</span>
                        </div>
                     </div>
                     
                     {item.note && (
                        <div className="pt-2">
                           <p className="text-xs text-slate-400 italic line-clamp-2 flex items-start gap-1">
                              <FileText size={12} className="mt-0.5 flex-shrink-0 opacity-50" /> 
                              {item.note}
                           </p>
                        </div>
                     )}
                  </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-bounce-in">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white">新增观察对象</h3>
                 <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="space-y-4">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">代码 (Symbol)</label>
                       <input 
                         type="text" 
                         value={addForm.symbol} 
                         onChange={e => setAddForm({...addForm, symbol: e.target.value})} 
                         placeholder="BTC, TSLA..." 
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">类型</label>
                       <select 
                         value={addForm.type}
                         onChange={e => setAddForm({...addForm, type: e.target.value as any})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none"
                       >
                          <option value="stock">股票</option>
                          <option value="crypto">加密</option>
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">观察锚点价 (USD)</label>
                        <div className="relative">
                           <Crosshair size={16} className="absolute left-3 top-3 text-slate-500" />
                           <input 
                             type="number" 
                             value={addForm.observationPrice} 
                             onChange={e => setAddForm({...addForm, observationPrice: e.target.value})} 
                             placeholder="0.00" 
                             className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-3 text-white focus:border-blue-500 outline-none"
                           />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">开始观察时间</label>
                        <input 
                          type="datetime-local" 
                          value={addForm.observationTime} 
                          onChange={e => setAddForm({...addForm, observationTime: e.target.value})} 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-white focus:border-blue-500 outline-none text-xs"
                        />
                    </div>
                 </div>
                 <p className="text-[10px] text-slate-600 -mt-2">* 盈亏幅度将基于此价格和时间点计算</p>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目标买入价 (USD)</label>
                       <input 
                         type="number" 
                         value={addForm.targetBuy} 
                         onChange={e => setAddForm({...addForm, targetBuy: e.target.value})} 
                         placeholder="0.00" 
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目标卖出价 (USD)</label>
                       <input 
                         type="number" 
                         value={addForm.targetSell} 
                         onChange={e => setAddForm({...addForm, targetSell: e.target.value})} 
                         placeholder="0.00" 
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-rose-500 outline-none"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">观察逻辑 / 笔记</label>
                    <textarea 
                      value={addForm.note}
                      onChange={e => setAddForm({...addForm, note: e.target.value})}
                      placeholder="为什么要关注这个标的？"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none h-20 resize-none"
                    />
                 </div>

                 <button 
                   onClick={handleAdd}
                   disabled={!addForm.symbol || !addForm.observationPrice}
                   className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl mt-4 shadow-lg disabled:opacity-50 transition-all"
                 >
                    确认添加
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
