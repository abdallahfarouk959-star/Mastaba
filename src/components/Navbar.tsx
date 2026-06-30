import React from 'react';
import { Trophy, ShieldAlert, Star, UserCheck, Flame, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: 'predictions' | 'leaderboard' | 'admin';
  setActiveTab: (tab: 'predictions' | 'leaderboard' | 'admin') => void;
  currentUser: User | null;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onRefresh,
  isRefreshing
}: NavbarProps) {
  return (
    <header id="app-header" className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Logo and Slogan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              <span className="text-black font-black text-xl italic select-none">M</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                دوري <span className="text-emerald-400">المصطبة</span>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  موسم ٢٠٢٦
                </span>
              </h1>
              <p className="text-[10px] md:text-xs text-gray-400 font-medium">
                توقع واربح ونكّد على يوتيوبرز المصطبة! 🎙️⚽
              </p>
            </div>
          </div>

          {/* Quick mobile refresh */}
          <button 
            onClick={onRefresh}
            className="md:hidden p-2 text-gray-400 hover:text-emerald-400 bg-white/5 rounded-lg border border-white/5 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            id="tab-predictions"
            onClick={() => setActiveTab('predictions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'predictions'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Flame className="w-4 h-4" />
            التوقعات
          </button>

          <button
            id="tab-leaderboard"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4" />
            جدول الترتيب
          </button>

          <button
            id="tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20 font-bold'
                : 'text-gray-400 hover:text-red-400 hover:bg-red-950/20'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            لوحة الإدارة
          </button>
        </nav>

        {/* User profile action */}
        <div className="flex items-center justify-between md:justify-end gap-3 border-t border-white/5 md:border-t-0 pt-2.5 md:pt-0">
          <button 
            onClick={onRefresh}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-emerald-400 bg-white/5 rounded-lg border border-white/5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border-2 border-emerald-500/50 object-cover shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              />
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.isYouTuber && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      يوتيوبر
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold font-mono">
                  النقاط: {currentUser.totalPoints} 🏆
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-[10px] font-semibold text-gray-400 hover:text-red-400 underline transition cursor-pointer pr-1"
              >
                خروج
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-400 flex items-center gap-1.5 bg-yellow-500/5 border border-yellow-500/25 px-3 py-1.5 rounded-lg text-yellow-300">
              <UserCheck className="w-3.5 h-3.5" />
              الرجاء تسجيل الدخول للمشاركة
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
