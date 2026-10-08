import React, { useState } from 'react';
import { AvatarAura, Player } from '../types/uno';
import { sound } from '../utils/audio';
import { AvatarCustomizerModal, AvatarProfile, PRESET_AURAS } from './AvatarCustomizerModal';
import { Trophy, Users, Bot, Gamepad2, Copy, Check, Plus, Trash2, SlidersHorizontal } from 'lucide-react';

interface LobbyScreenProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  myPlayerId: string;
  mode: 'online' | 'local' | 'solo_ai';
  onCreateOnlineRoom: (name: string, avatar: string, aura?: AvatarAura, title?: string) => void;
  onJoinOnlineRoom: (code: string, name: string, avatar: string, aura?: AvatarAura, title?: string) => void;
  onStartSoloAI: (name: string, avatar: string, botCount: number, aura?: AvatarAura, title?: string) => void;
  onStartLocalGame: (playerNames: { name: string; avatar: string; aura?: AvatarAura; title?: string }[]) => void;
  onStartGame: () => void;
  onAddBot: () => void;
  onRemovePlayer: (id: string) => void;
  isConnected: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  players,
  isHost,
  myPlayerId,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onStartSoloAI,
  onStartLocalGame,
  onStartGame,
  onAddBot,
  onRemovePlayer,
}) => {
  const [selectedTab, setSelectedTab] = useState<'online' | 'solo' | 'local'>('online');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<AvatarProfile>({
    name: 'AcePlayer',
    avatar: '👑',
    aura: 'gold',
    title: 'Grandmaster',
  });
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Local Pass & Play State
  const [localPlayers, setLocalPlayers] = useState<{ name: string; avatar: string; aura: AvatarAura; title: string }[]>([
    { name: 'Player 1', avatar: '👑', aura: 'gold', title: 'Grandmaster' },
    { name: 'Player 2', avatar: '🦁', aura: 'crimson', title: 'Card Sharp' },
  ]);
  const [soloBotCount, setSoloBotCount] = useState(3);

  const activeAuraCfg = PRESET_AURAS.find((a) => a.id === userProfile.aura) || PRESET_AURAS[0];

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const addLocalPlayer = () => {
    if (localPlayers.length >= 8) return;
    const nextIdx = localPlayers.length + 1;
    const icons = ['♠️', '💎', '🛡️', '🦅', '⚔️', '🐉'];
    const auras: AvatarAura[] = ['crimson', 'amethyst', 'emerald', 'obsidian', 'gold', 'neon'];
    setLocalPlayers([
      ...localPlayers,
      {
        name: `Seat ${nextIdx}`,
        avatar: icons[(nextIdx - 1) % icons.length],
        aura: auras[(nextIdx - 1) % auras.length],
        title: 'Challenger',
      },
    ]);
  };

  const removeLocalPlayer = (idx: number) => {
    if (localPlayers.length <= 2) return;
    setLocalPlayers(localPlayers.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 bg-[#070b12] text-slate-100 select-none overflow-y-auto">
      {/* Background Arena Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#121c2e] via-[#090d16] to-[#04060a] pointer-events-none" />

      {/* Header Tournament Branding */}
      <header className="text-center mb-6 relative z-10 max-w-xl">
        <h1 className="font-['Cinzel',serif] text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
          UNO GRAND ARENA
        </h1>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium mt-2">
          <span>Official 108-Card Standard</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>Tactile 3D Physics</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>15s Turn Clock</span>
        </div>
      </header>

      {/* Main Tournament Panel */}
      <div className="relative z-10 w-full max-w-lg bg-[#0d1422] border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl backdrop-blur-sm">
        {/* If inside an online room waiting for game start */}
        {roomCode ? (
          <div className="flex flex-col items-center gap-5">
            {/* Team Room Code Display */}
            <div className="w-full bg-[#070b12] border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                Match Code
              </span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-amber-200 tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Share this code with up to 10 players on any device.
              </p>
            </div>

            {/* Players in Room List */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Players at Table ({players.length}/10)
                </span>
                {isHost && players.length < 10 && (
                  <button
                    onClick={onAddBot}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add AI Seat</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {players.map((p) => {
                  const isMe = p.id === myPlayerId;
                  const aura = PRESET_AURAS.find((a) => a.id === p.aura) || PRESET_AURAS[0];

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        isMe
                          ? 'bg-white/10 border-amber-400/50 text-white'
                          : 'bg-[#070b12] border-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-lg border ${aura.borderClass} shrink-0`}
                        >
                          {p.avatar}
                        </div>
                        <div className="truncate text-left">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isHost && (
                              <span className="text-[10px] text-amber-300 font-mono">
                                [HOST]
                              </span>
                            )}
                            {p.isBot && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                [BOT]
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.title || 'Challenger'}
                          </div>
                        </div>
                      </div>

                      {isHost && p.id !== myPlayerId && (
                        <button
                          onClick={() => onRemovePlayer(p.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                          title="Remove player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Match Trigger */}
            <div className="w-full pt-2">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={players.length < 2}
                  className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                    players.length >= 2
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>
                    {players.length >= 2 ? 'Deal Cards & Begin Match' : 'Requires At Least 2 Players'}
                  </span>
                </button>
              ) : (
                <div className="w-full py-3 text-center bg-[#070b12] rounded-lg border border-white/10 text-xs font-medium text-slate-400">
                  Waiting for host to start match...
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Lobby Configuration */
          <div>
            {/* Mode Segmented Controls */}
            <div className="grid grid-cols-3 gap-1 bg-[#070b12] p-1 rounded-xl border border-white/10 mb-5">
              <button
                onClick={() => {
                  sound.playTurnChime();
                  setSelectedTab('online');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTab === 'online'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Online</span>
              </button>
              <button
                onClick={() => {
                  sound.playTurnChime();
                  setSelectedTab('solo');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTab === 'solo'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Solo AI</span>
              </button>
              <button
                onClick={() => {
                  sound.playTurnChime();
                  setSelectedTab('local');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTab === 'local'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Pass & Play</span>
              </button>
            </div>

            {/* Player Crest & Identity Card */}
            <div className="mb-5 p-3.5 rounded-xl bg-[#070b12] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-[#0d1422] flex items-center justify-center text-2xl border ${activeAuraCfg.borderClass} shrink-0`}
                >
                  <span>{userProfile.avatar}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{userProfile.name}</span>
                    <span className="text-slate-500 font-mono text-xs">·</span>
                    <span className={`text-xs font-medium ${activeAuraCfg.badgeStyle}`}>
                      {userProfile.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Trim: {activeAuraCfg.name}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playTurnChime();
                  setIsCustomizerOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>Edit Crest</span>
              </button>
            </div>

            {/* TAB 1: ONLINE ARENA */}
            {selectedTab === 'online' && (
              <div className="space-y-4">
                <button
                  onClick={() =>
                    onCreateOnlineRoom(userProfile.name, userProfile.avatar, userProfile.aura, userProfile.title)
                  }
                  className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Arena Match</span>
                </button>

                <div className="relative flex items-center justify-center py-0.5">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#0d1422] px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 absolute">
                    or join with code
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENTER 6-CHAR CODE"
                    maxLength={8}
                    className="flex-1 bg-[#070b12] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold text-white placeholder-slate-600 uppercase tracking-widest focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (joinCodeInput.trim()) {
                        onJoinOnlineRoom(
                          joinCodeInput.trim(),
                          userProfile.name,
                          userProfile.avatar,
                          userProfile.aura,
                          userProfile.title
                        );
                      }
                    }}
                    disabled={!joinCodeInput.trim()}
                    className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                      joinCodeInput.trim()
                        ? 'bg-white/15 hover:bg-white/20 text-white cursor-pointer border border-white/20'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Join
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SOLO VS AI */}
            {selectedTab === 'solo' && (
              <div className="space-y-4">
                <div className="bg-[#070b12] p-3.5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Opponents at Table
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {soloBotCount + 1} Players Total
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          sound.playCardSlide();
                          setSoloBotCount(num);
                        }}
                        className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                          soloBotCount === num
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num} {num === 1 ? 'Bot' : 'Bots'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    onStartSoloAI(userProfile.name, userProfile.avatar, soloBotCount, userProfile.aura, userProfile.title)
                  }
                  className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Start Solo Match</span>
                </button>
              </div>
            )}

            {/* TAB 3: PASS & PLAY (LOCAL) */}
            {selectedTab === 'local' && (
              <div className="space-y-4">
                <div className="bg-[#070b12] p-3.5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Seat Roster ({localPlayers.length}/8)
                    </span>
                    {localPlayers.length < 8 && (
                      <button
                        onClick={addLocalPlayer}
                        className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer bg-white/5 px-2.5 py-1 rounded-md border border-white/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Seat</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {localPlayers.map((lp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-[#0d1422] p-2 rounded-lg border border-white/10"
                      >
                        <span className="text-lg p-1 bg-black/40 rounded border border-white/10">
                          {lp.avatar}
                        </span>
                        <input
                          type="text"
                          value={lp.name}
                          onChange={(e) => {
                            const updated = [...localPlayers];
                            updated[idx].name = e.target.value.slice(0, 16);
                            setLocalPlayers(updated);
                          }}
                          className="flex-1 bg-transparent text-white font-medium text-xs focus:outline-none"
                        />
                        {localPlayers.length > 2 && (
                          <button
                            onClick={() => removeLocalPlayer(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove seat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onStartLocalGame(localPlayers)}
                  className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Begin Pass & Play Match</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heraldic Crest Customizer Modal */}
      <AvatarCustomizerModal
        isOpen={isCustomizerOpen}
        profile={userProfile}
        onChangeProfile={setUserProfile}
        onClose={() => setIsCustomizerOpen(false)}
      />
    </div>
  );
};
