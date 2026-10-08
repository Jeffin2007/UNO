export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
  // If wild, chosenColor is set once played
  chosenColor?: CardColor;
}

export type AvatarAura = 'gold' | 'neon' | 'crimson' | 'amethyst' | 'emerald' | 'obsidian';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  aura?: AvatarAura;
  title?: string;
  cards: Card[];
  isBot?: boolean;
  isHost?: boolean;
  hasCalledUno?: boolean;
  score?: number;
  stats?: {
    cardsPlayed: number;
    plusFoursHit: number;
    unosCalled: number;
    penaltiesGiven: number;
  };
}

export type PlayDirection = 1 | -1; // 1: clockwise, -1: counterclockwise

export interface EmojiReaction {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  label?: string;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface GameState {
  roomCode: string;
  mode: 'online' | 'local' | 'solo_ai';
  status: 'lobby' | 'playing' | 'game_over';
  players: Player[];
  currentPlayerIndex: number;
  direction: PlayDirection;
  drawPileCount: number;
  discardPile: Card[];
  currentColor: CardColor;
  currentValue: CardValue;
  pendingDrawPenalty: number;
  pendingColorPick: boolean;
  lastActionMessage: string;
  winner: Player | null;
  turnCountdown?: number;
  unoDeclaredBy: string | null;
}

export interface ClientMoveMessage {
  type: 'PLAY_CARD';
  cardId: string;
  chosenColor?: CardColor;
}

export interface ClientDrawMessage {
  type: 'DRAW_CARD';
}

export interface ClientUnoMessage {
  type: 'CALL_UNO';
}

export interface ClientEmojiMessage {
  type: 'SEND_EMOJI';
  emoji: string;
  label?: string;
}

export interface ClientJoinMessage {
  type: 'JOIN_ROOM';
  roomCode: string;
  name: string;
  avatar: string;
  isHost?: boolean;
}

export interface ClientStartMessage {
  type: 'START_GAME';
}

export interface ClientAddBotMessage {
  type: 'ADD_BOT';
}

export interface ClientRemovePlayerMessage {
  type: 'REMOVE_PLAYER';
  playerId: string;
}

export interface ClientPassTurnMessage {
  type: 'PASS_TURN';
}
