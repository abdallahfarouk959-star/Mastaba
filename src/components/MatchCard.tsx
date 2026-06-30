import React, { useState, useEffect } from 'react';
import { Match, Prediction, User } from '../types';
import { Save, Calendar, Trophy, AlertCircle, Sparkles } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  onSavePrediction: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  youtubers: User[];
  allPredictions: Prediction[];
  currentUser: User | null;
}

export default function MatchCard({
  match,
  prediction,
  onSavePrediction,
  youtubers,
  allPredictions,
  currentUser
}: MatchCardProps) {
  const [homeInput, setHomeInput] = useState<string>('');
  const [awayInput, setAwayInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state if prediction prop changes
  useEffect(() => {
    if (prediction) {
      setHomeInput(prediction.predictedHomeScore.toString());
      setAwayInput(prediction.predictedAwayScore.toString());
    } else {
      setHomeInput('');
      setAwayInput('');
    }
  }, [prediction]);

  const handleSave = async () => {
    if (homeInput === '' || awayInput === '') return;
    const h = parseInt(homeInput);
    const a = parseInt(awayInput);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setIsSaving(true);
    try {
      await onSavePrediction(match.id, h, a);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isPlayed = match.status === 'finished';

  // Find YouTuber predictions for this match
  const ytPredictions = youtubers.map(yt => {
    const pred = allPredictions.find(p => p.userId === yt.id && p.matchId === match.id);
    return {
      youtuber: yt,
      prediction: pred
    };
  });

  return (
    <div id={`match-card-${match.id}`} className="glass-card rounded-2xl border border-white/5 p-5 glow-emerald flex flex-col gap-4 relative overflow-hidden group hover:bg-white/[0.03] transition-all">
      {/* Immersive UI Green side accent line */}
      <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 opacity-80" />

      {/* Top Match Metadata */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/10">
          {match.league}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span>{match.date}</span>
        </div>
      </div>

      {/* Teams and Score Entry / Display */}
      <div className="grid grid-cols-3 items-center py-4 text-center relative z-10">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl filter drop-shadow-sm select-none">{match.homeLogo}</span>
          <span className="text-sm md:text-base font-bold text-white">{match.homeTeam}</span>
        </div>

        {/* Score display (Live / Ended) or Inputs */}
        <div className="flex flex-col items-center justify-center">
          {isPlayed ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-2xl font-black text-emerald-400">{match.homeScore}</span>
                <span className="text-gray-600 font-bold">:</span>
                <span className="text-2xl font-black text-emerald-400">{match.awayScore}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 mt-1">
                انتهت المباراة
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2">
                <input
                  id={`home-score-input-${match.id}`}
                  type="number"
                  min="0"
                  disabled={!currentUser}
                  placeholder="-"
                  value={homeInput}
                  onChange={(e) => setHomeInput(e.target.value)}
                  className="w-12 h-12 text-center text-xl font-bold bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <span className="text-gray-600 font-bold">:</span>
                <input
                  id={`away-score-input-${match.id}`}
                  type="number"
                  min="0"
                  disabled={!currentUser}
                  placeholder="-"
                  value={awayInput}
                  onChange={(e) => setAwayInput(e.target.value)}
                  className="w-12 h-12 text-center text-xl font-bold bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {currentUser ? (
                <button
                  id={`save-pred-btn-${match.id}`}
                  onClick={handleSave}
                  disabled={isSaving || homeInput === '' || awayInput === ''}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 transition-all rounded-xl cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.5)]"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ!' : 'حفظ التوقع'}
                </button>
              ) : (
                <p className="text-[10px] text-yellow-400 flex items-center gap-1 mt-1 font-medium bg-yellow-500/5 px-2 py-1 rounded border border-yellow-500/10">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  سجل دخولك لتتوقع
                </p>
              )}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl filter drop-shadow-sm select-none">{match.awayLogo}</span>
          <span className="text-sm md:text-base font-bold text-white">{match.awayTeam}</span>
        </div>
      </div>

      {/* User's Prediction outcome (only shown when game is ended) */}
      {isPlayed && prediction && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs text-gray-400">توقعك أنت:</p>
            <p className="text-sm font-bold text-white">
              {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
            </p>
          </div>
          <div className="text-left bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <p className="text-[10px] text-emerald-400/80 leading-none">النقاط المكتسبة</p>
              <p className="text-sm font-black leading-tight">+{prediction.pointsEarned ?? 0} ن</p>
            </div>
          </div>
        </div>
      )}

      {/* YouTuber Predictions (Showcase Section) */}
      <div className="border-t border-white/5 pt-3 mt-1 relative z-10">
        <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          توقعات يوتيوبرز المصطبة:
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {ytPredictions.map(({ youtuber, prediction: ytPred }) => {
            let badgeBg = "bg-white/5 border-white/5 text-gray-300";
            if (isPlayed && ytPred) {
              if (ytPred.pointsEarned === 5) {
                badgeBg = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold";
              } else if (ytPred.pointsEarned && ytPred.pointsEarned > 0) {
                badgeBg = "bg-blue-500/10 border-blue-500/25 text-blue-300";
              } else {
                badgeBg = "bg-red-500/5 border-red-500/10 text-red-400/80";
              }
            }

            return (
              <div 
                key={youtuber.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs ${badgeBg}`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <img
                    src={youtuber.avatarUrl}
                    alt={youtuber.name}
                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <span className="truncate text-[11px] font-bold text-gray-200">{youtuber.name.split(" ")[0]}</span>
                </div>
                <div className="text-right font-mono font-bold">
                  {ytPred ? (
                    <div className="flex items-center gap-1">
                      <span>{ytPred.predictedHomeScore}-{ytPred.predictedAwayScore}</span>
                      {isPlayed && (
                        <span className="text-[9px] px-1 bg-white/5 rounded">
                          +{ytPred.pointsEarned ?? 0}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500">بلا توقع</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
