
import React, { useState, useEffect, useRef } from 'react';
import { Position, UserProfile, Task } from '../types';
import { storageService } from '../services/storageService';
import { mentorService, extractTasksFromText } from '../services/geminiService';
import { 
  Briefcase, Plus, Trash2, Loader2, X, Bitcoin, Globe, RefreshCw, CheckCircle,
  TrendingUp, TrendingDown, Scale, PieChart, Activity, Search, Target, AlertTriangle,
  ScanEye, Upload, ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PositionsProps {
  userProfile: UserProfile;
}

const Positions: React.FC<PositionsProps> = ({ userProfile }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  
  // Vision Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<Partial<Position>[] | null>(null);
  
  // Adjustment States
  const [adjustingPosition, setAdjustingPosition] = useState<Position | null>(null);
  const [adjustForm, setAdjustForm] = useState({ mode: 'buy' as 'buy' | 'sell', price: '', amount: '' });

  const [toast, setToast] = useState<{message: string, type?: 'success' | 'info' | 'error'} | null>(null);
  
  const [cashBalance] = useState<number>(() => {
    const saved = localStorage.getItem('titan_cash_balance');
    return saved ? parseFloat(saved) : (userProfile.estimatedCash || 100000);
  });

  const [addForm, setAddForm] = useState({ symbol: '', name: '', type: 'stock' as 'stock' | 'crypto', avgCost: '', quantity: '', sector: '' });

  useEffect(() => { loadPositions(); }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const data = await storageService.getPositions();
      setPositions(data);
    } finally { setLoading(false); }
  };

  const handleRefreshPrices = async () => {
    if (positions.length === 0 || isRefreshingPrices) return;
    setIsRefreshingPrices(true);
    setToast({ message: "同步实时行情中...", type: 'info' });
    try {
      const priceDataMap = await mentorService.fetchRealtimePrices(positions.map(p => ({ symbol: p.symbol, type: p.type })));
      const updatedPositions = positions.map(p => {
        const data = priceDataMap[p.symbol.toUpperCase()];
        return data ? { ...p, currentPrice: data.price, dailyChangePercent: data.change } : p;
      });
      await storageService.importPositions(updatedPositions);
      setPositions(updatedPositions);
      setToast({ message: "行情同步完成", type: 'success' });
    } finally {
      setIsRefreshingPrices(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAnalyzePositions = async () => {
    if (positions.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysis('');
    setToast({ message: "正在启动 AI 深度审计...", type: 'info' });
    try {
      const result = await mentorService.generatePositionAnalysis(positions, userProfile);
      setAnalysis(result);
      
      const tasks = extractTasksFromText(result);
      if (tasks.length > 0) {
        for (const t of tasks) {
          if (t.content) {
            await storageService.saveTask({
              id: `audit-${Date.now()}-${Math.random()}`,
              subject: t.subject,
              content: t.content,
              type: 'action',
              source: '持仓深度审计',
              timestamp: Date.now(),
              completed: false
            });
          }
        }
        setToast({ message: `审计完成，已提取 ${tasks.length} 条调仓建议到作业本`, type: 'success' });
      }
    } catch (e) {
      setToast({ message: "审计失败，请检查连接", type: 'error' });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // --- Image Upload Logic ---
  const handleDataFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let parsedData: Partial<Position>[] = [];

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          parsedData = Array.isArray(json) ? json : [json];
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim());
            const pos: any = {};
            headers.forEach((header, index) => {
              if (header === 'symbol' || header === 'name' || header === 'type' || header === 'sector') {
                pos[header] = values[index];
              } else if (header === 'quantity' || header === 'avgcost' || header === 'averagecost' || header === 'cost') {
                const num = parseFloat(values[index]);
                if (!isNaN(num)) {
                  if (header === 'quantity') pos.quantity = num;
                  else pos.avgCost = num;
                }
              }
            });
            if (pos.symbol && pos.quantity !== undefined && pos.avgCost !== undefined) {
              parsedData.push(pos);
            }
          }
        }

        if (parsedData.length > 0) {
          setScannedData(parsedData);
          setToast({ message: `成功解析 ${parsedData.length} 条持仓记录，请确认`, type: 'info' });
        } else {
          setToast({ message: "未能从文件中解析出有效的持仓数据", type: 'error' });
        }
      } catch (err) {
        console.error(err);
        setToast({ message: "文件解析失败，请检查格式", type: 'error' });
      } finally {
        if (dataFileInputRef.current) dataFileInputRef.current.value = '';
      }
    };
    reader.onerror = () => setToast({ message: "文件读取失败", type: 'error' });
    reader.readAsText(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check sizes
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) {
             setToast({ message: `图片 ${files[i].name} 过大，请上传小于 5MB 的截图`, type: 'error' });
             return;
        }
    }

    setIsScanning(true);
    setToast({ message: `正在读取 ${files.length} 张截图...`, type: 'info' });

    try {
        const base64Promises = Array.from(files).map((file) => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64String = event.target?.result as string;
                    // Remove prefix (data:image/jpeg;base64,)
                    const base64Data = base64String.split(',')[1];
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file as Blob);
            });
        });

        const base64Images = await Promise.all(base64Promises);
        
        const extractedPositions = await mentorService.parsePortfolioScreenshot(base64Images);
        
        if (extractedPositions && extractedPositions.length > 0) {
           setScannedData(extractedPositions);
        } else {
           setToast({ message: "未能从图片中识别出有效持仓，请确保截图清晰", type: 'error' });
        }

    } catch (err) {
        console.error(err);
        setToast({ message: "图片解析失败", type: 'error' });
    } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!scannedData) return;
    
    // Merge logic: Update existing if symbol matches, else add new
    let newPositions = [...positions];
    let addedCount = 0;
    let updatedCount = 0;

    for (const scanned of scannedData) {
       if (!scanned.symbol || !scanned.avgCost || !scanned.quantity) continue;
       
       const existingIndex = newPositions.findIndex(p => p.symbol === scanned.symbol?.toUpperCase());
       
       const newPosData: Position = {
         id: existingIndex !== -1 ? newPositions[existingIndex].id : Date.now().toString() + Math.random(),
         symbol: scanned.symbol.toUpperCase(),
         name: scanned.name || scanned.symbol.toUpperCase(),
         type: (scanned.type as 'stock' | 'crypto') || 'stock',
         avgCost: scanned.avgCost,
         quantity: scanned.quantity,
         currentPrice: scanned.currentPrice,
         timestamp: Date.now()
       };

       if (existingIndex !== -1) {
         newPositions[existingIndex] = newPosData; // Overwrite/Update
         updatedCount++;
       } else {
         newPositions.push(newPosData);
         addedCount++;
       }
    }

    await storageService.importPositions(newPositions); // Use import to save entire merged array
    setPositions(newPositions);
    setScannedData(null);
    setToast({ message: `导入成功: 新增 ${addedCount} 个，更新 ${updatedCount} 个`, type: 'success' });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAdd = async () => {
    if (!addForm.symbol || !addForm.avgCost || !addForm.quantity) return;
    const newPos: Position = {
      id: Date.now().toString(),
      symbol: addForm.symbol.toUpperCase(),
      name: addForm.name || addForm.symbol.toUpperCase(),
      type: addForm.type,
      avgCost: parseFloat(addForm.avgCost),
      quantity: parseFloat(addForm.quantity),
      sector: addForm.sector,
      timestamp: Date.now()
    };
    await storageService.savePosition(newPos);
    setPositions(prev => [...prev, newPos]);
    setIsAdding(false);
    setAddForm({ symbol: '', name: '', type: 'stock', avgCost: '', quantity: '', sector: '' });
  };

  const handleAdjustPosition = async () => {
    if (!adjustingPosition || !adjustForm.amount || !adjustForm.price) return;
    const amount = parseFloat(adjustForm.amount);
    const price = parseFloat(adjustForm.price);
    let updatedPos = { ...adjustingPosition };

    if (adjustForm.mode === 'buy') {
      // 加权平均成本计算
      const totalCost = (updatedPos.quantity * updatedPos.avgCost) + (amount * price);
      const totalQty = updatedPos.quantity + amount;
      updatedPos.avgCost = totalCost / totalQty;
      updatedPos.quantity = totalQty;
      setToast({ message: `已成功加仓 ${updatedPos.symbol}`, type: 'success' });
    } else {
      if (amount >= updatedPos.quantity) {
        await storageService.deletePosition(updatedPos.id);
        setPositions(prev => prev.filter(p => p.id !== updatedPos.id));
        setAdjustingPosition(null);
        setToast({ message: `已结清 ${updatedPos.symbol} 的所有仓位`, type: 'info' });
        return;
      }
      updatedPos.quantity -= amount;
      setToast({ message: `已成功减仓 ${updatedPos.symbol}`, type: 'success' });
    }

    await storageService.savePosition(updatedPos);
    setPositions(prev => prev.map(p => p.id === updatedPos.id ? updatedPos : p));
    setAdjustingPosition(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("确定要移除此项资产吗？此操作不可撤销。")) {
      await storageService.deletePosition(id);
      setPositions(prev => prev.filter(p => p.id !== id));
      setToast({ message: "资产已移除", type: 'info' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const totalMarketValue = positions.reduce((acc, p) => acc + ((p.currentPrice || p.avgCost) * p.quantity), 0);
  const totalEquity = totalMarketValue + cashBalance;

  if (loading) return <div className="flex h-full items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32 bg-slate-950">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
      <input type="file" ref={dataFileInputRef} onChange={handleDataFileUpload} accept=".csv,.json" className="hidden" />
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-4 z-[500] animate-bounce-in border text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 bg-slate-900 ${
          toast.type === 'success' ? 'border-emerald-500/30' : 
          toast.type === 'error' ? 'border-rose-500/30' : 'border-blue-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-500" /> : <Activity size={20} className="text-blue-500" />}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Import Modal */}
      {scannedData && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-bounce-in">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-black text-white flex items-center gap-2">
                   <ScanEye className="text-emerald-500" />
                   AI 识别结果确认
                 </h3>
                 <button onClick={() => setScannedData(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>
              <p className="text-xs text-slate-500 mb-4">AI 从您的截图中提取了以下持仓信息，请确认无误后导入。</p>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                 <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-500">
                       <tr>
                          <th className="p-3">标的</th>
                          <th className="p-3">数量</th>
                          <th className="p-3">成本 (USD)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                       {scannedData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50">
                             <td className="p-3 font-bold text-white">{item.symbol}</td>
                             <td className="p-3">{item.quantity}</td>
                             <td className="p-3">${item.avgCost?.toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              
              <button 
                onClick={confirmImport}
                className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                 <CheckCircle size={16} /> 确认并导入资产库
              </button>
           </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isScanning && (
         <div className="fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <ScanEye size={48} className="text-emerald-500 animate-pulse mb-4" />
            <h3 className="text-xl font-bold text-white">正在解析持仓截图...</h3>
            <p className="text-slate-500 text-sm mt-2">Gemini 3.0 Pro 视觉引擎工作中</p>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20"><Briefcase size={32} className="text-emerald-500" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">持仓指挥部</h1>
            <p className="text-slate-500 text-sm">Nasdaq 与加密资产实盘模拟监控</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
             onClick={() => dataFileInputRef.current?.click()}
             className="px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2"
          >
             <Upload size={18} />
             导入数据 (CSV/JSON)
          </button>
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2"
          >
             <Upload size={18} />
             上传截图
          </button>
          
          <button onClick={handleRefreshPrices} disabled={isRefreshingPrices} className="px-5 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 font-bold text-sm hover:bg-blue-500/20 transition-all flex items-center">
             <RefreshCw size={18} className={`mr-2 ${isRefreshingPrices ? 'animate-spin' : ''}`} /> 同步行情
          </button>
          <button onClick={handleAnalyzePositions} disabled={isAnalyzing || positions.length === 0} className="px-5 py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 font-bold text-sm hover:bg-indigo-500/20 transition-all flex items-center">
             {isAnalyzing ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Search size={18} className="mr-2" />} 持仓深度审计
          </button>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            录入资产
          </button>
        </div>
      </div>

      {/* Analysis Section */}
      {analysis && (
        <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] relative overflow-hidden animate-fade-in shadow-2xl">
           <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 blur-3xl rounded-full -mr-6 -mt-6 pointer-events-none"></div>
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-indigo-400 flex items-center gap-2">
                <Target size={24} /> 审计简报与作战方案
              </h3>
              <button onClick={() => setAnalysis('')} className="text-slate-500 hover:text-white p-2 bg-slate-800 rounded-lg"><X size={20} /></button>
           </div>
           <div className="prose prose-invert prose-emerald max-w-none">
              <ReactMarkdown>{analysis}</ReactMarkdown>
           </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl group hover:border-emerald-500/20 transition-all">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">总权益 (NAV)</p>
          <h3 className="text-3xl font-black text-white mt-2">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">现金余额</p>
          <h3 className="text-3xl font-black text-emerald-400 mt-2">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">持股市值</p>
          <h3 className="text-3xl font-black text-blue-400 mt-2">${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {positions.map(pos => {
          const marketValue = (pos.currentPrice || pos.avgCost) * pos.quantity;
          const pnlPercent = (((pos.currentPrice || pos.avgCost) - pos.avgCost) / pos.avgCost * 100).toFixed(2);
          const isProfit = parseFloat(pnlPercent) >= 0;

          return (
            <div key={pos.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative group hover:border-slate-700 transition-all shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl ${pos.type === 'crypto' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {pos.type === 'crypto' ? <Bitcoin size={24} /> : <Globe size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xl">{pos.symbol}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{pos.name}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                   {/* 恢复：调仓按钮 */}
                   <button 
                    onClick={() => { 
                      setAdjustingPosition(pos); 
                      setAdjustForm({ mode: 'buy', price: (pos.currentPrice || pos.avgCost).toString(), amount: '' }); 
                    }} 
                    className="p-3 bg-slate-800 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all cursor-pointer z-20"
                    title="加仓/减仓"
                   >
                     <RefreshCw size={18} />
                   </button>
                   {/* 核心：删除按钮逻辑保持 */}
                   <button 
                    type="button"
                    onClick={(e) => handleDelete(e, pos.id)} 
                    className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-xl transition-all cursor-pointer z-20 relative"
                    aria-label="删除持仓"
                   >
                    <Trash2 size={18} />
                   </button>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500"><span>成本均价</span><span>最新价格</span></div>
                <div className="flex justify-between font-black text-white"><span>${pos.avgCost.toLocaleString()}</span><span className="text-blue-400">${(pos.currentPrice || pos.avgCost).toLocaleString()}</span></div>
                
                <div className="pt-4 flex justify-between items-center border-t border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">持有价值</span>
                    <span className="font-black text-white text-sm">${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`text-sm font-black flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isProfit ? '+' : ''}{pnlPercent}%
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <span className="text-[10px] bg-slate-950 text-slate-400 px-3 py-1 rounded-full border border-slate-800 uppercase font-mono">{pos.quantity.toLocaleString()} UNITS</span>
                   <span className="text-[10px] text-slate-600">{pos.sector || 'GENERAL'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjust Modal (恢复调仓对话框) */}
      {adjustingPosition && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full animate-bounce-in shadow-2xl">
            <div className="flex justify-between mb-6 items-center">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">调仓: {adjustingPosition.symbol}</h3>
                <p className="text-xs text-slate-500 mt-1">当前持有: {adjustingPosition.quantity} UNITS</p>
              </div>
              <button onClick={() => setAdjustingPosition(null)} className="text-slate-500 hover:text-white p-2 bg-slate-800 rounded-lg"><X size={20}/></button>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-2xl mb-6">
              <button 
                onClick={() => setAdjustForm({...adjustForm, mode: 'buy'})}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${adjustForm.mode === 'buy' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
              >买入/加仓</button>
              <button 
                onClick={() => setAdjustForm({...adjustForm, mode: 'sell'})}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${adjustForm.mode === 'sell' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
              >卖出/减仓</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">成交价格 (USD)</label>
                <input type="number" value={adjustForm.price} onChange={e => setAdjustForm({...adjustForm, price: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">成交数量</label>
                <input type="number" value={adjustForm.amount} onChange={e => setAdjustForm({...adjustForm, amount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
              </div>
              
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">预估成交金额</span>
                  <span className="text-white font-bold">${(parseFloat(adjustForm.amount || '0') * parseFloat(adjustForm.price || '0')).toLocaleString()}</span>
                </div>
                {adjustForm.mode === 'buy' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">新成本估算</span>
                    <span className="text-emerald-400 font-bold">加权平均</span>
                  </div>
                )}
              </div>

              <button 
                onClick={handleAdjustPosition} 
                className={`w-full py-4 rounded-xl font-black mt-4 uppercase tracking-widest transition-all ${
                  adjustForm.mode === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                } text-white shadow-lg`}
              >
                执行{adjustForm.mode === 'buy' ? '买入' : '卖出'}指令
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full animate-bounce-in shadow-2xl">
            <div className="flex justify-between mb-6 items-center">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">录入新资产</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white p-2 bg-slate-800 rounded-lg"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">标的代码</label>
                  <input type="text" value={addForm.symbol} onChange={e => setAddForm({...addForm, symbol: e.target.value.toUpperCase()})} placeholder="BTC / NVDA" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">类型</label>
                  <select value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none">
                    <option value="stock">股票</option>
                    <option value="crypto">加密</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">平均成本 (USD)</label>
                  <input type="number" value={addForm.avgCost} onChange={e => setAddForm({...addForm, avgCost: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">持仓数量</label>
                  <input type="number" value={addForm.quantity} onChange={e => setAddForm({...addForm, quantity: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl mt-4 uppercase tracking-widest shadow-lg active:scale-95 transition-all">激活持仓记录</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Positions;
