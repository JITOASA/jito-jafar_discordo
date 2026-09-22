import React, { useState, useEffect } from 'react';
import { PlayerScore } from '../types.js';
import { Trophy, Award, Medal, Users, RotateCcw, Flag, RefreshCw, Flame, Crown } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [globalStats, setGlobalStats] = useState<{ totalGuilds: number; totalPlayers: number; totalGamesPlayed: number; totalPointsAwarded: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState('demo-server');
  const [guildsList, setGuildsList] = useState<string[]>([]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/scores?guildId=${selectedGuild}&limit=20`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setGlobalStats(data.globalStats || null);
      setGuildsList(data.guildsList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [selectedGuild]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20 text-base">
            🥇
          </div>
        );
      case 1:
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-slate-300/20 text-base">
            🥈
          </div>
        );
      case 2:
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-600 text-white font-black flex items-center justify-center shadow-lg shadow-amber-700/20 text-base">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-sm border border-slate-700/50">
            {index + 1}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي النقاط الموزعة</p>
            <p className="text-xl font-bold text-white mt-0.5">{globalStats?.totalPointsAwarded || 0} <span className="text-xs text-amber-400 font-normal">نقطة</span></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي الجولات الملعوبة</p>
            <p className="text-xl font-bold text-white mt-0.5">{globalStats?.totalGamesPlayed || 0} <span className="text-xs text-indigo-400 font-normal">جولة</span></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">اللاعبين المتنافسين</p>
            <p className="text-xl font-bold text-white mt-0.5">{globalStats?.totalPlayers || 0} <span className="text-xs text-emerald-400 font-normal">لاعب</span></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">سيرفرات ديسكورد المسجلة</p>
            <p className="text-xl font-bold text-white mt-0.5">{globalStats?.totalGuilds || 1} <span className="text-xs text-purple-400 font-normal">سيرفر</span></p>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              لوحة المتصدرين ونقاط اللاعبين
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              يتم تحديث النقاط محلياً بشكل فوري بعد انتهاء كل جولة في ألعاب اعكس وأعلام.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="refresh-scores-btn"
              onClick={fetchScores}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="mt-6 overflow-x-auto">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-300">لا توجد نقاط مسجلة حتى الآن</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                قم بتجربة المحاكي التفاعلي أو العب داخل ديسكورد بأمر <code className="text-indigo-400">/reverse</code> أو <code className="text-sky-400">/flags</code> لتسجيل النقاط هنا!
              </p>
            </div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                  <th className="py-3 px-4">الترتيب</th>
                  <th className="py-3 px-4">اللاعب</th>
                  <th className="py-3 px-4">النقاط الإجمالية</th>
                  <th className="py-3 px-4">إجمالي مرات الفوز</th>
                  <th className="py-3 px-4">فوز اعكس 🔄</th>
                  <th className="py-3 px-4">فوز أعلام 🚩</th>
                  <th className="py-3 px-4">آخر فوز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((player, index) => (
                  <tr key={player.userId || index} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      {getRankBadge(index)}
                    </td>
                    <td className="py-4 px-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300">
                        {player.username.slice(0, 2)}
                      </div>
                      <span>{player.username}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 text-sm">
                        ⭐ {player.points} نقطة
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-200">
                      {player.totalWins} فوز
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-purple-300 font-medium">
                        {player.games?.reverse || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sky-300 font-medium">
                        {player.games?.flags || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                      {player.lastWon ? new Date(player.lastWon).toLocaleDateString('ar-SA') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};

export default LeaderboardView;
