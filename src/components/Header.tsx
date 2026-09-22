import React from 'react';
import { BotStatus } from '../types.js';
import { Bot, Gamepad2, Trophy, Settings, BookOpen, Wifi, ShieldAlert, Sparkles, LayoutGrid } from 'lucide-react';

interface HeaderProps {
  status: BotStatus | null;
  activeTab: 'simulator' | 'registry' | 'leaderboard' | 'config' | 'guide';
  setActiveTab: (tab: 'simulator' | 'registry' | 'leaderboard' | 'config' | 'guide') => void;
}

export const Header: React.FC<HeaderProps> = ({ status, activeTab, setActiveTab }) => {
  const isConnected = status?.connected ?? false;
  const hasToken = status?.hasToken ?? false;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
          
          {/* Logo & Bot Info */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <span 
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  isConnected ? 'bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse' : hasToken ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                title={isConnected ? 'متصل بديسكورد' : hasToken ? 'في وضع الاستعداد' : 'بانتظار التوكن'}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  بوت جعفر
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    v{status?.version || '1.0.0'}
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                بوت ألعاب مصغرة باللغة العربية • ألعاب <span className="text-amber-300 font-medium">اعكس</span> و <span className="text-sky-300 font-medium">أعلام</span>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-medium">
                    متصل بديسكورد ({status?.guildsCount || 0} سيرفر)
                  </span>
                </>
              ) : hasToken ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-medium">
                    جاهز للاتصال (التوكن مُعرّف)
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-300 font-medium">
                    وضع المحاكي المحلي (لم يتم إدخال التوكن)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              id="nav-simulator-tab"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>المحاكي التفاعلي</span>
            </button>

            <button
              id="nav-registry-tab"
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'registry'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>سجل الألعاب (!العاب)</span>
            </button>

            <button
              id="nav-leaderboard-tab"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>لوحة المتصدرين</span>
            </button>

            <button
              id="nav-config-tab"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'config'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات المركزية</span>
            </button>

            <button
              id="nav-guide-tab"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>دليل البوت والتشغيل</span>
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};

export default Header;
