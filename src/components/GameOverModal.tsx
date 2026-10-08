import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/uno';
import { sound } from '../utils/audio';

interface GameOverModalProps {
  winner: Player;
  players: Player[];
  myPlayerId: string;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  players,
  myPlayerId,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const isMe = winner.id === myPlayerId;

  useEffect(() => {
    sound.playVictory();
    try {
      const end = Date.now() + 2.5 * 1000;
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // ignore
    }
  }, []);

  // Compute tournament accolades
  const topPlusFoursPlayer = [...players].sort(
    (a, b) => (b.stats?.plusFoursHit || 0) - (a.stats?.plusFoursHit || 0)
  )[0];

  const topPenalizer = [...players].sort(
    (a, b) => (b.stats?.penaltiesGiven || 0) - (a.stats?.penaltiesGiven || 0)
  )[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="relative max-w-md w-full bg-[#0d1422] border border-white/10 rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl bg-white/5 border border-amber-400/30 flex items-center justify-center text-3xl mb-3">
          👑
        </div>

        <h2 className="font-['Cinzel',serif] text-2xl font-bold text-white tracking-tight">
          {isMe ? 'Match Champion' : `${winner.name} Victorious`}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-5">
          {isMe ? 'First to clear hand and claim the tournament table.' : 'All cards cleared. Standings recorded.'}
        </p>

        {/* Tournament Accolades */}
        <div className="grid grid-cols-2 gap-2 w-full mb-4">
          <div className="bg-[#070b12] border border-white/10 p-2.5 rounded-xl text-left">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">
              Wild +4 Specialist
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <span>{topPlusFoursPlayer?.avatar}</span>
              <span className="truncate">{topPlusFoursPlayer?.name}</span>
              <span className="font-mono text-amber-400 tabular-nums ml-auto">
                {topPlusFoursPlayer?.stats?.plusFoursHit || 0}
              </span>
            </div>
          </div>

          <div className="bg-[#070b12] border border-white/10 p-2.5 rounded-xl text-left">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">
              Penalty Enforcer
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <span>{topPenalizer?.avatar}</span>
              <span className="truncate">{topPenalizer?.name}</span>
              <span className="font-mono text-rose-400 tabular-nums ml-auto">
                +{topPenalizer?.stats?.penaltiesGiven || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Final Standings */}
        <div className="w-full bg-[#070b12] rounded-xl border border-white/10 p-2.5 mb-5 flex flex-col gap-1 max-h-40 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-1 mb-0.5">
            Table Standings
          </div>
          {players.map((p, idx) => {
            const isWinner = p.id === winner.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  isWinner ? 'bg-amber-500/15 border border-amber-400/40 text-amber-200' : 'bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-slate-400 tabular-nums">#{idx + 1}</span>
                  <span className="text-base">{p.avatar}</span>
                  <span className="font-bold truncate">{p.name}</span>
                  {p.id === myPlayerId && <span className="text-[10px] text-amber-400">· You</span>}
                </div>
                <div className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0 ml-2">
                  {isWinner ? 'Cleared hand' : `${p.cards.length} cards`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 w-full">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Lobby
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
