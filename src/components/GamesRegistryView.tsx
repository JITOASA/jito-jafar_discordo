import React, { useState, useEffect } from 'react';
import { GameRegistryEntry } from '../types.js';
import { Gamepad2, CheckCircle2, Clock, Search, Sparkles, Terminal, Users, User, Info } from 'lucide-react';

export const GamesRegistryView: React.FC = () => {
  const [games, setGames] = useState<GameRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'solo' | 'multiplayer'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/registry/games');
      const data = await res.json();
      if (data?.games) {
        setGames(data.games);
      }
    } catch (err) {
      console.error('Failed to load games registry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const filteredGames = games.filter((game) => {
    const matchType = filterType === 'all' || game.type === filterType;
    const matchStatus = filterStatus === 'all' || game.status === filterStatus;
    const matchSearch =
      searchQuery === '' ||
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.description && game.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchType && matchStatus && matchSearch;
  });

  const availableCount = games.filter((g) => g.status === 'available').length;
  const upcomingCount = games.filter((g) => g.status === 'upcoming').length;
  const soloCount = games.filter((g) => g.type === 'solo').length;
  const multiCount = games.filter((g) => g.type === 'multiplayer').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                سجل الألعاب المركزي (Central Game Registry)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🎮 <span>ألعاب جعفر</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              المرجع المركزي لجميع الألعاب المتاحة والقادمة في البوت. يُغذّي أمر <code className="text-indigo-400 font-mono bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/40">!العاب</code> و <code className="text-indigo-400 font-mono bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/40">/games</code> تلقائياً.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950 border border-emerald-500/30 px-4 py-2.5 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">الألعاب المتاحة</p>
                <p className="text-lg font-bold text-emerald-300">{availableCount} <span className="text-xs font-normal text-slate-500">ألعاب فعالة</span></p>
              </div>
            </div>

            <div className="bg-slate-950 border border-amber-500/30 px-4 py-2.5 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">الألعاب القادمة</p>
                <p className="text-lg font-bold text-amber-300">{upcomingCount} <span className="text-xs font-normal text-slate-500">قريباً</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن لعبة أو أمر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({games.length})
            </button>
            <button
              onClick={() => setFilterType('solo')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                filterType === 'solo'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              فردية ({soloCount})
            </button>
            <button
              onClick={() => setFilterType('multiplayer')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                filterType === 'multiplayer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              جماعية ({multiCount})
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'available'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              المتاحة فقط ({availableCount})
            </button>
            <button
              onClick={() => setFilterStatus('upcoming')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              القادمة ({upcomingCount})
            </button>
          </div>

        </div>
      </div>

      {/* Registry Info Callout */}
      <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-200">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-100">كيف يعمل السجل المركزي للألعاب؟</p>
          <p className="text-indigo-300/90 leading-relaxed">
            عند إضافة أي لعبة جديدة للبوت، يتم تسجيلها في <code className="bg-indigo-900/50 px-1 py-0.5 rounded font-mono">GAME_REGISTRY</code> مع تحديد حالتها (<code className="text-emerald-300">available</code>). يقوم أمر <code className="bg-indigo-900/50 px-1 py-0.5 rounded font-mono">!العاب</code> بقراءة الألعاب المتاحة ديناميكياً وعرضها في Discord دون الحاجة لتعديل الكود في أماكن متعددة.
          </p>
        </div>
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
          <p>جاري تحميل سجل الألعاب...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">لم يتم العثور على ألعاب مطابقة</p>
          <p className="text-xs text-slate-500 mt-1">جرّب تغيير خيارات البحث أو التصفية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const isAvailable = game.status === 'available';

            return (
              <div
                key={game.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isAvailable
                    ? 'border-indigo-500/40 hover:border-indigo-500/70 shadow-lg shadow-indigo-950/30'
                    : 'border-slate-800/80 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isAvailable ? 'bg-gradient-to-r from-emerald-500 to-indigo-500' : 'bg-slate-800'
                  }`}
                />

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{game.emoji}</span>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          {game.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                          id: {game.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isAvailable ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          متاحة حالياً
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          قادمة قريباً
                        </span>
                      )}

                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {game.type === 'solo' ? '🎯 فردية' : '🎮 جماعية'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {game.description && (
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {game.description}
                    </p>
                  )}
                </div>

                {/* Commands Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-indigo-300 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {game.command}
                    </span>
                  </div>

                  {game.slashCommand && (
                    <span className="text-slate-400 text-[11px] bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60">
                      {game.slashCommand}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Embed Preview Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span>شكل رسالة الـ Embed في Discord عند كتابة </span>
          <code className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono text-sm">!العاب</code>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          يتم توليد هذه الرسالة تلقائياً للمستخدمين في سيرفر الديسكورد عبر دالة <code className="text-slate-300 font-mono">embeds.gamesList()</code>:
        </p>

        <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-5 max-w-xl shadow-lg">
          <div className="border-r-4 border-indigo-500 pr-3">
            <h4 className="text-lg font-bold text-white mb-2">🎮 ألعاب جعفر</h4>
            
            <div className="text-xs space-y-4 text-slate-200">
              <div>
                <p className="font-bold text-indigo-400 mb-1.5">### 🎯 ألعاب فردية</p>
                <div className="space-y-1 font-mono text-slate-300">
                  <p>* 🚩 <strong>أعلام</strong> — <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">!اعلام</code></p>
                  <p>* 🔃 <strong>اعكس</strong> — <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">!اعكس</code></p>
                  <p>* 🔤 <strong>حرف</strong> — <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">!حرف</code></p>
                </div>
              </div>

              <div>
                <p className="font-bold text-indigo-400 mb-1.5">### 🎮 ألعاب جماعية</p>
                <div className="space-y-1 font-mono text-slate-300">
                  <p>* ❌⭕ <strong>XO</strong> — <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">!xo</code></p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              بوت جعفر • اكتب أمر اللعبة لبدء الجولة مباشرة!
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default GamesRegistryView;
