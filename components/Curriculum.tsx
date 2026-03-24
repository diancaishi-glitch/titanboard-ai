
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Lock, 
  PlayCircle, 
  PauseCircle, 
  Clock, 
  List,
  ChevronRight,
  ArrowLeft,
  FileText,
  Video,
  X,
  Award,
  RotateCcw,
  Activity,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  Save,
  Trash2,
  ClipboardList
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LearningModule, UserProfile, MentorId, Task } from '../types';
import { INITIAL_MODULES, MENTORS } from '../constants';
import { mentorService, extractTasksFromText } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface CurriculumProps {
  initialModuleId?: string | null;
  onModuleChange?: (moduleId: string | null) => void;
}

const Curriculum: React.FC<CurriculumProps> = ({ initialModuleId, onModuleChange }) => {
  // Load profile first to check for super user status
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('titan_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const isSuperUser = userProfile?.name === 'laoshi';

  // Local state to manage modules with smart merging of persistence and constants
  const [localModules, setLocalModules] = useState<LearningModule[]>(() => {
    const saved = localStorage.getItem('titan_learning_modules');
    let modules = [...INITIAL_MODULES];

    if (isSuperUser) {
      // Super user "laoshi" gets everything completed and unlocked
      modules = INITIAL_MODULES.map(m => ({
        ...m,
        status: 'completed' as const,
        progress: 100
      }));
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved) as LearningModule[];
        
        // 1. Update Core Modules with saved progress
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

        // 2. Append Custom Modules
        const customModules = parsed.filter(m => m.isCustom);
        modules = [...modules, ...customModules];

      } catch (e) {
        console.error("Error parsing saved modules", e);
      }
    }

    // Progression Logic for Core Modules: If module [i-1] is completed, unlock module [i]
    if (!isSuperUser) {
      for (let i = 1; i < modules.length; i++) {
          if (!modules[i].isCustom && modules[i-1].status === 'completed' && modules[i].status === 'locked') {
              modules[i] = { ...modules[i], status: 'active' };
          }
      }
    }

    return modules;
  });

  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  
  // Custom Path Creation State
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newPathForm, setNewPathForm] = useState({
    title: '',
    description: '',
    topicsStr: '',
    mentorId: MENTORS[0].id as MentorId
  });
  
  // Map module ID to a Set of completed topics
  const [moduleProgressMap, setModuleProgressMap] = useState<Record<string, Set<string>>>(() => {
    if (isSuperUser) {
      // For super user, all topics in all initial modules are completed
      const fullMap: Record<string, Set<string>> = {};
      INITIAL_MODULES.forEach(m => {
        fullMap[m.id] = new Set(m.topics);
      });
      return fullMap;
    }

    const saved = localStorage.getItem('titan_module_progress');
    if (saved) {
      try {
        const parsed: Record<string, string[]> = JSON.parse(saved);
        const map: Record<string, Set<string>> = {};
        Object.keys(parsed).forEach(key => {
          map[key] = new Set(parsed[key]);
        });
        return map;
      } catch (e) {
        console.error("Failed to parse progress map", e);
        return {};
      }
    }
    return {};
  });
  
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showCompletionSuccess, setShowCompletionSuccess] = useState(false);
  
  // AI Content State
  const [lessonContent, setLessonContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [lessonCache, setLessonCache] = useState<Record<string, string>>({});
  
  const [newTaskCount, setNewTaskCount] = useState(0);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('titan_learning_modules', JSON.stringify(localModules));
  }, [localModules]);

  useEffect(() => {
    const toSave: Record<string, string[]> = {};
    Object.keys(moduleProgressMap).forEach(key => {
      toSave[key] = Array.from(moduleProgressMap[key]);
    });
    localStorage.setItem('titan_module_progress', JSON.stringify(toSave));
  }, [moduleProgressMap]);

  // Handle Initial Navigation
  useEffect(() => {
    if (initialModuleId) {
      const module = localModules.find(m => m.id === initialModuleId);
      if (module) {
        setSelectedModule(module);
      }
    }
  }, [initialModuleId, localModules]);

  // Load AI content when lesson changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!isLearning || !activeLesson || !selectedModule || !userProfile) return;

      const cacheKey = `${selectedModule.id}-${activeLesson}`;
      
      if (lessonCache[cacheKey]) {
        setLessonContent(lessonCache[cacheKey]);
        return;
      }

      setIsLoadingContent(true);
      setLessonContent(''); 

      try {
        const content = await mentorService.generateLessonContent(
          activeLesson, 
          selectedModule.title, 
          userProfile
        );
        setLessonContent(content);
        setLessonCache(prev => ({ ...prev, [cacheKey]: content }));
        
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
                    source: `Lesson: ${activeLesson}`,
                    timestamp: Date.now()
                };
                await storageService.saveTask(newTask);
               }
            }
            setNewTaskCount(tasks.length);
            setTimeout(() => setNewTaskCount(0), 4000);
        }
      } catch (err) {
        setLessonContent("无法加载课程内容。请检查网络连接。");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [isLearning, activeLesson, selectedModule, lessonCache]);

  // Auto-Unlock & Progress Sync Logic
  useEffect(() => {
    if (!selectedModule || isSuperUser) return;

    const completedSet = moduleProgressMap[selectedModule.id] || new Set();
    const totalTopics = selectedModule.topics.length;
    const progressPercent = totalTopics > 0 ? Math.round((completedSet.size / totalTopics) * 100) : 0;
    const allTopicsCompleted = totalTopics > 0 && completedSet.size === totalTopics;

    const currentStoredModule = localModules.find(m => m.id === selectedModule.id);
    
    if (currentStoredModule && (currentStoredModule.progress !== progressPercent || (allTopicsCompleted && currentStoredModule.status !== 'completed'))) {
      
      const updatedModules = localModules.map(m => {
        if (m.id === selectedModule.id) {
          return { 
            ...m, 
            progress: progressPercent,
            status: allTopicsCompleted ? 'completed' as const : m.status 
          };
        }
        return m;
      });

      if (allTopicsCompleted && currentStoredModule.status !== 'completed' && !selectedModule.isCustom) {
        const currentIndex = updatedModules.findIndex(m => m.id === selectedModule.id);
        if (currentIndex !== -1 && currentIndex < updatedModules.length - 1) {
          if (!updatedModules[currentIndex + 1].isCustom) {
             updatedModules[currentIndex + 1] = {
              ...updatedModules[currentIndex + 1],
              status: 'active'
            };
          }
        }
        
        if (isLearning) {
            setShowCompletionSuccess(true);
        }
      } else if (allTopicsCompleted && selectedModule.isCustom && isLearning) {
         setShowCompletionSuccess(true);
      }

      setLocalModules(updatedModules);
      
      const updatedCurrent = updatedModules.find(m => m.id === selectedModule.id);
      if (updatedCurrent) setSelectedModule(updatedCurrent);
    }
  }, [moduleProgressMap, selectedModule, localModules, isLearning, isSuperUser]);


  const handleModuleSelect = (module: LearningModule) => {
    setSelectedModule(module);
    setShowCompletionSuccess(false);
    if (onModuleChange) onModuleChange(module.id);
  };

  const handleStartLearning = (module: LearningModule) => {
    if (module.status === 'locked') return;
    setIsLearning(true);
    if (!activeLesson && module.topics.length > 0) setActiveLesson(module.topics[0]);
    setIsVideoPlaying(true);
    setShowCompletionSuccess(false);
  };

  const toggleTopicCompletion = (topic: string) => {
    if (!selectedModule) return;
    
    setModuleProgressMap(prev => {
      const currentSet = new Set(prev[selectedModule.id] || []);
      if (currentSet.has(topic)) {
        currentSet.delete(topic);
      } else {
        currentSet.add(topic);
      }
      return { ...prev, [selectedModule.id]: currentSet };
    });
  };

  const handleResetModule = () => {
    if (!selectedModule) return;
    
    setModuleProgressMap(prev => {
      const next = { ...prev };
      delete next[selectedModule.id];
      return next;
    });

    setLocalModules(prev => prev.map(m => {
      if (m.id === selectedModule.id) {
        return { ...m, status: 'active', progress: 0 };
      }
      return m;
    }));

    setShowCompletionSuccess(false);
    setIsVideoPlaying(false);
    if (selectedModule.topics.length > 0) setActiveLesson(selectedModule.topics[0]);
  };

  const handleDeleteCustomModule = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个自定义学习路径吗？')) {
      const newModules = localModules.filter(m => m.id !== moduleId);
      setLocalModules(newModules);
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
      }
    }
  };

  const handleCreateCustomPath = () => {
    if (!newPathForm.title.trim() || !newPathForm.topicsStr.trim()) {
      alert("请输入完整的标题和主题列表");
      return;
    }

    const topics = newPathForm.topicsStr.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    
    const newModule: LearningModule = {
      id: `custom-${Date.now()}`,
      title: newPathForm.title,
      description: newPathForm.description || '由用户定义的个性化探索路径。',
      status: 'active', 
      progress: 0,
      duration: '自定节奏',
      topics: topics,
      isCustom: true,
      preferredMentorId: newPathForm.mentorId
    };

    setLocalModules(prev => [...prev, newModule]);
    setIsCreatingCustom(false);
    setNewPathForm({ title: '', description: '', topicsStr: '', mentorId: MENTORS[0].id as MentorId });
    
    handleModuleSelect(newModule);
  };

  const handleNextLesson = () => {
    if (!selectedModule || !activeLesson) return;

    setModuleProgressMap(prev => {
      const currentSet = new Set(prev[selectedModule.id] || []);
      currentSet.add(activeLesson);
      return { ...prev, [selectedModule.id]: currentSet };
    });
    
    const currentIndex = selectedModule.topics.indexOf(activeLesson);
    if (currentIndex < selectedModule.topics.length - 1) {
      setActiveLesson(selectedModule.topics[currentIndex + 1]);
      setIsVideoPlaying(true);
    } 
  };

  const toggleVideo = () => setIsVideoPlaying(!isVideoPlaying);

  const exitLearningMode = () => {
    setIsLearning(false);
    setShowCompletionSuccess(false);
    setIsVideoPlaying(false);
  };

  if (isLearning && selectedModule && showCompletionSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 animate-fade-in text-center p-8">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <Award size={48} className="text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">恭喜完成!</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          你已经完成了 <strong>{selectedModule.title}</strong> 的所有课程。
        </p>
        <div className="flex space-x-4">
          <button 
            onClick={exitLearningMode}
            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center"
          >
            <ArrowLeft size={18} className="mr-2" /> 返回概览
          </button>
          {!selectedModule.isCustom && (
            <button 
              onClick={() => {
                const currentIndex = localModules.findIndex(m => m.id === selectedModule.id);
                if (currentIndex !== -1 && currentIndex < localModules.length - 1) {
                   const nextModule = localModules[currentIndex + 1];
                   setSelectedModule(nextModule);
                   setActiveLesson(nextModule.topics[0]);
                   setShowCompletionSuccess(false);
                } else {
                   exitLearningMode();
                }
              }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
            >
              继续下一模块
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLearning && selectedModule) {
    const completedSet = moduleProgressMap[selectedModule.id] || new Set();
    const activeMentor = selectedModule.preferredMentorId 
      ? MENTORS.find(m => m.id === selectedModule.preferredMentorId) 
      : null;
    
    return (
      <div className="h-full flex flex-col bg-slate-950 animate-fade-in relative">
        {newTaskCount > 0 && (
           <div className="absolute top-20 right-8 z-50 animate-bounce bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm border border-emerald-500/50">
              <ClipboardList size={16} />
              <span>已从课程中添加 {newTaskCount} 项内容!</span>
           </div>
        )}

        <div className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button 
              onClick={exitLearningMode}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                 <h2 className="text-sm text-slate-400 font-mono">
                    {selectedModule.isCustom ? '自定义路径' : `模块 ${selectedModule.id}`}
                 </h2>
                 {activeMentor && (
                   <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full flex items-center">
                      <span className="mr-1">{activeMentor.avatar}</span> {activeMentor.name}
                   </span>
                 )}
              </div>
              <h1 className="font-bold text-slate-200 text-sm md:text-base">{selectedModule.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden md:block">
               <p className="text-xs text-slate-400">
                 进度: {completedSet.size} / {selectedModule.topics.length}
               </p>
               <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1">
                 <div 
                   className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                   style={{ 
                     width: `${(completedSet.size / selectedModule.topics.length) * 100}%` 
                   }}
                 ></div>
               </div>
             </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col flex-shrink-0">
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">课程内容</h3>
              <div className="space-y-2">
                {selectedModule.topics.map((topic, idx) => {
                   const isActive = activeLesson === topic;
                   const isCompleted = completedSet.has(topic);
                   return (
                    <div 
                      key={topic}
                      className={`w-full p-2 rounded-lg text-sm flex items-start space-x-2 transition-colors ${
                        isActive 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : 'hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTopicCompletion(topic);
                        }}
                        className={`mt-0.5 p-0.5 rounded transition-colors ${
                          isCompleted ? 'text-emerald-500' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={isCompleted ? "标记为未完成" : "标记为已完成"}
                      >
                         {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      <button 
                         onClick={() => setActiveLesson(topic)}
                         className={`flex-1 text-left ${
                           isActive ? 'text-emerald-400 font-medium' : 'text-slate-400'
                         } ${isCompleted && !isActive ? 'line-through opacity-60' : ''}`}
                      >
                         {topic}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-800">
               <div className="text-xs text-slate-500 text-center">
                  {isSuperUser ? '超级用户已解锁所有模块' : '勾选所有主题以解锁下一模块'}
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
              
              <div 
                className="aspect-video bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-2xl cursor-pointer flex-shrink-0"
                onClick={toggleVideo}
              >
                {isVideoPlaying ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 animate-pulse"></div>
                    <div className="absolute inset-0 opacity-20" 
                         style={{ 
                           backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', 
                           backgroundSize: '20px 20px' 
                         }}>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="text-center z-10">
                             <div className="flex justify-center items-end space-x-1 mb-4 h-16">
                                <div className="w-2 bg-emerald-500 animate-[bounce_1s_infinite] rounded-t-sm" style={{ height: '60%' }}></div>
                                <div className="w-2 bg-emerald-400 animate-[bounce_1.2s_infinite] rounded-t-sm" style={{ height: '90%' }}></div>
                                <div className="w-2 bg-emerald-600 animate-[bounce_0.8s_infinite] rounded-t-sm" style={{ height: '40%' }}></div>
                                <div className="w-2 bg-emerald-500 animate-[bounce_1.5s_infinite] rounded-t-sm" style={{ height: '70%' }}></div>
                                <div className="w-2 bg-emerald-300 animate-[bounce_1.1s_infinite] rounded-t-sm" style={{ height: '50%' }}></div>
                             </div>
                             <div className="bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-emerald-500/30">
                               <p className="text-emerald-400 font-mono text-xs flex items-center">
                                 <Activity size={14} className="mr-2 animate-pulse" />
                                 AI 教学数据流传输中...
                               </p>
                             </div>
                         </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
                      <PauseCircle size={64} className="text-white drop-shadow-lg scale-95 group-hover:scale-100 transition-transform" />
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-xs text-white font-mono pointer-events-none z-20">
                      LIVE
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900 group-hover:bg-slate-800 transition-colors">
                    <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform z-10">
                      <PlayCircle size={36} className="text-white fill-current ml-1" />
                    </div>
                    <p className="absolute bottom-1/4 text-slate-400 text-sm font-medium">继续学习</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                 <div className="flex space-x-4">
                    <button 
                       onClick={handleResetModule}
                       className="flex items-center space-x-2 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors border border-rose-500/20"
                    >
                       <RotateCcw size={14} />
                       <span>重置本模块</span>
                    </button>
                 </div>
                 <div className="text-xs text-slate-500">
                    AI 内核: Gemini 3.0 Pro
                 </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{activeLesson}</h1>
                  {isLoadingContent && <Loader2 className="animate-spin text-emerald-500" size={24} />}
                </div>

                {isLoadingContent ? (
                  <div className="space-y-4 animate-pulse max-w-2xl">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-32 bg-slate-800 rounded w-full mt-4"></div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                    <ReactMarkdown
                       components={{
                        p(props) {
                          const {children} = props;
                          if (typeof children === 'string') {
                             if (children.includes('[[TASK:')) {
                                return <p className="text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-500/20">{children.replace(/\[\[TASK:(.*?)\]\]/g, '✅ 建议作业: $1')}</p>
                             }
                             if (children.includes('[[MONITOR:')) {
                                return <p className="text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-500/20">{children.replace(/\[\[MONITOR:\s*(.*?)\s*(?:\||:|：)\s*(.*?)\]\]/g, '📡 监测信号: $1 ($2)')}</p>
                             }
                          }
                          return <p {...props} />
                        }
                      }}
                    >{lessonContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-slate-800 flex justify-end pb-12">
                <button 
                  onClick={handleNextLesson}
                  disabled={isLoadingContent}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center space-x-2 shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>
                    {selectedModule.topics.indexOf(activeLesson!) === selectedModule.topics.length - 1 
                      ? '完成并检查' 
                      : '下一课'}
                  </span>
                  <ChevronRight size={20} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden animate-fade-in relative">
      
      {isCreatingCustom && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Plus size={20} className="mr-2 text-emerald-500" />
                  创建自定义路径
                </h3>
                <button onClick={() => setIsCreatingCustom(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">路径名称</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none"
                     placeholder="例如: Web3 Gaming 深度研究"
                     value={newPathForm.title}
                     onChange={e => setNewPathForm(p => ({...p, title: e.target.value}))}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">简要描述</label>
                   <textarea 
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none h-20 resize-none"
                     placeholder="描述这个学习路径的目标..."
                     value={newPathForm.description}
                     onChange={e => setNewPathForm(p => ({...p, description: e.target.value}))}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">关联导师 (Optional)</label>
                   <select 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none appearance-none"
                      value={newPathForm.mentorId}
                      onChange={e => setNewPathForm(p => ({...p, mentorId: e.target.value as MentorId}))}
                   >
                     {MENTORS.map(m => (
                       <option key={m.id} value={m.id}>{m.avatar} {m.name} - {m.role}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">包含主题 (每行一个)</label>
                   <textarea 
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none h-32 font-mono text-sm"
                     placeholder={`GameFi 经济模型\nNFT 资产互操作性\nzkSync 上的链游生态`}
                     value={newPathForm.topicsStr}
                     onChange={e => setNewPathForm(p => ({...p, topicsStr: e.target.value}))}
                   />
                </div>

                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={() => setIsCreatingCustom(false)}
                     className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
                   >
                     取消
                   </button>
                   <button 
                     onClick={handleCreateCustomPath}
                     className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 flex items-center justify-center"
                   >
                     <Save size={16} className="mr-2" />
                     创建路径
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-slate-800 bg-slate-900/30 overflow-y-auto ${selectedModule ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
        <div className="p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="text-emerald-500" />
                核心课程
             </h2>
             <button 
               onClick={() => setIsCreatingCustom(true)}
               className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-colors"
               title="创建自定义路径"
             >
                <Plus size={18} />
             </button>
          </div>
          <p className="text-sm text-slate-500 mt-1">精通之路 & 自定义探索</p>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {localModules.map((module) => (
            <div 
              key={module.id}
              onClick={() => handleModuleSelect(module)}
              className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                selectedModule?.id === module.id 
                  ? 'bg-slate-800 border-emerald-500/50 shadow-lg' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              } ${module.status === 'locked' ? 'opacity-60' : ''}`}
            >
              {module.isCustom && (
                 <button 
                    onClick={(e) => handleDeleteCustomModule(e, module.id)}
                    className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除自定义路径"
                 >
                    <Trash2 size={14} />
                 </button>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <div className={`
                  p-1.5 rounded-lg 
                  ${module.isCustom ? 'bg-indigo-500/20 text-indigo-400' : ''}
                  ${module.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                  ${module.status === 'active' ? 'bg-blue-500/20 text-blue-500' : ''}
                  ${module.status === 'locked' ? 'bg-slate-800 text-slate-500' : ''}
                `}>
                  {module.status === 'completed' && <CheckCircle size={16} />}
                  {module.status === 'active' && <PlayCircle size={16} />}
                  {module.status === 'locked' && <Lock size={16} />}
                </div>
                {!module.isCustom && <span className="text-xs font-mono text-slate-500">模块 {module.id}</span>}
                {module.isCustom && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded border border-slate-700">CUSTOM</span>}
              </div>
              <h3 className={`font-semibold mb-1 ${selectedModule?.id === module.id ? 'text-white' : 'text-slate-300'}`}>
                {module.title}
              </h3>
              <div className="flex items-center text-xs text-slate-500 space-x-3">
                <span className="flex items-center"><Clock size={12} className="mr-1"/> {module.duration}</span>
                <span>{module.topics.length} 节课</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 bg-slate-950 overflow-y-auto ${!selectedModule ? 'hidden md:flex' : 'flex'} flex-col`}>
        {selectedModule ? (
          <div className="p-6 md:p-12 max-w-3xl mx-auto w-full animate-fade-in">
            <button 
              onClick={() => {
                setSelectedModule(null);
                if (onModuleChange) onModuleChange(null);
              }}
              className="md:hidden mb-6 flex items-center text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} className="mr-2" /> 返回列表
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                 selectedModule.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                 selectedModule.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {selectedModule.status === 'active' ? '进行中' : selectedModule.status === 'locked' ? '锁定' : '已完成'}
              </span>
              <span className="text-slate-500 text-sm flex items-center">
                <Clock size={14} className="mr-1" /> {selectedModule.duration}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{selectedModule.title}</h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              {selectedModule.description}
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center">
                <List size={16} className="mr-2 text-emerald-500" /> 
                课程大纲 ({selectedModule.topics.length} 节)
              </h3>
              <ul className="space-y-3">
                {selectedModule.topics.map((topic, idx) => (
                  <li key={idx} className="flex items-start text-slate-400">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-500 mr-3 mt-0.5 border border-slate-700">
                      {idx + 1}
                    </span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleStartLearning(selectedModule)}
                disabled={selectedModule.status === 'locked'}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all ${
                  selectedModule.status === 'locked' 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:scale-[1.02]'
                }`}
              >
                {selectedModule.status === 'locked' ? (
                  <>
                    <Lock size={20} />
                    <span>模块已锁定</span>
                  </>
                ) : (
                  <>
                    <PlayCircle size={24} />
                    <span>{selectedModule.status === 'completed' ? '回顾课程' : '开始学习'}</span>
                  </>
                )}
              </button>
            </div>
            
            {selectedModule.status === 'locked' && !selectedModule.isCustom && (
              <p className="text-center mt-4 text-sm text-slate-500">
                完成前置模块以解锁此内容。
              </p>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
              <BookOpen size={32} className="text-slate-600" />
            </div>
            <p className="text-lg">请从左侧列表选择一个模块开始学习。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Curriculum;
