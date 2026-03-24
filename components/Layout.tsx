
import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  Settings,
  Activity,
  Menu,
  ClipboardList,
  Briefcase,
  Eye
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'chat' | 'learn' | 'settings' | 'tasks' | 'positions' | 'watchlist';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'learn' | 'settings' | 'tasks' | 'positions' | 'watchlist') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="text-emerald-500" size={28} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              TitanBoard
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-2">AI 投资精通之路</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="作战指挥室" />
          <NavItem id="chat" icon={MessageSquare} label="导师董事会" />
          <NavItem id="positions" icon={Briefcase} label="持仓指挥部" />
          <NavItem id="watchlist" icon={Eye} label="观察哨" />
          <NavItem id="tasks" icon={ClipboardList} label="作业本" />
          <NavItem id="learn" icon={BookOpen} label="核心课程" />
          <NavItem id="settings" icon={Settings} label="策略档案" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-mono">目标倒计时</p>
            <p className="text-sm font-bold text-white">剩余 365 天</p>
            <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[2%]"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center space-x-2">
          <Activity className="text-emerald-500" size={24} />
          <h1 className="text-lg font-bold">TitanBoard</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900 z-40 pt-20 px-4 md:hidden">
          <nav className="space-y-2">
            <NavItem id="dashboard" icon={LayoutDashboard} label="作战指挥室" />
            <NavItem id="chat" icon={MessageSquare} label="导师董事会" />
            <NavItem id="positions" icon={Briefcase} label="持仓指挥部" />
            <NavItem id="watchlist" icon={Eye} label="观察哨" />
            <NavItem id="tasks" icon={ClipboardList} label="作业本" />
            <NavItem id="learn" icon={BookOpen} label="核心课程" />
            <NavItem id="settings" icon={Settings} label="策略档案" />
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
