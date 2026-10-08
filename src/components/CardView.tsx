import React from 'react';
import { Card, CardColor, CardValue } from '../types/uno.ts';

interface CardViewProps {
  card: Card;
  isPlayable?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  glarePos?: { x: number; y: number } | null;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ColorGlassStyle {
  tintBg: string;
  frostLayer: string;
  outerBorder: string;
  innerBorder: string;
  glowColor: string;
  textColor: string;
  accent: string;
  ovalBacking: string;
}

const GLASS_STYLES: Record<CardColor, ColorGlassStyle> = {
  red: {
    tintBg: 'from-rose-600/85 via-red-600/70 to-rose-950/90',
    frostLayer: 'bg-red-500/20',
    outerBorder: 'border-rose-400/80',
    innerBorder: 'border-rose-300/60',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    textColor: 'text-rose-200',
    accent: '#f43f5e',
    ovalBacking: 'bg-rose-950/80',
  },
  blue: {
    tintBg: 'from-sky-500/85 via-blue-600/70 to-blue-950/90',
    frostLayer: 'bg-blue-500/20',
    outerBorder: 'border-sky-400/80',
    innerBorder: 'border-sky-300/60',
    glowColor: 'rgba(56, 189, 248, 0.9)',
    textColor: 'text-sky-200',
    accent: '#38bdf8',
    ovalBacking: 'bg-blue-950/80',
  },
  green: {
    tintBg: 'from-emerald-500/85 via-green-600/70 to-emerald-950/90',
    frostLayer: 'bg-emerald-500/20',
    outerBorder: 'border-emerald-400/80',
    innerBorder: 'border-emerald-300/60',
    glowColor: 'rgba(52, 211, 153, 0.9)',
    textColor: 'text-emerald-200',
    accent: '#34d399',
    ovalBacking: 'bg-emerald-950/80',
  },
  yellow: {
    tintBg: 'from-amber-400/90 via-yellow-500/75 to-amber-950/90',
    frostLayer: 'bg-amber-400/20',
    outerBorder: 'border-amber-300/90',
    innerBorder: 'border-amber-200/70',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    textColor: 'text-amber-200',
    accent: '#fbbf24',
    ovalBacking: 'bg-amber-950/80',
  },
  wild: {
    tintBg: 'from-violet-600/85 via-fuchsia-600/70 to-slate-950/95',
    frostLayer: 'bg-purple-500/25',
    outerBorder: 'border-fuchsia-300/80',
    innerBorder: 'border-purple-300/60',
    glowColor: 'rgba(216, 180, 254, 0.95)',
    textColor: 'text-fuchsia-200',
    accent: '#c084fc',
    ovalBacking: 'bg-purple-950/85',
  },
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isPlayable = true,
  isSelected = false,
  isHovered = false,
  glarePos,
  onClick,
  className = '',
  size = 'md',
}) => {
  const { color, value } = card;
  const style = GLASS_STYLES[color] || GLASS_STYLES.wild;

  // Responsive dimensions with authentic physical card ratio (approx 2.5 : 3.6)
  const dimensions = {
    sm: 'w-[74px] h-[112px] sm:w-[82px] sm:h-[124px] text-xs rounded-xl',
    md: 'w-[90px] h-[136px] sm:w-[104px] sm:h-[156px] text-sm rounded-2xl',
    lg: 'w-[130px] h-[196px] sm:w-[150px] sm:h-[226px] text-base rounded-3xl',
  }[size];

  const renderSymbol = (val: CardValue, isCenter = false) => {
    switch (val) {
      case 'skip':
        return (
          <div className="flex items-center justify-center font-black">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              className={
                isCenter
                  ? size === 'sm'
                    ? 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                    : 'w-11 h-11 sm:w-13 sm:h-13 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'
                  : 'w-3 h-3 sm:w-3.5 sm:h-3.5'
              }
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
            </svg>
          </div>
        );
      case 'reverse':
        return (
          <div className="flex items-center justify-center font-black">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                isCenter
                  ? size === 'sm'
                    ? 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                    : 'w-11 h-11 sm:w-13 sm:h-13 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'
                  : 'w-3 h-3 sm:w-3.5 sm:h-3.5'
              }
            >
              <path d="M7 16V4m0 0L3 8m4-4l4 4" />
              <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
      case 'draw2':
        return (
          <span
            className={`font-black font-mono tracking-tighter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
              isCenter ? (size === 'sm' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl') : 'text-[11px] sm:text-xs'
            }`}
          >
            +2
          </span>
        );
      case 'wild':
        return isCenter ? (
          <div className="flex flex-col items-center">
            {/* 4-quadrant jewel crystal lens */}
            <div
              className={`grid grid-cols-2 gap-0.5 rounded-full overflow-hidden border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-sm ${
                size === 'sm' ? 'w-7 h-7' : 'w-11 h-11'
              }`}
            >
              <div className="bg-rose-500/90 shadow-inner" />
              <div className="bg-sky-400/90 shadow-inner" />
              <div className="bg-amber-400/90 shadow-inner" />
              <div className="bg-emerald-500/90 shadow-inner" />
            </div>
            <span
              className={`font-black uppercase tracking-wider text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                size === 'sm' ? 'text-[8px] mt-0.5' : 'text-[10px] mt-1'
              }`}
            >
              WILD
            </span>
          </div>
        ) : (
          <span className="font-black text-[11px] sm:text-xs text-fuchsia-300">W</span>
        );
      case 'wild4':
        return isCenter ? (
          <div className="flex flex-col items-center">
            <div className="flex -space-x-1.5 drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]">
              <div
                className={`rounded bg-rose-500/90 border border-white/80 transform -rotate-12 shadow-sm ${
                  size === 'sm' ? 'w-3 h-4 sm:w-3.5 sm:h-5' : 'w-4 h-6 sm:w-5 sm:h-7'
                }`}
              />
              <div
                className={`rounded bg-sky-400/90 border border-white/80 transform -rotate-6 shadow-sm ${
                  size === 'sm' ? 'w-3 h-4 sm:w-3.5 sm:h-5' : 'w-4 h-6 sm:w-5 sm:h-7'
                }`}
              />
              <div
                className={`rounded bg-amber-400/90 border border-white/80 transform rotate-6 shadow-sm ${
                  size === 'sm' ? 'w-3 h-4 sm:w-3.5 sm:h-5' : 'w-4 h-6 sm:w-5 sm:h-7'
                }`}
              />
              <div
                className={`rounded bg-emerald-500/90 border border-white/80 transform rotate-12 shadow-sm ${
                  size === 'sm' ? 'w-3 h-4 sm:w-3.5 sm:h-5' : 'w-4 h-6 sm:w-5 sm:h-7'
                }`}
              />
            </div>
            <span
              className={`font-black font-mono text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                size === 'sm' ? 'text-lg sm:text-xl mt-0.5' : 'text-2xl sm:text-3xl mt-1'
              }`}
            >
              +4
            </span>
          </div>
        ) : (
          <span className="font-black font-mono text-[11px] sm:text-xs text-amber-300">+4</span>
        );
      default:
        return (
          <span
            className={`font-black font-mono tracking-tight ${
              isCenter
                ? size === 'sm'
                  ? 'text-2xl sm:text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]'
                  : 'text-4xl sm:text-5xl md:text-6xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)]'
                : 'text-xs sm:text-sm drop-shadow'
            }`}
          >
            {val}
          </span>
        );
    }
  };

  const ovalDims =
    size === 'sm' ? 'w-11 h-15 sm:w-13 sm:h-17 rounded-full' : 'w-14 h-20 sm:w-16 sm:h-24 md:w-18 md:h-26 rounded-full';

  return (
    <div
      onClick={onClick}
      className={`group relative select-none ${dimensions} ${className}
        p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden
        backdrop-blur-xl bg-slate-950/20
        border
        transition-all duration-200
        ${isPlayable ? 'border-white/50 hover:border-white/90 active:scale-95 cursor-pointer' : 'border-white/15 opacity-40 brightness-75 grayscale-[35%] cursor-not-allowed'}
        ${isSelected ? 'ring-2 sm:ring-4 ring-amber-400 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.8)]' : ''}
      `}
      style={{
        boxShadow: isPlayable
          ? `0 14px 28px -4px rgba(0,0,0,0.7), 0 0 22px ${style.glowColor}, inset 0 1px 1px 0 rgba(255,255,255,0.6)`
          : '0 6px 14px -4px rgba(0,0,0,0.6)',
      }}
    >
      {/* 1. Translucent Tinted Crystal Body with Refractive Chamfer */}
      <div
        className={`relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-br ${style.tintBg} ${style.frostLayer}
          border ${style.innerBorder} flex flex-col justify-between p-1 sm:p-1.5 overflow-hidden shadow-inner backdrop-blur-md`}
      >
        {/* Holographic Prismatic Specular Foil Texture */}
        <div
          className="absolute inset-0 opacity-[0.09] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px), linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%)',
            backgroundSize: '10px 10px, 16px 16px',
          }}
        />

        {/* Dynamic Refractive Glass Sheen (Permanent diagonal gloss highlight) */}
        <div
          className="absolute top-0 left-0 right-0 h-3/5 bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-lg mix-blend-screen"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 65%, 0 100%)',
          }}
        />

        {/* Interactive Pointer Glare / Shimmer Highlight */}
        {glarePos && isHovered && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 35%, transparent 70%)`,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Hover Ambient Glass Sweep Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent transform rotate-25 -translate-x-20 group-hover:translate-x-48 transition-transform duration-700 ease-out" />
        </div>

        {/* Top Left Corner Index: Floating crisp etched numeral */}
        <div className="relative z-10 flex flex-col items-start leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-black">
          {renderSymbol(value, false)}
        </div>

        {/* Center Floating Frosted Glass Lens with Angled Symbol */}
        <div className="relative z-10 my-auto self-center">
          <div
            className={`relative flex items-center justify-center ${ovalDims} transform -rotate-25
              shadow-[0_6px_18px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)]
              border border-white/50 backdrop-blur-md
              ${color === 'wild' ? 'bg-slate-950/70' : style.ovalBacking}
            `}
          >
            {/* Center oval interior glossy reflection */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

            <div
              className={`transform rotate-25 font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                color === 'wild' ? 'text-white' : 'text-white'
              }`}
            >
              {renderSymbol(value, true)}
            </div>
          </div>
        </div>

        {/* Bottom Right Inverted Corner Index */}
        <div className="relative z-10 flex flex-col items-end leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-black transform rotate-180">
          {renderSymbol(value, false)}
        </div>
      </div>

      {/* Playable Aura: Luminous bottom crystal light beam */}
      {isPlayable && (
        <div
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-1 rounded-full shadow-[0_0_10px_#f59e0b] animate-pulse"
          style={{
            background: `linear-gradient(90deg, transparent, ${style.accent}, transparent)`,
          }}
        />
      )}

      {/* Physical Glass Beveled Edge Highlight Rim */}
      <div className="absolute inset-0 rounded-xl pointer-events-none border border-white/20 mix-blend-overlay" />
    </div>
  );
};
