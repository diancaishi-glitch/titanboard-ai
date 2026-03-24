
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import ProfileSetup from './components/ProfileSetup'; 
import Curriculum from './components/Curriculum';
import Homework from './components/Homework';
import Positions from './components/Positions';
import Watchlist from './components/Watchlist';
import { UserProfile, MentorId, LearningModule, Message } from './types';
import { mentorService } from './services/minimaxService';
import { storageService } from './services/storageService';
import { AI_MODELS, SUGGESTED_METRICS } from './constants';
import { 
  Cpu, 
  RefreshCw, 
  Plus, 
  X, 
  Trash2, 
  Settings as SettingsIcon,
  ShieldCheck,
  Search,
  Zap,
  Activity,
  Download,
  Upload,
  Loader2,
  Database,
  HardDrive,
  AlertTriangle,
  Brain,
  Save
} from 'lucide-react';

const DEFAULT_EMPTY_PROFILE: UserProfile | null = null;

const App: React.FC = () => {
  // Soft reload key to force component remounting after restore without refreshing the page
  const [appVersion, setAppVersion] = useState(0);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('titan_user_profile');
    try {
      return saved && saved !== "null" && saved !== "undefined" ? JSON.parse(saved) : DEFAULT_EMPTY_PROFILE;
    } catch {
      return DEFAULT_EMPTY_PROFILE;
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'learn' | 'settings' | 'tasks' | 'positions' | 'watchlist'>('dashboard');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeMentorId, setActiveMentorId] = useState<MentorId>(MentorId.BOARD);
  
  // Model Settings State
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3-flash-preview');
  const [customModelId, setCustomModelId] = useState<string>('');
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false);
  
  // Metrics Settings State
  const [newMetricInput, setNewMetricInput] = useState('');
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true);
  
  // Long Term Memory State
  const [longTermMemoryInput, setLongTermMemoryInput] = useState(userProfile?.longTermMemory || '');
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  // Backup & Restore State
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePreviewData, setRestorePreviewData] = useState<any>(null);

  useEffect(() => {
    const savedModelId = localStorage.getItem('titan_selected_model');
    if (savedModelId) {
       const isPredefined = AI_MODELS.some(m => m.id === savedModelId);
       if (isPredefined) {
         setSelectedModelId(savedModelId);
         setUseCustomModel(false);
       } else {
         setUseCustomModel(true);
         setCustomModelId(savedModelId);
         setSelectedModelId(savedModelId);
       }
    }
  }, []);

  const handleProfileComplete = (profile: UserProfile) => {
    // Inject default metrics if first time
    const profileWithMetrics = {
      ...profile,
      customMetrics: profile.customMetrics || SUGGESTED_METRICS.slice(0, 10)
    };
    setUserProfile(profileWithMetrics);
    localStorage.setItem('titan_user_profile', JSON.stringify(profileWithMetrics));
    mentorService.resetSession();
  };

  const saveModelSettings = () => {
    const modelToSave = useCustomModel ? customModelId : selectedModelId;
    if (useCustomModel && !customModelId.trim()) {
      alert("请输入有效的自定义模型 ID");
      return;
    }
    setSelectedModelId(modelToSave);
    localStorage.setItem('titan_selected_model', modelToSave);
    mentorService.resetSession();
    alert("模型配置已校准，会话已重置。");
  };

  const addCustomMetric = () => {
    if (!newMetricInput.trim() || !userProfile) return;
    const updatedMetrics = [...(userProfile.customMetrics || []), newMetricInput.trim()];
    const updatedProfile = { ...userProfile, customMetrics: updatedMetrics };
    setUserProfile(updatedProfile);
    localStorage.setItem('titan_user_profile', JSON.stringify(updatedProfile));
    setNewMetricInput('');
  };

  const removeMetric = (metric: string) => {
    if (!userProfile) return;
    const updatedMetrics = (userProfile.customMetrics || []).filter(m => m !== metric);
    const updatedProfile = { ...userProfile, customMetrics: updatedMetrics };
    setUserProfile(updatedProfile);
    localStorage.setItem('titan_user_profile', JSON.stringify(updatedProfile));
  };

  const saveLongTermMemory = () => {
    if (!userProfile) return;
    setIsSavingMemory(true);
    const updatedProfile = { ...userProfile, longTermMemory: longTermMemoryInput };
    setUserProfile(updatedProfile);
    localStorage.setItem('titan_user_profile', JSON.stringify(updatedProfile));
    
    // Reset AI session to inject new memory into system instructions immediately
    mentorService.resetSession();
    
    setTimeout(() => setIsSavingMemory(false), 1000);
  };

  const handleClearHistory = async () => {
    if (window.confirm("确定要永久清除所有聊天记录、作业和持仓数据吗？此操作无法撤销。")) {
       await storageService.clearHistory();
       setAppVersion(v => v + 1); // Soft reload
       alert("档案库已清空。");
    }
  };

  // --- UNIFIED SYSTEM BACKUP V5 (ROBUST) ---
  
  const triggerImportClick = () => {
    // Force reset input value to allow re-selecting the same file if needed
    if (backupInputRef.current) {
      backupInputRef.current.value = ''; 
      backupInputRef.current.click();
    }
  };

  const handleFullSystemBackup = async () => {
    try {
      // 1. Gather IndexedDB Data
      const dbData = await storageService.createFullBackup();
      
      // 2. Gather LocalStorage Data
      const safeGetItem = (key: string) => {
        const item = localStorage.getItem(key);
        return item === "null" || item === "undefined" ? null : item;
      };

      const lsData = {
        userProfile: safeGetItem('titan_user_profile'),
        learningModules: safeGetItem('titan_learning_modules'),
        moduleProgress: safeGetItem('titan_module_progress'),
        selectedModel: safeGetItem('titan_selected_model'),
        cashBalance: safeGetItem('titan_cash_balance'),
        maxBuyingPower: safeGetItem('titan_max_buying_power')
      };

      // 3. Bundle
      const bundle = {
        meta: {
          appName: "TitanBoard AI",
          version: "5.0", 
          type: "full_system_snapshot",
          exportedAt: new Date().toISOString(),
          user: userProfile?.name || "Unknown",
          stats: {
            messages: dbData.messages.length,
            tasks: dbData.tasks.length,
            positions: dbData.positions.length
          }
        },
        database: dbData,
        settings: lsData
      };
      
      const jsonString = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Use safe filename
      const safeDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `TitanBoard_Backup_${safeDate}.json`;
      
      document.body.appendChild(a); // Required for Firefox/some browsers
      a.click();
      
      // Robust cleanup: Wait long enough for the download to start/finish
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url); 
      }, 60000); // 60 seconds delay

    } catch (error) {
      console.error("Backup failed:", error);
      alert("系统备份失败，请检查控制台日志。");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("备份文件过大 (>100MB)，浏览器可能无法处理。");
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error("FileReader Error:", reader.error);
      alert(`文件读取错误: ${reader.error?.message}`);
    };

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || content.trim().length === 0) {
          throw new Error("文件内容为空");
        }

        let bundle;
        try {
          bundle = JSON.parse(content);
        } catch (parseError) {
          throw new Error("文件格式错误：无法解析 JSON。");
        }

        // Basic Validation
        if (!bundle || typeof bundle !== 'object') {
           throw new Error("无效的备份结构。");
        }
        
        // Loose check for compatibility
        if (!bundle.database && !bundle.meta) {
           throw new Error("无法识别此文件。请上传 TitanBoard 导出的 .json 文件。");
        }

        setRestorePreviewData(bundle);
        setShowRestoreModal(true);

      } catch (err) {
        console.error("Parse Error:", err);
        alert(`❌ 无法识别备份文件: ${err instanceof Error ? err.message : "未知错误"}`);
      } finally {
        if (backupInputRef.current) backupInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const executeRestore = async () => {
    if (!restorePreviewData) return;
    
    setShowRestoreModal(false);
    setIsRestoring(true);

    try {
       await new Promise(resolve => setTimeout(resolve, 500)); // UI delay

       const bundle = restorePreviewData;

       // 1. Restore IndexedDB
       if (bundle.database) {
          await storageService.restoreFullBackup(bundle.database);
       }

       // 2. Restore LocalStorage
       if (bundle.settings) {
          const safeSet = (key: string, value: any) => {
             if (value && typeof value === 'string') {
                localStorage.setItem(key, value);
             }
          };

          safeSet('titan_learning_modules', bundle.settings.learningModules);
          safeSet('titan_module_progress', bundle.settings.moduleProgress);
          safeSet('titan_selected_model', bundle.settings.selectedModel);
          safeSet('titan_cash_balance', bundle.settings.cashBalance);
          safeSet('titan_max_buying_power', bundle.settings.maxBuyingPower);

          // Update profile specifically to trigger state update
          if (bundle.settings.userProfile) {
             safeSet('titan_user_profile', bundle.settings.userProfile);
             try {
               const newProfile = JSON.parse(bundle.settings.userProfile);
               setUserProfile(newProfile);
             } catch(e) {
               console.error("Failed to parse restored profile", e);
             }
          }
       }
       
       setIsRestoring(false);
       setRestorePreviewData(null);
       
       // SOFT RELOAD: Force all components to remount with new data
       // This prevents "File moved/deleted" errors caused by hard page reloads in iframes
       setAppVersion(prev => prev + 1);
       
       alert("✅ 系统恢复成功！数据已更新。");

    } catch (err) {
      setIsRestoring(false);
      console.error("Restore Execution Failed:", err);
      alert(`❌ 恢复过程中发生错误: ${err instanceof Error ? err.message : "数据库写入失败"}`);
    }
  };

  if (!userProfile) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  return (
    <>
      <input 
        type="file" 
        ref={backupInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        style={{ display: 'none' }} 
      />

      {showRestoreModal && restorePreviewData && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-800">
               <div className="flex items-center space-x-3 text-blue-400 mb-2">
                 <Database size={24} />
                 <h2 className="text-xl font-bold text-white">确认系统恢复</h2>
               </div>
               <p className="text-sm text-slate-400">检测到有效的系统快照。此操作将覆盖您当前的本地数据。</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-slate-500">备份时间</span>
                   <span className="text-slate-200 font-mono">
                     {restorePreviewData.meta?.exportedAt ? new Date(restorePreviewData.meta.exportedAt).toLocaleString() : '未知时间'}
                   </span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-slate-500">用户代号</span>
                   <span className="text-slate-200 font-mono">{restorePreviewData.meta?.user || 'Unknown'}</span>
                </div>
                <div className="my-2 border-t border-slate-800"></div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                   <div>
                      <div className="text-lg font-bold text-white">{restorePreviewData.meta?.stats?.messages || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase">对话</div>
                   </div>
                   <div>
                      <div className="text-lg font-bold text-white">{restorePreviewData.meta?.stats?.tasks || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase">任务</div>
                   </div>
                   <div>
                      <div className="text-lg font-bold text-white">{restorePreviewData.meta?.stats?.positions || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase">持仓</div>
                   </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">
                  警告：恢复操作不可撤销。当前的所有进度（包括未导出的新数据）将会丢失。
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex space-x-3">
              <button 
                onClick={() => { setShowRestoreModal(false); setRestorePreviewData(null); }}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={executeRestore}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/20 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw size={18} />
                <span>立即恢复</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isRestoring && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in cursor-wait">
           <div className="relative">
             <Database size={64} className="text-blue-500 mb-6 animate-pulse" />
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
           </div>
           <h2 className="text-2xl font-black text-white mb-2">数据重构中...</h2>
           <p className="text-slate-400 font-mono text-sm max-w-xs text-center">
             正在写入 IndexedDB 并同步系统配置...
           </p>
           <div className="mt-8 flex items-center space-x-2 text-emerald-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Processing</span>
           </div>
        </div>
      )}

      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {/* Pass appVersion as key to force re-mount on restore */}
        <div key={appVersion} className="h-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              userProfile={userProfile} 
              onNavigateToModule={(id) => { setActiveModuleId(id); setActiveTab('learn'); }}
              activeMentorId={activeMentorId}
            />
          )}
          {activeTab === 'chat' && (
            <ChatInterface 
              userProfile={userProfile} 
              selectedModelId={selectedModelId}
              activeMentorId={activeMentorId}
              setActiveMentorId={setActiveMentorId}
            />
          )}
          {activeTab === 'positions' && (
            <Positions userProfile={userProfile} />
          )}
          {activeTab === 'watchlist' && (
             <Watchlist />
          )}
          {activeTab === 'learn' && (
            <Curriculum 
              initialModuleId={activeModuleId} 
              onModuleChange={(id) => setActiveModuleId(id)}
            />
          )}
          {activeTab === 'tasks' && <Homework />}
          
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in pb-32 text-slate-200">
               <div className="flex items-center space-x-4 mb-2">
                 <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
                    <SettingsIcon size={28} className="text-blue-400" />
                 </div>
                 <div>
                   <h1 className="text-2xl font-bold">策略档案 (System Settings)</h1>
                   <p className="text-slate-400 text-sm">配置你的 AI 董事会运行参数与核心逻辑。</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 
                 {/* Left Column: AI & Monitoring */}
                 <div className="space-y-8">
                    {/* AI Model Settings */}
                    <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                       <div className="flex items-center space-x-2 mb-6">
                          <Cpu size={20} className="text-emerald-500" />
                          <h2 className="font-bold text-lg">可用 AI 模型</h2>
                       </div>

                       <div className="space-y-4">
                          {!useCustomModel ? (
                            <div className="grid grid-cols-1 gap-3">
                              {AI_MODELS.map(model => (
                                <button
                                  key={model.id}
                                  onClick={() => setSelectedModelId(model.id)}
                                  className={`text-left p-4 rounded-2xl border transition-all ${
                                    selectedModelId === model.id 
                                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/20' 
                                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="font-bold text-sm">{model.name}</div>
                                  <div className="text-[10px] mt-1 opacity-70 leading-relaxed">{model.description}</div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3">
                               <label className="text-xs text-slate-500 font-mono uppercase tracking-widest">高级自定义模型 ID</label>
                               <input 
                                  type="text" 
                                  value={customModelId}
                                  onChange={(e) => setCustomModelId(e.target.value)}
                                  placeholder="例如: gemini-3.1-pro-preview"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none font-mono text-sm"
                               />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                             <div className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  id="customModelToggle"
                                  checked={useCustomModel}
                                  onChange={(e) => setUseCustomModel(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="customModelToggle" className="text-sm text-slate-400 cursor-pointer">自定义 ID 模式</label>
                             </div>
                             <button 
                               onClick={saveModelSettings}
                               className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                             >
                                <RefreshCw size={16} /> 保存并重启
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Long-Term Memory (MEMORY.md equivalent) */}
                    <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-2">
                          <div className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-1 rounded-bl-xl border-l border-b border-purple-500/30 uppercase tracking-tighter">
                             OpenClaw 内存.md 模式
                          </div>
                       </div>
                       
                       <div className="flex items-center space-x-2 mb-6">
                          <Brain size={20} className="text-purple-500" />
                          <h2 className="font-bold text-lg">核心投资学科 (长期记忆)</h2>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                             <p className="text-xs text-purple-300 leading-relaxed">
                                <strong>全局记忆档案：</strong> 
                                这里是您的「内存.md」。记录您最底层的交易纪律、绝对不能碰的红线、或者必须坚守的原则。AI 导师在每次对话前都会强制读取此档案，确保建议不偏离您的核心框架。
                             </p>
                          </div>
                          
                          <textarea
                            value={longTermMemoryInput}
                            onChange={(e) => setLongTermMemoryInput(e.target.value)}
                            placeholder="例如：&#10;1. 绝不做空比特币。&#10;2. 单个山寨币仓位不超过总资金 5%。&#10;3. 亏损 10% 必须无条件止损。&#10;4. 永远不要在 FOMO 情绪下追高。"
                            className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:border-purple-500 outline-none resize-none scrollbar-custom"
                          />
                          
                          <div className="flex justify-end">
                             <button 
                               onClick={saveLongTermMemory}
                               disabled={isSavingMemory}
                               className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                 isSavingMemory 
                                   ? 'bg-purple-600/50 text-purple-300 cursor-not-allowed' 
                                   : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                               }`}
                             >
                                {isSavingMemory ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSavingMemory ? '已保存' : '保存记忆档案'}
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Unified System Backup */}
                    <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                       <div className="flex items-center space-x-2 mb-6">
                          <HardDrive size={20} className="text-blue-500" />
                          <h2 className="font-bold text-lg">全系统快照 (Backup)</h2>
                       </div>
                       
                       <div className="space-y-3">
                          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 mb-2">
                             <p className="text-xs text-slate-400 leading-relaxed">
                                <strong className="text-white">一键备份/还原：</strong> 
                                无需再单独导出持仓或聊天记录。系统快照将打包您的所有数据（对话、持仓、作业、进度、配置），方便您在不同设备间无缝迁移“作战指挥室”。
                             </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <button 
                               onClick={handleFullSystemBackup}
                               className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/20 transition-all text-sm font-bold active:scale-95 group"
                             >
                                <Download size={24} className="group-hover:scale-110 transition-transform" /> 
                                <span>下载系统快照</span>
                             </button>

                             <button 
                               onClick={triggerImportClick}
                               className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20 transition-all text-sm font-bold active:scale-95 group"
                             >
                                <Upload size={24} className="group-hover:scale-110 transition-transform" /> 
                                <span>恢复系统快照</span>
                             </button>
                          </div>
                       </div>
                    </section>

                    {/* Account Actions */}
                    <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl border-rose-500/10">
                       <div className="flex items-center space-x-2 mb-6">
                          <ShieldCheck size={20} className="text-rose-500" />
                          <h2 className="font-bold text-lg">数据与档案管理</h2>
                       </div>
                       <div className="space-y-4">
                          <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                             <h4 className="text-sm font-bold text-rose-400 mb-1">危险区域</h4>
                             <p className="text-xs text-slate-500 leading-relaxed mb-4">执行此操作将抹除您在 TitanBoard 上的所有印记，初始化所有数据。</p>
                             <button 
                               onClick={handleClearHistory}
                               className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-rose-500/20"
                             >
                                <Trash2 size={16} /> 清空所有本地数据
                             </button>
                          </div>
                       </div>
                    </section>
                 </div>

                 {/* Right Column: Metrics & Monitoring */}
                 <div className="space-y-8">
                    <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col h-full">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-2">
                            <Activity size={20} className="text-blue-500" />
                            <h2 className="font-bold text-lg">实时监测信号库</h2>
                          </div>
                          <div className="flex items-center space-x-2">
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isMonitoringEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                               {isMonitoringEnabled ? 'ACTIVE' : 'DISABLED'}
                             </span>
                             <button 
                               onClick={() => setIsMonitoringEnabled(!isMonitoringEnabled)}
                               className={`w-10 h-5 rounded-full p-1 transition-colors ${isMonitoringEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                             >
                               <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isMonitoringEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                             </button>
                          </div>
                       </div>

                       <div className="flex-1 space-y-4">
                          <div className="relative">
                             <Search className="absolute left-3 top-3 text-slate-600" size={16} />
                             <input 
                                type="text" 
                                value={newMetricInput}
                                onChange={(e) => setNewMetricInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCustomMetric()}
                                placeholder="新增关注指标 (如: ETH Gas Price)..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                             />
                             <button 
                               onClick={addCustomMetric}
                               className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all"
                             >
                                <Plus size={16} />
                             </button>
                          </div>

                          <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 max-h-[450px] overflow-y-auto scrollbar-custom">
                             <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] mb-4">当前监控中的指标集</p>
                             <div className="flex flex-wrap gap-2">
                                {(userProfile.customMetrics || []).map(metric => (
                                   <div key={metric} className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl group hover:border-blue-500/50 transition-all">
                                      <span className="text-xs text-slate-300">{metric}</span>
                                      <button 
                                        onClick={() => removeMetric(metric)}
                                        className="text-slate-600 hover:text-rose-500 transition-colors"
                                      >
                                         <X size={14} />
                                      </button>
                                   </div>
                                ))}
                             </div>
                             {(userProfile.customMetrics || []).length === 0 && (
                                <div className="text-center py-10">
                                   <p className="text-xs text-slate-600">暂无监控指标。加入指标以获得更精准的市场洞察。</p>
                                </div>
                             )}
                          </div>

                          <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                             <div className="flex items-start space-x-3">
                                <Zap size={18} className="text-blue-400 mt-1 flex-shrink-0" />
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  提示: 这里的指标池将直接作为上下文传递给“作战指挥室”的 Gemini 3.0 模型。模型会利用这些关键词对全网实时新闻和研报进行深度过滤与解读。
                                </p>
                             </div>
                          </div>
                       </div>
                    </section>
                 </div>
               </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default App;
