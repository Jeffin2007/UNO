import React, { useEffect } from 'react';
import { CardColor } from '../types/uno';
import { sound } from '../utils/audio';

interface ColorPickerModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
  isDrawFour?: boolean;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onSelectColor,
  isDrawFour = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'r') {
        sound.playTurnChime();
        onSelectColor('red');
      } else if (key === '2' || key === 'b') {
        sound.playTurnChime();
        onSelectColor('blue');
      } else if (key === '3' || key === 'y') {
        sound.playTurnChime();
        onSelectColor('yellow');
      } else if (key === '4' || key === 'g') {
        sound.playTurnChime();
        onSelectColor('green');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectColor]);

  if (!isOpen) return null;

  const colors: { name: CardColor; label: string; keyHint: string; bg: string; border: string }[] = [
    { name: 'red', label: 'RED', keyHint: 'R / 1', bg: 'bg-[#dc2626] hover:bg-[#b91c1c]', border: 'border-red-400/50' },
    { name: 'blue', label: 'BLUE', keyHint: 'B / 2', bg: 'bg-[#2563eb] hover:bg-[#1d4ed8]', border: 'border-blue-400/50' },
    { name: 'yellow', label: 'YELLOW', keyHint: 'Y / 3', bg: 'bg-[#d97706] hover:bg-[#b45309]', border: 'border-amber-300/50' },
    { name: 'green', label: 'GREEN', keyHint: 'G / 4', bg: 'bg-[#16a34a] hover:bg-[#15803d]', border: 'border-green-400/50' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 select-none">
      <div className="relative max-w-xs w-full bg-[#0d1422] border border-white/10 rounded-2xl p-5 shadow-2xl text-center flex flex-col items-center">
        <h3 className="font-['Cinzel',serif] text-lg font-bold text-white tracking-wide uppercase">
          {isDrawFour ? 'Wild Draw +4' : 'Wild Card'}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-4 font-medium">
          Choose next active table color
        </p>

        {/* 4 Quadrants */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {colors.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                sound.playTurnChime();
                onSelectColor(c.name);
              }}
              className={`h-20 rounded-xl ${c.bg} border ${c.border} transition-colors flex flex-col items-center justify-center cursor-pointer shadow-lg`}
            >
              <span className="text-sm font-black text-white tracking-wider">
                {c.label}
              </span>
              <span className="text-[10px] font-mono font-bold text-white/80 mt-1">
                [{c.keyHint}]
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
