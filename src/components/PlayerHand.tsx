import React, { useState, useRef, useMemo } from 'react';
import { Card, CardColor } from '../types/uno';
import { canPlayCard } from '../utils/deck';
import { sound } from '../utils/audio';
import { CardView } from './CardView';
import { ChevronLeft, ChevronRight, ArrowUpDown, Bell } from 'lucide-react';

interface PlayerHandProps {
  cards: Card[];
  topDiscardCard: Card;
  currentColor: CardColor;
  isMyTurn: boolean;
  onPlayCard: (card: Card) => void;
  onCallUno?: () => void;
  hasCalledUno?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  topDiscardCard,
  currentColor,
  isMyTurn,
  onPlayCard,
  onCallUno,
  hasCalledUno,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverTilt, setHoverTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverGlare, setHoverGlare] = useState<{ x: number; y: number } | null>(null);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wobbleCardId, setWobbleCardId] = useState<string | null>(null);
  const [isSorted, setIsSorted] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; id: string; time: number } | null>(null);

  // Sorting cards by color and value
  const displayCards = useMemo(() => {
    const list = [...cards];
    if (isSorted) {
      const colorOrder: Record<CardColor, number> = { red: 1, blue: 2, green: 3, yellow: 4, wild: 5 };
      list.sort((a, b) => {
        if (colorOrder[a.color] !== colorOrder[b.color]) {
          return colorOrder[a.color] - colorOrder[b.color];
        }
        return a.value.localeCompare(b.value);
      });
    }
    return list;
  }, [cards, isSorted]);

  const toggleSort = () => {
    sound.playTurnChime();
    setIsSorted(!isSorted);
  };

  const handlePointerEnterCard = (index: number) => {
    setHoveredIndex(index);
    setHoverTilt({ x: 0, y: 0 });
    setHoverGlare({ x: 50, y: 30 });
  };

  const handlePointerLeaveCard = () => {
    setHoveredIndex(null);
    setHoverTilt({ x: 0, y: 0 });
    setHoverGlare(null);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Normalized tilt (-1 to 1)
    const normX = Math.max(-1, Math.min(1, (px - 0.5) * 2));
    const normY = Math.max(-1, Math.min(1, (py - 0.5) * 2));
    setHoverTilt({ x: normX, y: normY });
    setHoverGlare({ x: Math.round(px * 100), y: Math.round(py * 100) });
  };

  const handlePointerDown = (card: Card, e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, id: card.id, time: Date.now() };
    setDraggingCardId(card.id);
    setDragOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (card: Card) => {
    if (!dragStartRef.current) return;
    const dy = dragOffset.y;
    const distanceMoved = Math.hypot(dragOffset.x, dragOffset.y);

    dragStartRef.current = null;
    setDraggingCardId(null);
    setDragOffset({ x: 0, y: 0 });

    // Dragged upwards beyond threshold -> play!
    if (dy < -35) {
      attemptPlayCard(card);
      return;
    }

    // Single click / tap (< 15px movement) -> play immediately!
    if (distanceMoved < 15) {
      attemptPlayCard(card);
    }
  };

  const attemptPlayCard = (card: Card) => {
    if (!isMyTurn) {
      sound.playSkip();
      showTemporaryError('Wait for your turn!');
      return;
    }

    const check = canPlayCard(card, topDiscardCard, currentColor, cards);
    if (!check.valid) {
      sound.playSkip();
      setWobbleCardId(card.id);
      setTimeout(() => setWobbleCardId(null), 500);
      showTemporaryError(check.reason || 'Illegal play!');
      return;
    }

    // Valid card! Play immediately!
    onPlayCard(card);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage(null);
    }, 2400);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const totalCards = cards.length;
  const playableCount = cards.filter(
    (c) => isMyTurn && canPlayCard(c, topDiscardCard, currentColor, cards).valid
  ).length;

  const isLargeHand = totalCards > 8;
  const isHugeHand = totalCards > 13;

  // Responsive dynamic overlap calculation
  let dynamicOverlap = -14;
  if (totalCards > 1) {
    if (totalCards <= 4) {
      dynamicOverlap = -4;
    } else if (totalCards <= 7) {
      dynamicOverlap = -16;
    } else if (totalCards <= 10) {
      dynamicOverlap = -32;
    } else if (totalCards <= 14) {
      dynamicOverlap = -46;
    } else {
      dynamicOverlap = -56;
    }
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-end pointer-events-none px-1 sm:px-2 select-none">
      {/* Rejection / Validation Tooltip */}
      {errorMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-2xl border border-rose-300 backdrop-blur-md pointer-events-auto flex items-center gap-2 animate-bounce">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dragging Drop-Zone Indicator */}
      {draggingCardId && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
          <div className="px-5 py-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.5)]">
            <span className="text-amber-200 font-black text-xs uppercase tracking-wider">
              Release to Play
            </span>
          </div>
        </div>
      )}

      {/* Hand Controls & Status Bar (Clean typography, no pill slop) */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 px-3 mb-1 pointer-events-auto text-xs font-medium">
        {/* Left: Card count summary */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-xs drop-shadow">
            {totalCards} {totalCards === 1 ? 'Card' : 'Cards'}
          </span>
          <span className="text-white/30" aria-hidden="true">·</span>
          <span
            className={`font-semibold text-xs transition-colors ${
              isMyTurn && playableCount > 0
                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'text-slate-400'
            }`}
          >
            {isMyTurn
              ? playableCount > 0
                ? `${playableCount} Playable (Click card to play)`
                : 'No playable cards — Draw from deck'
              : 'Awaiting opponent move'}
          </span>
        </div>

        {/* Right: Sort Button & Prominent UNO Call Button */}
        <div className="flex items-center gap-2">
          {totalCards > 1 && (
            <button
              onClick={toggleSort}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSorted
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-[#090e18]/80 hover:bg-white/10 border-white/15 text-slate-300 hover:text-white'
              }`}
              title="Sort cards by color & number"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{isSorted ? 'Sorted' : 'Sort'}</span>
            </button>
          )}

          {/* Prominent UNO Call Button */}
          {cards.length <= 2 && isMyTurn && onCallUno && !hasCalledUno && (
            <button
              onClick={() => {
                sound.playUnoCall();
                onCallUno();
              }}
              className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-lg border-2 border-amber-300 shadow-[0_0_20px_rgba(239,68,68,0.8)] transition-all cursor-pointer flex items-center gap-1.5 animate-bounce"
            >
              <Bell className="w-3.5 h-3.5 fill-current" />
              <span>CALL UNO!</span>
            </button>
          )}
        </div>
      </div>

      {/* Fan Cards Container with 3D Perspective Stage */}
      <div className="relative w-full max-w-6xl flex items-center justify-center">
        {/* Left Scroll Chevron */}
        {displayCards.length > 8 && (
          <button
            onClick={scrollLeft}
            className="pointer-events-auto absolute left-1 sm:left-2 z-40 p-2 sm:p-2.5 rounded-full bg-slate-900/90 border border-white/20 text-slate-200 hover:text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="Scroll cards left"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* 3D Perspective Container */}
        <div
          ref={scrollContainerRef}
          className="relative flex items-end w-full px-6 sm:px-12 pt-12 pb-2 overflow-x-auto overflow-y-visible pointer-events-auto scrollbar-none perspective-1200"
          style={{
            minHeight: isHugeHand ? '150px' : isLargeHand ? '165px' : '185px',
          }}
        >
          <div
            className={`flex items-end py-2 px-4 preserve-3d ${
              displayCards.length > 8 ? 'justify-start' : 'justify-center w-full'
            }`}
            style={{ minWidth: 'min-content' }}
          >
            {displayCards.map((card, index) => {
              const isDragging = draggingCardId === card.id;
              const isHovered = hoveredIndex === index && !draggingCardId;
              const isWobbling = wobbleCardId === card.id;

              // Arc Layout: smooth gentle radial curvature
              const centerIndex = (totalCards - 1) / 2;
              const normalized = totalCards > 1 ? (index - centerIndex) / centerIndex : 0;
              const maxAngle = isLargeHand ? 14 : 18;
              const baseRotation = normalized * Math.min(maxAngle, totalCards * 1.8);
              const baseOffset = Math.abs(normalized) * (isLargeHand ? 6 : 10);

              const isPlayable = isMyTurn && canPlayCard(card, topDiscardCard, currentColor, cards).valid;

              // 3D Lift & Camera Tilt Transforms
              const activeTiltX = 18 - hoverTilt.y * 12;
              const activeTiltY = hoverTilt.x * 14;

              let cardTransform: string;
              if (isDragging) {
                cardTransform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 70px) scale(1.15) rotate(0deg)`;
              } else if (isHovered) {
                cardTransform = `translate3d(0, -44px, 55px) rotateX(${activeTiltX}deg) rotateY(${activeTiltY}deg) scale(1.16)`;
              } else {
                cardTransform = `translate3d(0, ${baseOffset}px, 0px) rotate(${baseRotation}deg)`;
              }

              return (
                <div
                  key={card.id}
                  onClick={() => attemptPlayCard(card)}
                  onPointerDown={(e) => handlePointerDown(card, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => handlePointerUp(card)}
                  onPointerEnter={() => handlePointerEnterCard(index)}
                  onPointerLeave={handlePointerLeaveCard}
                  onMouseMove={handleCardMouseMove}
                  className={`relative cursor-pointer select-none touch-none shrink-0 preserve-3d ${
                    isWobbling ? 'animate-shake' : ''
                  }`}
                  style={{
                    marginLeft: index === 0 ? 0 : `${dynamicOverlap}px`,
                    transform: cardTransform,
                    zIndex: isDragging ? 100 : isHovered ? 70 : index + 1,
                    transition: isDragging
                      ? 'none'
                      : 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.16s ease',
                    filter: isHovered
                      ? 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.75))'
                      : 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.45))',
                  }}
                >
                  <CardView
                    card={card}
                    isPlayable={isPlayable}
                    isSelected={isHovered || isDragging}
                    isHovered={isHovered}
                    glarePos={isHovered ? hoverGlare : null}
                    size={isHugeHand ? 'sm' : isLargeHand ? 'sm' : 'md'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scroll Chevron */}
        {displayCards.length > 8 && (
          <button
            onClick={scrollRight}
            className="pointer-events-auto absolute right-1 sm:right-2 z-40 p-2 sm:p-2.5 rounded-full bg-slate-900/90 border border-white/20 text-slate-200 hover:text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            title="Scroll cards right"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
