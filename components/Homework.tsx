
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { storageService } from '../services/storageService';
import { 
  CheckCircle, Trash2, ClipboardList, Calendar, Plus, Radar, Loader2, CheckSquare, Square,
  RefreshCcw, ScanEye, Activity, Tag, Target
} from 'lucide-react';

const Homework: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'actions' | 'signals'>('actions'); 
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newSignalSignificance, setNewSignalSignificance] = useState(''); 
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await storageService.getTasks();
      setTasks(data);
    } finally { setLoading(false); }
  };

  const toggleTask = async (task: Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    await storageService.saveTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
  };

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (window.confirm("确定移除此项？")) {
      await storageService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setToast({ message: "已移除记录", type: "info" });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const addTask = async () => {
    if (!newTaskInput.trim()) return;
    let subject = undefined;
    let content = newTaskInput;
    if (newTaskInput.includes('|') || newTaskInput.includes('｜')) {
       const parts = newTaskInput.split(/\||｜/);
       if (parts.length >= 2) {
          subject = parts[0].trim();
          content = parts.slice(1).join(' ').trim();
       }
    }
    const newTask: Task = {
        id: `usr-${Date.now()}`,
        subject: subject,
        content: content,
        completed: false,
        source: '用户手动',
        timestamp: Date.now(),
        type: activeView === 'signals' ? 'signal' : 'action',
        significance: activeView === 'signals' ? (newSignalSignificance || '手动信号') : undefined
    };
    await storageService.saveTask(newTask);
    setTasks(prev => [newTask, ...prev]);
    setNewTaskInput(''); 
    setNewSignalSignificance('');
  };

  const filtered = tasks.filter(t => activeView === 'actions' ? t.type !== 'signal' : t.type === 'signal');

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32 animate-fade-in relative">
      {toast && (
        <div className="fixed top-24 right-4 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in">
          <CheckCircle size={20} /> <span className="font-bold">{toast.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
             {activeView === 'actions' ? <ClipboardList size={28} className="text-emerald-500" /> : <Radar size={28} className="text-rose-500" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{activeView === 'actions' ? '实战建议' : '行情监测'}</h1>
            <p className="text-slate-500 text-xs mt-1">AI 指令中心 · 任务全生命周期管理</p>
          </div>
        </div>
        <button onClick={loadTasks} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white border border-slate-700"><RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl mb-8">
          <button onClick={() => setActiveView('actions')} className={`flex-1 py-3.5 rounded-xl font-bold transition-all ${activeView === 'actions' ? 'bg-slate-800 text-emerald-400 shadow-xl' : 'text-slate-500'}`}>实战行动</button>
          <button onClick={() => setActiveView('signals')} className={`flex-1 py-3.5 rounded-xl font-bold transition-all ${activeView === 'signals' ? 'bg-slate-800 text-rose-400 shadow-xl' : 'text-slate-500'}`}>盯盘监测</button>
      </div>

      <div className="mb-8 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-col group focus-within:border-emerald-500/50 transition-all">
          <div className="flex items-center px-4 py-2">
            <input 
              type="text" 
              value={newTaskInput} 
              onChange={e => setNewTaskInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && addTask()} 
              placeholder={activeView === 'actions' ? "输入: 标的 | 行动建议..." : "输入: 标的 | 监测内容..."} 
              className="w-full bg-transparent border-none focus:outline-none text-white text-sm" 
            />
            <button onClick={addTask} disabled={!newTaskInput.trim()} className="p-2 bg-emerald-600 text-white rounded-xl disabled:opacity-20"><Plus size={20} /></button>
          </div>
          <div className="px-4 pb-2 text-[10px] text-slate-600 flex items-center gap-2"><Tag size={10} /> 提示: 使用 "|" 分隔标的与内容 (如: BTC | 减仓)</div>
      </div>

      <div className="space-y-4">
        {loading ? <div className="text-center py-20 opacity-30 animate-pulse"><Loader2 className="animate-spin mx-auto mb-2" />同步档案...</div> : 
          filtered.map(item => (
            <div key={item.id} className={`flex items-start p-6 rounded-[2rem] border transition-all group ${item.completed ? 'bg-slate-900/40 border-transparent grayscale opacity-40' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-2xl'}`}>
                <button onClick={() => toggleTask(item)} className={`mt-1 mr-5 transition-transform active:scale-90 flex-shrink-0 ${item.completed ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                  {item.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                </button>
                <div className="flex-1 overflow-hidden">
                   {item.subject && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded mb-2 border uppercase tracking-wider ${item.type === 'signal' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                         <Target size={10} /> {item.subject}
                      </span>
                   )}
                   <p className={`font-bold text-base md:text-lg leading-snug ${item.completed ? 'line-through text-slate-600' : 'text-slate-100'}`}>{item.content}</p>
                   {item.type === 'signal' && item.significance && <p className="text-xs text-rose-400/80 mt-2 italic flex items-center gap-2"><ScanEye size={12} /> {item.significance}</p>}
                   <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-600">
                      <span className="flex items-center gap-1.5 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">来源: {item.source}</span>
                      <span className="flex items-center gap-1.5 uppercase"><Calendar size={10} /> {new Date(item.timestamp).toLocaleDateString()}</span>
                   </div>
                </div>
                <button onClick={(e) => deleteTask(e, item.id)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer relative z-20"><Trash2 size={20} /></button>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default Homework;
