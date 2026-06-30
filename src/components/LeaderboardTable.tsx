import React, { useState } from 'react';
import { User } from '../types';
import { Trophy, Star, Shield, Award, Sparkles, User as UserIcon } from 'lucide-react';

interface LeaderboardTableProps {
  users: User[];
  currentUser: User | null;
}

export default function LeaderboardTable({ users, currentUser }: LeaderboardTableProps) {
  const [filter, setFilter] = useState<'all' | 'youtubers' | 'fans'>('all');

  // Sort users by points DESC, then exact scores DESC, then name
  const sortedUsers = [...users].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.exactScoresCount !== a.exactScoresCount) {
      return b.exactScoresCount - a.exactScoresCount;
    }
    return a.name.localeCompare(b.name);
  });

  const filteredUsers = sortedUsers.filter(user => {
    if (filter === 'youtubers') return user.isYouTuber;
    if (filter === 'fans') return !user.isYouTuber;
    return true;
  });

  return (
    <div className="glass-card rounded-2xl border border-white/5 p-5 glow-emerald flex flex-col gap-5">
      {/* Filters and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            جدول الترتيب العام
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            المنافسة مشتعلة بين صناع المحتوى والجمهور! 🔥
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 self-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            الجميع
          </button>
          <button
            onClick={() => setFilter('youtubers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'youtubers'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            اليوتيوبرز
          </button>
          <button
            onClick={() => setFilter('fans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              filter === 'fans'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            الجمهور
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 font-bold text-xs">
              <th className="py-3 px-3 text-center w-12">المركز</th>
              <th className="py-3 px-4 text-right">المتوقع</th>
              <th className="py-3 px-4 text-center">الفريق المفضل</th>
              <th className="py-3 px-3 text-center">توقع دقيق (٥ن)</th>
              <th className="py-3 px-3 text-center">توقع نتيجة (٢/٣ن)</th>
              <th className="py-3 px-4 text-center font-black text-white">إجمالي النقاط</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 font-bold">
                  لا يوجد مشاركون في هذا الفلتر حالياً.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                // Find true overall rank in sorted list
                const overallRank = sortedUsers.findIndex(u => u.id === user.id) + 1;
                const isCurrentUser = currentUser && user.id === currentUser.id;

                let rankBadge = (
                  <span className="font-mono text-gray-400 font-bold">{overallRank.toString().padStart(2, '0')}</span>
                );

                if (overallRank === 1) {
                  rankBadge = <span className="font-mono text-emerald-400 font-black italic">01</span>;
                } else if (overallRank === 2) {
                  rankBadge = <span className="font-mono text-gray-300 font-black italic">02</span>;
                } else if (overallRank === 3) {
                  rankBadge = <span className="font-mono text-amber-500 font-black italic">03</span>;
                }

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors group hover:bg-white/[0.03] ${
                      isCurrentUser ? 'bg-blue-500/10 hover:bg-blue-500/15 font-bold border-l-2 border-l-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-3 text-center font-bold">
                      {rankBadge}
                    </td>

                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className={`w-9 h-9 rounded-full object-cover border-2 ${
                            user.isYouTuber ? 'border-yellow-400/50 shadow-sm shadow-yellow-400/10' : 'border-white/10'
                          }`}
                        />
                        <div>
                          <p className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {user.name}
                            {user.isYouTuber && (
                              <span className="text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-1.5 py-0.5 rounded font-black shrink-0">
                                نجم المصطبة 🎙️
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded shrink-0">
                                أنت
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Favorite Team */}
                    <td className="py-3.5 px-4 text-center text-xs text-gray-300 font-semibold">
                      {user.favoriteTeam ? (
                        <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
                          {user.favoriteTeam}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Exact count */}
                    <td className="py-3.5 px-3 text-center text-xs text-gray-300 font-mono">
                      {user.exactScoresCount}
                    </td>

                    {/* Outcome count */}
                    <td className="py-3.5 px-3 text-center text-xs text-gray-300 font-mono">
                      {user.correctOutcomesCount}
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-center font-black text-emerald-400 text-base font-mono">
                      {user.totalPoints} <span className="text-xs font-semibold text-gray-400">ن</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
