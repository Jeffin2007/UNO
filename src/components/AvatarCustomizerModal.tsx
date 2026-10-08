import React, { useEffect } from 'react';
import { AvatarAura } from '../types/uno';
import { sound } from '../utils/audio';
import { Shield, Award, Check, X } from 'lucide-react';

export interface AvatarProfile {
  name: string;
  avatar: string;
  aura: AvatarAura;
  title: string;
}

export const PRESET_AVATARS = [
  { icon: '👑', name: 'Sovereign Crown', desc: 'Imperial Reign' },
  { icon: '♠️', name: 'Master Spade', desc: 'Classic Dominance' },
  { icon: '💎', name: 'Solitaire Diamond', desc: 'Resilient Defense' },
  { icon: '🛡️', name: 'Aegis Shield', desc: 'Defensive Bastion' },
  { icon: '🦁', name: 'Imperial Lion', desc: 'Fierce Competitor' },
  { icon: '🦅', name: 'Sovereign Falcon', desc: 'High Vantage' },
  { icon: '⚔️', name: 'Duelist Blades', desc: 'Direct Challenge' },
  { icon: '🐉', name: 'Wyvern Crest', desc: 'Draconic Power' },
  { icon: '⚜️', name: 'Fleur-de-Lis', desc: 'Royal Heritage' },
  { icon: '🎴', name: 'Cardinal Card', desc: 'Pure Gamecraft' },
  { icon: '🏛️', name: 'Grand Pillar', desc: 'Unshakable Focus' },
  { icon: '🐺', name: 'Lone Wolf', desc: 'Calculated Predator' },
  { icon: '⚡', name: 'Thunderbolt', desc: 'Rapid Finisher' },
  { icon: '🌟', name: 'North Star', desc: 'Steady Navigator' },
  { icon: '⚖️', name: 'Scales of Fate', desc: 'Balanced Strategy' },
  { icon: '🧭', name: 'Astrolabe', desc: 'Deep Calculation' },
];

export const PRESET_AURAS: {
  id: AvatarAura;
  name: string;
  trimColor: string;
  borderClass: string;
  badgeStyle: string;
}[] = [
  {
    id: 'gold',
    name: '24K Aurum',
    trimColor: '#d97706',
    borderClass: 'border-amber-500/80 ring-1 ring-amber-400/40 shadow-amber-950/40',
    badgeStyle: 'text-amber-300',
  },
  {
    id: 'neon',
    name: 'Mirror Platinum',
    trimColor: '#94a3b8',
    borderClass: 'border-slate-300/80 ring-1 ring-slate-200/40 shadow-slate-900/40',
    badgeStyle: 'text-slate-200',
  },
  {
    id: 'crimson',
    name: 'Royal Ruby',
    trimColor: '#e11d48',
    borderClass: 'border-rose-600/80 ring-1 ring-rose-500/40 shadow-rose-950/40',
    badgeStyle: 'text-rose-300',
  },
  {
    id: 'amethyst',
    name: 'Imperial Amethyst',
    trimColor: '#9333ea',
    borderClass: 'border-purple-600/80 ring-1 ring-purple-500/40 shadow-purple-950/40',
    badgeStyle: 'text-purple-300',
  },
  {
    id: 'emerald',
    name: 'Sovereign Jade',
    trimColor: '#059669',
    borderClass: 'border-emerald-600/80 ring-1 ring-emerald-500/40 shadow-emerald-950/40',
    badgeStyle: 'text-emerald-300',
  },
  {
    id: 'obsidian',
    name: 'Brushed Carbide',
    trimColor: '#52525b',
    borderClass: 'border-zinc-500/80 ring-1 ring-zinc-400/30 shadow-black/50',
    badgeStyle: 'text-zinc-300',
  },
];

export const PRESET_TITLES = [
  'Grandmaster',
  'Table Captain',
  'Tactician',
  'High Roller',
  'Card Sharp',
  'Duelist',
  'Challenger',
  'Strategist',
];

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  profile: AvatarProfile;
  onChangeProfile: (profile: AvatarProfile) => void;
  onClose: () => void;
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  isOpen,
  profile,
  onChangeProfile,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeAura = PRESET_AURAS.find((a) => a.id === profile.aura) || PRESET_AURAS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#0d131f] border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="font-['Cinzel',serif] text-xl font-bold tracking-tight text-amber-100">
              Player Identity & Crest
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your tournament insignia, metallic trim, and title banner.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close customizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto pr-1 py-4 space-y-5 scrollbar-thin">
          {/* Tournament Plate Preview */}
          <div className="p-4 rounded-xl bg-[#070b12] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Crest Badge with Active Trim */}
              <div
                className={`flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-b from-[#162032] to-[#0a0f18] text-3xl shadow-lg border ${activeAura.borderClass} shrink-0`}
              >
                <span>{profile.avatar}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">
                    {profile.name || 'Player'}
                  </span>
                  <span className="text-slate-500 font-mono text-xs">·</span>
                  <span className={`text-xs font-semibold ${activeAura.badgeStyle}`}>
                    {profile.title}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>Metallic Trim:</span>
                  <span className="text-slate-200 font-medium">{activeAura.name}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono text-center sm:text-right">
              <span>Arena Status</span>
              <div className="text-emerald-400 font-semibold mt-0.5">Table Ready</div>
            </div>
          </div>

          {/* Section 1: Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Player Name
            </label>
            <input
              type="text"
              maxLength={16}
              value={profile.name}
              onChange={(e) => onChangeProfile({ ...profile, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070b12] border border-white/15 text-white font-medium text-sm focus:outline-none focus:border-amber-400/80 transition-colors placeholder:text-slate-600"
              placeholder="Enter name..."
            />
          </div>

          {/* Section 2: Choose Insignia Crest */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Heraldic Insignia
              </label>
              <span className="text-xs text-slate-500">16 Tournament Emblems</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_AVATARS.map((av) => {
                const isSelected = profile.avatar === av.icon;
                return (
                  <button
                    key={av.name}
                    onClick={() => {
                      sound.playCardSlide();
                      onChangeProfile({ ...profile, avatar: av.icon });
                    }}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-[#070b12] hover:bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title={`${av.name} — ${av.desc}`}
                  >
                    <span className="text-2xl transition-transform group-hover:scale-110">
                      {av.icon}
                    </span>
                    <span className="text-[9px] font-medium mt-1 text-center truncate max-w-full text-slate-300">
                      {av.name.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Select Metallic Trim */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Metallic Trim
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_AURAS.map((a) => {
                const isSelected = profile.aura === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      sound.playTurnChime();
                      onChangeProfile({ ...profile, aura: a.id });
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-white/40 text-white'
                        : 'bg-[#070b12] hover:bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: a.trimColor }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {a.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Title Banner */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tournament Title
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_TITLES.map((title) => {
                const isSelected = profile.title === title;
                return (
                  <button
                    key={title}
                    onClick={() => {
                      sound.playCardSlide();
                      onChangeProfile({ ...profile, title });
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 text-amber-200'
                        : 'bg-[#070b12] hover:bg-white/5 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{title}</span>
                    {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
};
