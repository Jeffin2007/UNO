import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

interface UnoAnnouncementProps {
  playerName: string;
  onDismiss: () => void;
}

export const UnoAnnouncement: React.FC<UnoAnnouncementProps> = ({ playerName, onDismiss }) => {
  useEffect(() => {
    sound.playUnoCall();

    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#dc2626', '#2563eb', '#d97706', '#16a34a'],
      });
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      onDismiss();
    }, 2400);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      <div className="relative animate-fade-in flex flex-col items-center">
        <div className="relative bg-[#0d1422] border-2 border-amber-400 px-8 py-5 rounded-2xl shadow-2xl flex flex-col items-center text-center">
          <h2 className="font-['Cinzel',serif] text-5xl font-black text-amber-200 tracking-wider">
            UNO!
          </h2>
          <p className="text-xs md:text-sm font-semibold text-white mt-1.5 uppercase tracking-wider">
            <span className="text-amber-400 font-bold">{playerName}</span> holds 1 card
          </p>
        </div>
      </div>
    </div>
  );
};
