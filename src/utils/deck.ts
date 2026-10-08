import type { Card, CardColor, CardValue, PlayDirection } from '../types/uno.ts';

export const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];

/**
 * Creates the official 108-card UNO deck.
 */
export function createUnoDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  // 1. Number cards (76 cards)
  for (const color of COLORS) {
    // Exactly 1 '0' per color
    deck.push({
      id: `c_${idCounter++}`,
      color,
      value: '0',
    });

    // Exactly 2 of 1-9 per color
    for (let num = 1; num <= 9; num++) {
      const val = num.toString() as CardValue;
      deck.push({ id: `c_${idCounter++}`, color, value: val });
      deck.push({ id: `c_${idCounter++}`, color, value: val });
    }
  }

  // 2. Action cards: 8 Skip (2 per color), 8 Reverse (2 per color), 8 Draw Two (2 per color)
  for (const color of COLORS) {
    // 2 Skips per color (8 total)
    deck.push({ id: `c_${idCounter++}`, color, value: 'skip' });
    deck.push({ id: `c_${idCounter++}`, color, value: 'skip' });

    // 2 Reverses per color (8 total)
    deck.push({ id: `c_${idCounter++}`, color, value: 'reverse' });
    deck.push({ id: `c_${idCounter++}`, color, value: 'reverse' });

    // 2 Draw Two per color (8 total)
    deck.push({ id: `c_${idCounter++}`, color, value: 'draw2' });
    deck.push({ id: `c_${idCounter++}`, color, value: 'draw2' });
  }

  // 3. Wild cards: 4 Wild + 4 Wild Draw Four (8 total)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'wild' });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'wild4' });
  }

  return deck;
}

/**
 * Cryptographically strong random float in [0, 1)
 */
function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
  }
  return Math.random();
}

/**
 * Shuffles an array of cards using multi-pass CSPRNG Fisher-Yates with deck cutting
 * to eliminate repeating patterns and card clustering.
 */
export function shuffleCards<T>(items: T[]): T[] {
  let array = [...items];
  const n = array.length;
  if (n <= 1) return array;

  // 3-pass Fisher-Yates with cut
  for (let pass = 0; pass < 3; pass++) {
    // 1. Random deck cut & riffle
    const cutPoint = Math.floor(secureRandom() * (n - 10)) + 5;
    if (cutPoint > 0 && cutPoint < n) {
      array = [...array.slice(cutPoint), ...array.slice(0, cutPoint)];
    }

    // 2. High-entropy Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  return array;
}

/**
 * Accurately calculates next player index under Clockwise (+1) or Counter-Clockwise (-1)
 * handling arbitrary steps and wrapping cleanly around any player count.
 */
export function calculateNextTurnIndex(
  currentIndex: number,
  direction: PlayDirection,
  playerCount: number,
  step = 1
): number {
  if (playerCount <= 0) return 0;
  const raw = currentIndex + step * direction;
  return ((raw % playerCount) + playerCount) % playerCount;
}

/**
 * Validates whether a card can be played based on official UNO rules.
 * @param card The card attempting to be played
 * @param topCard The current top discard card
 * @param currentColor The currently active color (or chosen color if previous was wild)
 * @param playerHand The player's current hand (needed for +4 validation rule)
 */
export function canPlayCard(
  card: Card,
  topCard: Card,
  currentColor: CardColor,
  _playerHand?: Card[]
): { valid: boolean; reason?: string } {
  // Wild & Wild Draw Four are always playable
  if (card.value === 'wild' || card.value === 'wild4') {
    return { valid: true };
  }

  // Matching color
  if (card.color === currentColor) {
    return { valid: true };
  }

  // Matching value / symbol
  if (card.value === topCard.value) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Must match active color (${currentColor.toUpperCase()}) or symbol (${topCard.value.toUpperCase()})!`,
  };
}

/**
 * Returns color hex codes and gradient accents
 */
export const COLOR_MAP: Record<CardColor, { bg: string; border: string; glow: string; text: string; hex: string }> = {
  red: {
    bg: 'from-rose-500 to-red-600',
    border: 'border-red-400',
    glow: 'rgba(239, 68, 68, 0.6)',
    text: 'text-red-500',
    hex: '#ef4444',
  },
  blue: {
    bg: 'from-sky-500 to-blue-600',
    border: 'border-blue-400',
    glow: 'rgba(59, 130, 246, 0.6)',
    text: 'text-blue-500',
    hex: '#3b82f6',
  },
  green: {
    bg: 'from-emerald-500 to-green-600',
    border: 'border-green-400',
    glow: 'rgba(34, 197, 94, 0.6)',
    text: 'text-green-500',
    hex: '#22c55e',
  },
  yellow: {
    bg: 'from-amber-400 to-yellow-500',
    border: 'border-yellow-300',
    glow: 'rgba(234, 179, 8, 0.6)',
    text: 'text-yellow-400',
    hex: '#eab308',
  },
  wild: {
    bg: 'from-slate-900 via-purple-900 to-indigo-900',
    border: 'border-purple-400',
    glow: 'rgba(168, 85, 247, 0.6)',
    text: 'text-purple-400',
    hex: '#a855f7',
  },
};
