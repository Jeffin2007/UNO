import React, { useState } from 'react';
import { sound } from '../utils/audio';

interface ReactionPickerProps {
  onSendReaction: (emoji: string, label: string) => void;
}

export const REACTION_ITEMS = [
  { emoji: '+4', label: 'Draw 4!', color: 'bg-rose-500/20 border-rose-500 text-rose-400' },
  { emoji: '+2', label: 'Draw 2!', color: 'bg-blue-500/20 border-blue-500 text-blue-400' },
  { emoji: '🔄', label: 'Reverse!', color: 'bg-amber-500/20 border-amber-500 text-amber-400' },
  { emoji: '🛑', label: 'Skip!', color: 'bg-red-500/20 border-red-500 text-red-400' },
  { emoji: '💥', label: 'UNO!', color: 'bg-yellow-500/20 border-yellow-500 text-yellow-300' },
  { emoji: '🔥', label: 'Spicy', color: 'bg-orange-500/20 border-orange-500 text-orange-400' },
  { emoji: '😂', label: 'Haha', color: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' },
  { emoji: '😱', label: 'Nooo', color: 'bg-purple-500/20 border-purple-500 text-purple-400' },
  { emoji: '👑', label: 'EZ Win', color: 'bg-amber-500/20 border-amber-400 text-amber-300' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSendReaction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (emoji: string, label: string) => {
    sound.playEmojiSound(emoji);
    onSendReaction(emoji, label);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
        title="Send Reaction Emoji"
      >
        <span className="text-sm">💬</span>
        <span className="hidden sm:inline">React</span>
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 z-40 bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-2xl flex flex-wrap gap-2 w-60 animate-fade-in">
          <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Interactive Emojis
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full pt-1">
            {REACTION_ITEMS.map((item) => (
              <button
                key={item.emoji}
                onClick={() => handleClick(item.emoji, item.label)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${item.color} hover:scale-105 active:scale-95 transition-transform cursor-pointer group`}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">
                  {item.emoji}
                </span>
                <span className="text-[9px] font-bold mt-0.5 leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
