import React, { useState } from 'react';
import { Gameweek, Match } from '../types';
import { ShieldAlert, Plus, Sparkles, Send, CheckCircle2, Trophy, Clock, AlertTriangle } from 'lucide-react';

interface AdminPanelProps {
  gameweeks: Gameweek[];
  onCreateGameweek: (title: string, matches: Array<{ homeTeam: string; awayTeam: string; homeLogo: string; awayLogo: string; league: string; date: string }>) => Promise<void>;
  onUpdateMatchResult: (gameweekId: string, matchId: string, homeScore: number, awayScore: number, status: string) => Promise<void>;
  onTriggerGeminiCommentary: (gameweekId: string) => Promise<void>;
  isGeneratingCommentary: boolean;
}

export default function AdminPanel({
  gameweeks,
  onCreateGameweek,
  onUpdateMatchResult,
  onTriggerGeminiCommentary,
  isGeneratingCommentary
}: AdminPanelProps) {
  const [newGwTitle, setNewGwTitle] = useState<string>('');
  const [matchInputs, setMatchInputs] = useState<Array<{ homeTeam: string; awayTeam: string; homeLogo: string; awayLogo: string; league: string; date: string }>>([
    { homeTeam: '', awayTeam: '', homeLogo: '⚽', awayLogo: '⚽', league: 'الدوري الإنجليزي', date: new Date().toISOString().split('T')[0] }
  ]);
  const [selectedGwId, setSelectedGwId] = useState<string>(gameweeks[0]?.id || '');

  // Score editing inputs state
  const [scoreInputs, setScoreInputs] = useState<{ [matchId: string]: { homeScore: string; awayScore: string } }>({});

  const handleAddMatchRow = () => {
    setMatchInputs([
      ...matchInputs,
      { homeTeam: '', awayTeam: '', homeLogo: '⚽', awayLogo: '⚽', league: 'الدوري الإنجليزي', date: new Date().toISOString().split('T')[0] }
    ]);
  };

  const handleRemoveMatchRow = (index: number) => {
    if (matchInputs.length === 1) return;
    setMatchInputs(matchInputs.filter((_, idx) => idx !== index));
  };

  const handleMatchInputChange = (index: number, field: string, value: string) => {
    const updated = [...matchInputs];
    updated[index] = { ...updated[index], [field]: value };
    setMatchInputs(updated);
  };

  const handleCreateGwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGwTitle.trim() || matchInputs.some(m => !m.homeTeam.trim() || !m.awayTeam.trim())) {
      alert("الرجاء ملء جميع الحقول المطلوبة للمباراة!");
      return;
    }
    try {
      await onCreateGameweek(newGwTitle, matchInputs);
      setNewGwTitle('');
      setMatchInputs([
        { homeTeam: '', awayTeam: '', homeLogo: '⚽', awayLogo: '⚽', league: 'الدوري الإنجليزي', date: new Date().toISOString().split('T')[0] }
      ]);
      alert("تم إنشاء الجولة الجديدة وتوليد توقعات يوتيوبرز المصطبة تلقائياً!");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الإنشاء");
    }
  };

  const handleScoreChange = (matchId: string, team: 'home' | 'away', val: string) => {
    setScoreInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [`${team}Score`]: val
      }
    }));
  };

  const handleSaveResult = async (gwId: string, match: Match) => {
    const inputs = scoreInputs[match.id];
    if (!inputs || inputs.homeScore === '' || inputs.awayScore === '') {
      alert("الرجاء إدخال الأهداف للفريقين!");
      return;
    }
    const h = parseInt(inputs.homeScore);
    const a = parseInt(inputs.awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      alert("الرجاء إدخال أرقام صحيحة!");
      return;
    }

    try {
      await onUpdateMatchResult(gwId, match.id, h, a, 'finished');
      alert(`تم تسجيل النتيجة (${h} - ${a}) وحساب النقاط لجميع المتوقعين بنجاح!`);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ النتيجة");
    }
  };

  const handleCommentaryClick = async (gwId: string) => {
    try {
      await onTriggerGeminiCommentary(gwId);
      alert("تم توليد سيناريو حلقة المصطبة بنجاح باستخدام الذكاء الاصطناعي!");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي");
    }
  };

  const activeGwForResults = gameweeks.find(g => g.id === selectedGwId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Gameweek Section */}
      <div className="lg:col-span-2 glass-card rounded-2xl border border-gray-800 p-5 glow-green-sm flex flex-col gap-5">
        <div className="border-b border-gray-800 pb-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Plus className="text-emerald-400 w-5 h-5" />
            إنشاء جولة مباريات جديدة
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            قم بإضافة جولة وتوليد توقعات يوتيوبرز المصطبة الأربعة تلقائياً بناءً على شخصياتهم وميولهم الكروية!
          </p>
        </div>

        <form onSubmit={handleCreateGwSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">عنوان الجولة:</label>
            <input
              type="text"
              required
              placeholder="مثال: الجولة الثالثة - كلاسيكو الأرض"
              value={newGwTitle}
              onChange={(e) => setNewGwTitle(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-300">مباريات الجولة:</label>
              <button
                type="button"
                onClick={handleAddMatchRow}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة مباراة أخرى
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {matchInputs.map((match, index) => (
                <div key={index} className="bg-gray-950 p-4 rounded-xl border border-gray-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <span className="text-[11px] font-bold text-emerald-400">مباراة #{index + 1}</span>
                    {matchInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMatchRow(index)}
                        className="text-[10px] text-red-400 hover:underline transition"
                      >
                        حذف
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Home Team */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">الفريق صاحب الأرض والـ Emoji:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="آرسنال"
                          required
                          value={match.homeTeam}
                          onChange={(e) => handleMatchInputChange(index, 'homeTeam', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="🔴"
                          required
                          value={match.homeLogo}
                          onChange={(e) => handleMatchInputChange(index, 'homeLogo', e.target.value)}
                          className="w-12 text-center bg-gray-900 border border-gray-800 rounded-lg px-1 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    {/* Away Team */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">الفريق الضيف والـ Emoji:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="مانشستر سيتي"
                          required
                          value={match.awayTeam}
                          onChange={(e) => handleMatchInputChange(index, 'awayTeam', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="🩵"
                          required
                          value={match.awayLogo}
                          onChange={(e) => handleMatchInputChange(index, 'awayLogo', e.target.value)}
                          className="w-12 text-center bg-gray-900 border border-gray-800 rounded-lg px-1 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    {/* League */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">الدوري/البطولة:</label>
                      <input
                        type="text"
                        placeholder="الدوري الإنجليزي"
                        required
                        value={match.league}
                        onChange={(e) => handleMatchInputChange(index, 'league', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">التاريخ:</label>
                      <input
                        type="date"
                        required
                        value={match.date}
                        onChange={(e) => handleMatchInputChange(index, 'date', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-sm"
          >
            <Send className="w-4 h-4" />
            تأكيد وإنشاء الجولة
          </button>
        </form>
      </div>

      {/* Enter Match Results Section */}
      <div className="glass-card rounded-2xl border border-gray-800 p-5 glow-green-sm flex flex-col gap-4">
        <div className="border-b border-gray-800 pb-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldAlert className="text-red-400 w-5 h-5" />
            إدخال نتائج المباريات والتعليق
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            سجل النتيجة الفعلية لتفعيل Points-Engine لتعديل ترتيب المتنافسين، أو ولّد روستر حلقة المصطبة بذكاء جيميناي!
          </p>
        </div>

        {/* Selected Gameweek dropdown */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">اختر الجولة لتعديلها:</label>
          <select
            value={selectedGwId}
            onChange={(e) => setSelectedGwId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {gameweeks.map(gw => (
              <option key={gw.id} value={gw.id}>
                {gw.title} ({gw.status === 'completed' ? 'منتهية' : gw.status === 'live' ? 'لايف' : 'قادمة'})
              </option>
            ))}
          </select>
        </div>

        {/* Matches lists to update results */}
        {activeGwForResults ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {activeGwForResults.matches.map(match => {
                const isFinished = match.status === 'finished';
                const input = scoreInputs[match.id] || { homeScore: match.homeScore?.toString() || '', awayScore: match.awayScore?.toString() || '' };

                return (
                  <div key={match.id} className="bg-gray-950 p-3 rounded-xl border border-gray-900 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{match.league}</span>
                      <span>{match.date}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-1.5 w-5/12 overflow-hidden">
                        <span className="text-xl shrink-0">{match.homeLogo}</span>
                        <span className="truncate text-xs font-bold text-white">{match.homeTeam}</span>
                      </div>

                      {/* Inputs to record scores */}
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          placeholder="?"
                          value={input.homeScore}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          className="w-9 h-8 bg-gray-900 border border-gray-800 text-center font-bold text-xs rounded text-white focus:outline-none"
                        />
                        <span className="text-gray-600">:</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="?"
                          value={input.awayScore}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          className="w-9 h-8 bg-gray-900 border border-gray-800 text-center font-bold text-xs rounded text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-1.5 w-5/12 overflow-hidden text-left">
                        <span className="truncate text-xs font-bold text-white">{match.awayTeam}</span>
                        <span className="text-xl shrink-0">{match.awayLogo}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1 border-t border-gray-900/60 pt-2">
                      <span className="text-[10px]">
                        {isFinished ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم تسجيل النتيجة
                          </span>
                        ) : (
                          <span className="text-yellow-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-yellow-500" />
                            لم تلعب بعد
                          </span>
                        )}
                      </span>

                      <button
                        onClick={() => handleSaveResult(activeGwForResults.id, match)}
                        className="px-2.5 py-1 text-[10px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded transition cursor-pointer"
                      >
                        {isFinished ? "تعديل النتيجة" : "تأكيد النتيجة"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI commentary trigger */}
            <div className="border-t border-gray-800 pt-4 mt-1">
              <h3 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                تحليل حلقة المصطبة بالذكاء الاصطناعي:
              </h3>
              <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                بعد إنهاء مباريات هذه الجولة، اضغط أدناه ليدخل يوتيوبرز المصطبة في جدال كروي ساخر تكتيكي عن توقعاتهم الكارثية ونقاطهم!
              </p>
              <button
                onClick={() => handleCommentaryClick(activeGwForResults.id)}
                disabled={isGeneratingCommentary}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-black" />
                {isGeneratingCommentary ? "جاري كتابة السيناريو..." : "توليد سيناريو حلقة المصطبة (Gemini) 🎙️"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 font-bold text-center py-6">
            قم بإنشاء جولة مباريات أولاً لتعديلها.
          </p>
        )}
      </div>
    </div>
  );
}
