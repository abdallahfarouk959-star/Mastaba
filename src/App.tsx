import React, { useState, useEffect } from 'react';
import { User, Gameweek, Prediction } from './types';
import Navbar from './components/Navbar';
import MatchCard from './components/MatchCard';
import LeaderboardTable from './components/LeaderboardTable';
import AdminPanel from './components/AdminPanel';
import { Trophy, Flame, HelpCircle, Star, Sparkles, MessageSquare, LogIn, ArrowLeft, RefreshCw, Quote, Shield } from 'lucide-react';

export default function App() {
  // Navigation / View states
  const [activeTab, setActiveTab] = useState<'predictions' | 'leaderboard' | 'admin'>('predictions');
  const [selectedGameweekId, setSelectedGameweekId] = useState<string>('');
  
  // Database State
  const [users, setUsers] = useState<User[]>([]);
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  
  // App UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState<boolean>(false);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [regName, setRegName] = useState<string>('');
  const [regFavoriteTeam, setRegFavoriteTeam] = useState<string>('الأهلي');

  const fetchDatabase = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setGameweeks(data.gameweeks || []);
        setPredictions(data.predictions || []);

        // Default select the latest upcoming or live gameweek, fallback to first
        if (data.gameweeks && data.gameweeks.length > 0) {
          const currentSelection = selectedGameweekId;
          const stillExists = data.gameweeks.some((gw: Gameweek) => gw.id === currentSelection);
          if (!stillExists || !currentSelection) {
            const activeGw = data.gameweeks.find((gw: Gameweek) => gw.status === 'live' || gw.status === 'upcoming') 
              || data.gameweeks[data.gameweeks.length - 1];
            setSelectedGameweekId(activeGw?.id || '');
          }
        }

        // Sync logged-in user details with latest points
        if (currentUser) {
          const freshUser = data.users.find((u: User) => u.id === currentUser.id);
          if (freshUser) {
            setCurrentUser(freshUser);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load database:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
    
    // Check localStorage for logged-in user
    const savedUser = localStorage.getItem('mastaba_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, favoriteTeam: regFavoriteTeam }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);
          localStorage.setItem('mastaba_user', JSON.stringify(data.user));
          // Refresh state to include new user
          await fetchDatabase(true);
        }
      }
    } catch (e) {
      console.error(e);
      alert('خطأ أثناء تسجيل الدخول');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mastaba_user');
    setCurrentUser(null);
  };

  const handleSavePrediction = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          predictions: [{ matchId, predictedHomeScore: homeScore, predictedAwayScore: awayScore }]
        }),
      });
      if (res.ok) {
        // Sync local DB silently
        await fetchDatabase(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGameweek = async (title: string, matches: any[]) => {
    try {
      const res = await fetch('/api/gameweeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, matches, status: 'upcoming' }),
      });
      if (res.ok) {
        await fetchDatabase(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMatchResult = async (gameweekId: string, matchId: string, homeScore: number, awayScore: number, status: string) => {
    try {
      const res = await fetch('/api/matches/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameweekId, matchId, homeScore, awayScore, status }),
      });
      if (res.ok) {
        await fetchDatabase(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerGeminiCommentary = async (gameweekId: string) => {
    setIsGeneratingCommentary(true);
    try {
      const res = await fetch('/api/gemini/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameweekId }),
      });
      if (res.ok) {
        await fetchDatabase(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCommentary(false);
    }
  };

  // Extract variables for view
  const activeGameweek = gameweeks.find(gw => gw.id === selectedGameweekId);
  const youtubers = users.filter(u => u.isYouTuber);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <Trophy className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-black tracking-wider">جاري تحميل دوري المصطبة...</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">برجاء الانتظار قليلاً</p>
        </div>
      </div>
    );
  }

  // Render register screen if not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#090d13] flex flex-col items-center justify-center p-4">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20 text-emerald-400 mb-4 glow-green-sm animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              دوري <span className="text-emerald-400">المصطبة</span>
            </h1>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              التطبيق التفاعلي لتوقعات مباريات كرة القدم ومنافسة صناع المحتوى!
            </p>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-3xl border border-gray-800/80 p-6 glow-green-sm">
            <h2 className="text-lg font-black text-white mb-1">انضم إلى الجمهور 🎙️</h2>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              سجل اسمك وفريقك المفضل لتدخل فوراً في جدول الترتيب وتبدأ في توقع المباريات ومنافسة ممدوح نصر الله، مصعب، الخفيف، ومروان!
            </p>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">اسم الشهرة أو اللقب (بالعربية):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أبو تريكة الغلابة"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">الفريق الكروي المفضل:</label>
                <select
                  value={regFavoriteTeam}
                  onChange={(e) => setRegFavoriteTeam(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="الأهلي">الأهلي المصري 🦅</option>
                  <option value="الزمالك">الزمالك 🏹</option>
                  <option value="آرسنال">آرسنال 🔴</option>
                  <option value="ريال مدريد">ريال مدريد 🇪🇸</option>
                  <option value="برشلونة">برشلونة 🔵🔴</option>
                  <option value="ليفربول">ليفربول 🔴</option>
                  <option value="مانشستر يونايتد">مانشستر يونايتد 😈</option>
                  <option value="مانشستر سيتي">مانشستر سيتي 🩵</option>
                  <option value="تشيلسي">تشيلسي 🔵</option>
                  <option value="ميلان">ميلان ⚫🔴</option>
                  <option value="يوفنتوس">يوفنتوس ⚪⚫</option>
                  <option value="بايرن ميونخ">بايرن ميونخ 🇩🇪</option>
                  <option value="فريق آخر">فريق آخر ⚽</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-sm shadow-md shadow-emerald-500/10 mt-2"
              >
                <LogIn className="w-4 h-4 text-black" />
                دخول ومنافسة الرابطة
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-[10px] text-gray-500 font-mono">
            المصطبة © جميع الحقوق محفوظة لجمهور المحتوى الكروي ٢٠٢٦
          </div>
        </div>
      </div>
    );
  }

  // Helper parser for TV-Dialogue display
  const renderDialogueBubble = (commentary: string) => {
    // Splits lines by newlines, finds lines that look like "Name: Message" or "Name: 'Message'"
    const lines = commentary.split("\n").filter(l => l.trim() !== "");

    return (
      <div className="flex flex-col gap-4">
        {lines.map((line, idx) => {
          // Check for character name match
          let charName = "";
          let charMessage = line;
          const colonIdx = line.indexOf(":");
          
          if (colonIdx > 0) {
            charName = line.substring(0, colonIdx).trim();
            charMessage = line.substring(colonIdx + 1).trim();
            // strip quotes if present
            if (charMessage.startsWith("'") && charMessage.endsWith("'")) {
              charMessage = charMessage.slice(1, -1);
            }
            if (charMessage.startsWith('"') && charMessage.endsWith('"')) {
              charMessage = charMessage.slice(1, -1);
            }
          }

          // Assign character identities
          let avatarColor = "bg-gray-800 border-gray-700";
          let charAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";
          let bubbleStyle = "bg-gray-900 border-gray-800";
          let nameColor = "text-gray-300";

          if (charName.includes("ممدوح") || charName.toLowerCase().includes("mamdouh")) {
            avatarColor = "border-red-500/40 bg-red-500/10";
            charAvatarUrl = users.find(u => u.id === "mamdouh")?.avatarUrl || "";
            bubbleStyle = "bg-red-500/5 border-red-500/10 hover:border-red-500/20";
            nameColor = "text-red-400 font-bold";
          } else if (charName.includes("مصعب") || charName.toLowerCase().includes("mosaab")) {
            avatarColor = "border-blue-500/40 bg-blue-500/10";
            charAvatarUrl = users.find(u => u.id === "mosaab")?.avatarUrl || "";
            bubbleStyle = "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20";
            nameColor = "text-blue-400 font-bold";
          } else if (charName.includes("الخفيف") || charName.includes("أحمد") || charName.toLowerCase().includes("alkhafif")) {
            avatarColor = "border-purple-500/40 bg-purple-500/10";
            charAvatarUrl = users.find(u => u.id === "alkhafif")?.avatarUrl || "";
            bubbleStyle = "bg-purple-500/5 border-purple-500/10 hover:border-purple-500/20";
            nameColor = "text-purple-400 font-bold";
          } else if (charName.includes("مروان") || charName.toLowerCase().includes("marwan")) {
            avatarColor = "border-amber-500/40 bg-amber-500/10";
            charAvatarUrl = users.find(u => u.id === "marwan")?.avatarUrl || "";
            bubbleStyle = "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20";
            nameColor = "text-amber-400 font-bold";
          }

          if (!charName) {
            return (
              <p key={idx} className="text-xs text-gray-400 italic bg-gray-900/40 border border-gray-800 p-3 rounded-xl leading-relaxed">
                {line}
              </p>
            );
          }

          return (
            <div key={idx} className={`flex gap-3 items-start p-3.5 rounded-2xl border transition-all ${bubbleStyle}`}>
              <img
                src={charAvatarUrl}
                alt={charName}
                className={`w-10 h-10 rounded-full border-2 object-cover shrink-0 ${avatarColor}`}
              />
              <div className="flex-1 text-right">
                <span className={`text-xs ${nameColor}`}>{charName}</span>
                <p className="text-xs md:text-sm text-gray-200 mt-1 leading-relaxed font-medium">
                  {charMessage}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 flex flex-col relative pb-16 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Main Header / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRefresh={() => fetchDatabase(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 relative z-10">
        {activeTab === 'predictions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Matches List Column */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Filter / Header toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-emerald-400" />
                    توقع المباريات وحصد النقاط
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    اختر الجولة، ضع توقعاتك بدقة، وسيتم تفعيل Points Engine فور انتهاء المباريات!
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">الجولة النشطة:</span>
                  <select
                    value={selectedGameweekId}
                    onChange={(e) => setSelectedGameweekId(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {gameweeks.map(gw => (
                      <option key={gw.id} value={gw.id}>
                        {gw.title} {gw.status === 'completed' ? '🏁' : gw.status === 'live' ? '🔴' : '🗓️'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match Cards List */}
              {activeGameweek ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeGameweek.matches.map(match => {
                    // Find user's existing prediction for this match
                    const userPrediction = currentUser ? predictions.find(
                      p => p.userId === currentUser.id && p.matchId === match.id
                    ) : undefined;

                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={userPrediction}
                        onSavePrediction={handleSavePrediction}
                        youtubers={youtubers}
                        allPredictions={predictions}
                        currentUser={currentUser}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/5 border border-white/5 rounded-3xl">
                  <p className="text-sm text-gray-400 font-bold">لا توجد جولات أو مباريات متاحة حالياً.</p>
                  <p className="text-xs text-gray-500 mt-1">تفضل بزيارة لوحة الإدارة لإنشاء جولة مباريات جديدة!</p>
                </div>
              )}
            </div>

            {/* AI Show/Dialogue Script Column */}
            <div className="flex flex-col gap-4">
              <div className="glass-card rounded-2xl border border-white/5 p-5 glow-emerald flex flex-col gap-4">
                <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                      روستر حلقة المصطبة 🎙️
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      جدال ساخر وتكتيكي بالذكاء الاصطناعي (جيميناي)
                    </p>
                  </div>
                  <span className="text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-bold">
                    حلقة الجولة
                  </span>
                </div>

                {activeGameweek?.aiCommentary ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                      <Quote className="w-3 h-3 text-emerald-400 shrink-0" />
                      سيناريو تخيلي لبرنامج المصطبة يحلل أداء صناع المحتوى:
                    </p>
                    <div className="max-h-[460px] overflow-y-auto pr-1 flex flex-col gap-3">
                      {renderDialogueBubble(activeGameweek.aiCommentary)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400">لا يوجد سيناريو متاح لهذه الجولة.</p>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      بعد إدخال نتائج مباريات الجولة في لوحة الإدارة، يمكنك توليد سيناريو ساخر تفاعلي يعلق على النتائج بذكاء Gemini!
                    </p>
                  </div>
                )}
              </div>

              {/* Point Rules Help Box */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  قواعد احتساب نقاط المصطبة:
                </h4>
                <ul className="text-[10px] text-gray-400 flex flex-col gap-1.5 leading-relaxed list-disc pr-3">
                  <li><strong className="text-emerald-400">توقع دقيق تماماً (+5 نقاط)</strong>: عند مطابقة النتيجة الفعلية بالكامل (مثال: توقعت ٢-١ وانتهت ٢-١).</li>
                  <li><strong className="text-blue-400">توقع فارق الأهداف (+3 نقاط)</strong>: عند توقع الفائز وفارق الأهداف الصحيح (مثال: توقعت ٢-٠ وانتهت ٣-١ - الفارق هدفين).</li>
                  <li><strong className="text-yellow-400">توقع الفائز فقط (+2 نقاط)</strong>: عند توقع الفائز الصحيح ولكن بفارق أهداف ونقاط مختلف (مثال: توقعت ١-٠ وانتهت ٣-١).</li>
                  <li><strong>توقع خاطئ (0 نقاط)</strong>: عدم إصابة الفائز أو التعادل مطلقاً.</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTable users={users} currentUser={currentUser} />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            gameweeks={gameweeks}
            onCreateGameweek={handleCreateGameweek}
            onUpdateMatchResult={handleUpdateMatchResult}
            onTriggerGeminiCommentary={handleTriggerGeminiCommentary}
            isGeneratingCommentary={isGeneratingCommentary}
          />
        )}
      </main>

      {/* Live Match Update Footer Ticker */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 h-10 bg-emerald-500 flex items-center px-6 overflow-hidden border-t border-emerald-400/20 shadow-[0_-4px_20px_rgba(16,185,129,0.15)]">
        <div className="flex gap-12 whitespace-nowrap animate-pulse items-center">
          <div className="flex items-center gap-2 text-black font-black uppercase italic text-xs shrink-0">
            <span className="w-2 h-2 bg-black rounded-full" />
            تحديثات دوري المصطبة مباشرة:
          </div>
          <div className="text-black font-bold text-xs flex items-center gap-6">
            <span>ريال مدريد ٣ - ١ برشلونة (انتهت)</span>
            <span className="opacity-30">|</span>
            <span>آرسنال ٢ - ٢ مانشستر يونايتد (انتهت)</span>
            <span className="opacity-30">|</span>
            <span>ميلان ١ - ٠ إنتر ميلان (انتهت)</span>
            <span className="opacity-30">|</span>
            <span>مانشستر سيتي ٠ - ٠ تشيلسي (قريباً)</span>
            <span className="opacity-30">|</span>
            <span>الخفيف يقول: "يا ممدوح توقعاتك دايماً في المصيدة!"</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
