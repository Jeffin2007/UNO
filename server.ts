import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type { Card, CardColor, EmojiReaction, Player, PlayDirection } from './src/types/uno.ts';
import { calculateNextTurnIndex, canPlayCard, COLORS, createUnoDeck, shuffleCards } from './src/utils/deck.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ServerRoom {
  code: string;
  players: (Player & { ws?: WebSocket })[];
  hostId: string;
  status: 'lobby' | 'playing' | 'game_over';
  currentPlayerIndex: number;
  direction: PlayDirection;
  deck: Card[];
  discardPile: Card[];
  currentColor: CardColor;
  currentValue: Card['value'];
  winner: Player | null;
  lastActionMessage: string;
  turnDeadline: number;
  turnTimer?: NodeJS.Timeout;
  botTimeout?: NodeJS.Timeout;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastRoomState(room: ServerRoom) {
  // Strip ws references before JSON serialization
  const sanitizedPlayers = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    aura: p.aura,
    title: p.title,
    cards: p.cards,
    isBot: p.isBot,
    isHost: p.id === room.hostId,
    hasCalledUno: p.hasCalledUno,
    stats: p.stats,
  }));

  const payload = JSON.stringify({
    type: 'GAME_STATE_UPDATE',
    state: {
      roomCode: room.code,
      status: room.status,
      players: sanitizedPlayers,
      currentPlayerIndex: room.currentPlayerIndex,
      direction: room.direction,
      drawPileCount: room.deck.length,
      discardPile: room.discardPile,
      currentColor: room.currentColor,
      currentValue: room.currentValue,
      winner: room.winner,
      lastActionMessage: room.lastActionMessage,
      turnDeadline: room.turnDeadline,
    },
  });

  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}

function broadcastToRoom(room: ServerRoom, messageObj: any) {
  const payload = JSON.stringify(messageObj);
  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}

function getNextPlayerIndex(room: ServerRoom, step = 1, customDir?: PlayDirection): number {
  const dir = customDir !== undefined ? customDir : room.direction;
  return calculateNextTurnIndex(room.currentPlayerIndex, dir, room.players.length, step);
}

function startGame(room: ServerRoom) {
  if (room.players.length < 2) return;

  room.status = 'playing';
  // 1. High-entropy multi-pass CSPRNG shuffle of 108 cards
  room.deck = shuffleCards(createUnoDeck());
  room.winner = null;

  // Deal 7 cards to each player and initialize stats
  room.players.forEach((player) => {
    player.cards = room.deck.splice(0, 7);
    player.hasCalledUno = false;
    player.stats = {
      cardsPlayed: 0,
      plusFoursHit: 0,
      unosCalled: 0,
      penaltiesGiven: 0,
    };
  });

  // 2. Decide the first player using a fair random method (Basic+ rule)
  const firstPlayerIdx = Math.floor(Math.random() * room.players.length);
  const firstPlayer = room.players[firstPlayerIdx];

  // 3. First player excavates the top card from Draw Pile before their turn (Basic+ rule)
  const initialCard = room.deck.pop()!;
  let startColor: CardColor = initialCard.color === 'wild' ? 'blue' : initialCard.color;
  let startDir: PlayDirection = 1;
  let startIdx = firstPlayerIdx;
  let startMsg = '';

  // If Black card, player can choose color (Basic+ rule)
  if (initialCard.color === 'wild') {
    const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
    firstPlayer.cards.forEach((c) => {
      if (c.color !== 'wild') counts[c.color]++;
    });
    const topCol = (Object.keys(counts) as CardColor[])
      .filter((c) => c !== 'wild')
      .sort((a, b) => counts[b] - counts[a])[0];
    startColor = topCol || 'blue';
    initialCard.chosenColor = startColor;
  }

  // Resolve excavated card effect on first player (as if played by player on his right):
  if (initialCard.value === 'draw2') {
    firstPlayer.cards.push(...room.deck.splice(0, 2));
    startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, room.players.length, 1);
    startMsg = `Excavated Draw Two! ${firstPlayer.name} drew 2 cards and lost turn. ${room.players[startIdx].name} begins!`;
  } else if (initialCard.value === 'wild4') {
    firstPlayer.cards.push(...room.deck.splice(0, 4));
    startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, room.players.length, 1);
    startMsg = `Excavated Wild Draw 4! Color set to ${startColor.toUpperCase()}. ${firstPlayer.name} drew 4 cards and lost turn. ${room.players[startIdx].name} begins!`;
  } else if (initialCard.value === 'skip') {
    startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, room.players.length, 1);
    startMsg = `Excavated Skip! ${firstPlayer.name} was skipped. ${room.players[startIdx].name} begins!`;
  } else if (initialCard.value === 'reverse') {
    if (room.players.length === 2) {
      startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, room.players.length, 1);
      startMsg = `Excavated Reverse (acts as Skip in 2P)! ${firstPlayer.name} skipped. ${room.players[startIdx].name} begins!`;
    } else {
      startDir = -1;
      startIdx = firstPlayerIdx;
      startMsg = `Excavated Reverse! Turn direction reversed to Counter-Clockwise ↺. ${firstPlayer.name} begins!`;
    }
  } else if (initialCard.value === 'wild') {
    startMsg = `Excavated Wild! Color set to ${startColor.toUpperCase()}. ${firstPlayer.name} begins!`;
  } else {
    startMsg = `Match started! Top card is ${initialCard.color.toUpperCase()} ${initialCard.value.toUpperCase()}. ${firstPlayer.name} begins!`;
  }

  room.discardPile = [initialCard];
  room.currentValue = initialCard.value;
  room.currentColor = startColor;
  room.direction = startDir;
  room.currentPlayerIndex = startIdx;
  room.lastActionMessage = startMsg;

  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}

function resetTurnTimer(room: ServerRoom) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.status !== 'playing') return;

  room.turnDeadline = Date.now() + 15000;
  room.turnTimer = setTimeout(() => {
    applyTurnTimeout(room);
  }, 15000);
}

function applyTurnTimeout(room: ServerRoom) {
  if (room.status !== 'playing') return;
  const currentP = room.players[room.currentPlayerIndex];
  if (!currentP) return;

  ensureDeckHasCards(room, 1);
  const drawn = room.deck.pop();
  if (drawn) {
    currentP.cards.push(drawn);
  }

  room.lastActionMessage = `⏱️ ${currentP.name} ran out of time! Auto-drew a penalty card.`;
  room.currentPlayerIndex = getNextPlayerIndex(room, 1);
  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}

function checkBotTurn(room: ServerRoom) {
  if (room.status !== 'playing') return;
  const curr = room.players[room.currentPlayerIndex];
  if (!curr || !curr.isBot) return;

  if (room.botTimeout) clearTimeout(room.botTimeout);

  room.botTimeout = setTimeout(() => {
    runBotAction(room, curr);
  }, 1200);
}

function runBotAction(room: ServerRoom, bot: Player) {
  if (room.status !== 'playing') return;

  const topCard = room.discardPile[room.discardPile.length - 1];
  const playableCards = bot.cards.filter(
    (c) => canPlayCard(c, topCard, room.currentColor, bot.cards).valid
  );

  if (playableCards.length > 0) {
    // Prefer non-wild or action card
    const cardToPlay = playableCards[0];
    let chosenColor: CardColor | undefined;
    if (cardToPlay.color === 'wild') {
      // Pick color bot has most of
      const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
      bot.cards.forEach((c) => {
        if (c.color !== 'wild') counts[c.color]++;
      });
      const topCol = (Object.keys(counts) as CardColor[])
        .filter((c) => c !== 'wild')
        .sort((a, b) => counts[b] - counts[a])[0];
      chosenColor = topCol || 'red';
    }

    // Call UNO if 2 cards before play
    if (bot.cards.length === 2) {
      bot.hasCalledUno = true;
      broadcastToRoom(room, {
        type: 'UNO_CALLED',
        playerId: bot.id,
        playerName: bot.name,
      });
    }

    applyPlayCard(room, bot.id, cardToPlay.id, chosenColor);
  } else {
    // Draw 1 card
    applyDrawCard(room, bot.id);
  }
}

function applyPlayCard(room: ServerRoom, playerId: string, cardId: string, chosenColor?: CardColor) {
  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1 || playerIdx !== room.currentPlayerIndex) return;

  const player = room.players[playerIdx];
  const cardIdx = player.cards.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return;

  const card = player.cards[cardIdx];
  const topCard = room.discardPile[room.discardPile.length - 1];

  const validation = canPlayCard(card, topCard, room.currentColor, player.cards);
  if (!validation.valid) return;

  // Stat update
  if (!player.stats) {
    player.stats = { cardsPlayed: 0, plusFoursHit: 0, unosCalled: 0, penaltiesGiven: 0 };
  }
  player.stats.cardsPlayed++;
  if (card.value === 'wild4') {
    player.stats.plusFoursHit++;
  }

  // Remove card from player hand
  player.cards.splice(cardIdx, 1);

  // If wild, assign chosen color
  if (card.color === 'wild') {
    card.chosenColor = chosenColor || 'blue';
    room.currentColor = card.chosenColor;
  } else {
    room.currentColor = card.color;
  }

  room.currentValue = card.value;
  room.discardPile.push(card);

  // UNO Check
  if (player.cards.length === 1 && !player.hasCalledUno) {
    player.hasCalledUno = true;
    player.stats.unosCalled++;
    broadcastToRoom(room, {
      type: 'UNO_CALLED',
      playerId: player.id,
      playerName: player.name,
    });
  }

  // Win condition check
  if (player.cards.length === 0) {
    room.status = 'game_over';
    room.winner = player;
    room.lastActionMessage = `🎉 ${player.name} won the match!`;
    if (room.turnTimer) clearTimeout(room.turnTimer);
    broadcastRoomState(room);
    return;
  }

  // Apply card action effects
  let nextIdxStep = 1;
  let actionLog = `${player.name} played ${card.color.toUpperCase()} ${card.value.toUpperCase()}.`;

  if (card.value === 'reverse') {
    if (room.players.length === 2) {
      // In 2-player, Reverse acts as a Skip (same player goes again)
      nextIdxStep = 2;
      actionLog = `${player.name} played Reverse (Acts as Skip in 2P)!`;
    } else {
      room.direction = (room.direction * -1) as PlayDirection;
      nextIdxStep = 1;
      actionLog = `${player.name} reversed turn direction to ${room.direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}!`;
    }
  } else if (card.value === 'skip') {
    nextIdxStep = 2; // Next player's turn is skipped
    const skippedPlayer = room.players[getNextPlayerIndex(room, 1)];
    actionLog = `${player.name} skipped ${skippedPlayer.name}!`;
  } else if (card.value === 'draw2') {
    nextIdxStep = 2; // Next player draws 2 cards and loses turn
    const victim = room.players[getNextPlayerIndex(room, 1)];
    ensureDeckHasCards(room, 2);
    victim.cards.push(...room.deck.splice(0, 2));
    actionLog = `${player.name} hit ${victim.name} with Draw Two (+2) & skipped their turn!`;
    player.stats.penaltiesGiven += 2;
  } else if (card.value === 'wild4') {
    nextIdxStep = 2; // Next player draws 4 cards and loses turn
    const victim = room.players[getNextPlayerIndex(room, 1)];
    ensureDeckHasCards(room, 4);
    victim.cards.push(...room.deck.splice(0, 4));
    actionLog = `${player.name} changed color to ${room.currentColor.toUpperCase()} & hit ${victim.name} with +4 (turn skipped)!`;
    player.stats.penaltiesGiven += 4;
  } else if (card.value === 'wild') {
    actionLog = `${player.name} played Wild and set color to ${room.currentColor.toUpperCase()}!`;
  }

  room.lastActionMessage = actionLog;
  room.currentPlayerIndex = getNextPlayerIndex(room, nextIdxStep);

  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}

function applyDrawCard(room: ServerRoom, playerId: string) {
  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1 || playerIdx !== room.currentPlayerIndex) return;

  const player = room.players[playerIdx];
  ensureDeckHasCards(room, 1);
  const drawn = room.deck.pop();
  if (!drawn) return;

  player.cards.push(drawn);

  // In Basic+: "You can either Discard one or Draw one, and not both. Doing both or passing is not an option."
  // Drawing 1 card immediately ends the turn and passes to the next player.
  room.lastActionMessage = `${player.name} drew a card. Turn passed.`;
  room.currentPlayerIndex = getNextPlayerIndex(room, 1);

  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}

function ensureDeckHasCards(room: ServerRoom, count: number) {
  if (room.deck.length >= count) return;
  // Reshuffle discard pile (except top card)
  if (room.discardPile.length > 1) {
    const topCard = room.discardPile.pop()!;
    const cardsToRecycle = room.discardPile.splice(0, room.discardPile.length);
    // Reset any chosenColor on wild cards
    cardsToRecycle.forEach((c) => {
      delete c.chosenColor;
    });
    room.deck.push(...shuffleCards(cardsToRecycle));
    room.discardPile = [topCard];
  }
}

// WebSocket Event Handling
wss.on('connection', (ws: WebSocket) => {
  let userRoomCode: string | null = null;
  let userId: string | null = null;

  ws.on('message', (raw: string) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'CREATE_ROOM') {
        const code = generateRoomCode();
        const player: Player & { ws: WebSocket } = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: msg.name || 'Host',
          avatar: msg.avatar || '😎',
          aura: msg.aura || 'gold',
          title: msg.title || 'Challenger',
          cards: [],
          isHost: true,
          ws,
        };

        const newRoom: ServerRoom = {
          code,
          players: [player],
          hostId: player.id,
          status: 'lobby',
          currentPlayerIndex: 0,
          direction: 1,
          deck: [],
          discardPile: [],
          currentColor: 'red',
          currentValue: '0',
          winner: null,
          lastActionMessage: 'Room created. Waiting for players to join.',
          turnDeadline: 0,
        };

        rooms.set(code, newRoom);
        userRoomCode = code;
        userId = player.id;

        ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode: code, playerId: player.id }));
        broadcastRoomState(newRoom);
      } else if (msg.type === 'JOIN_ROOM') {
        const code = (msg.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${code} not found.` }));
          return;
        }

        if (room.status !== 'lobby') {
          ws.send(JSON.stringify({ type: 'ERROR', message: `Game already in progress.` }));
          return;
        }

        if (room.players.length >= 10) {
          ws.send(JSON.stringify({ type: 'ERROR', message: `Room is full (max 10 players).` }));
          return;
        }

        const newPlayer: Player & { ws: WebSocket } = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: msg.name || `Player ${room.players.length + 1}`,
          avatar: msg.avatar || '🦊',
          aura: msg.aura || 'neon',
          title: msg.title || 'Challenger',
          cards: [],
          isHost: false,
          ws,
        };

        room.players.push(newPlayer);
        userRoomCode = code;
        userId = newPlayer.id;

        ws.send(JSON.stringify({ type: 'JOINED_ROOM', roomCode: code, playerId: newPlayer.id }));
        broadcastRoomState(room);
      } else if (msg.type === 'START_GAME') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          startGame(room);
        }
      } else if (msg.type === 'ADD_BOT') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.players.length < 10) {
          const botIdx = room.players.length + 1;
          const botAvatars = ['🤖', '👾', '⚡', '🐯', '🦄'];
          const botAuras: ('gold' | 'neon' | 'crimson' | 'amethyst' | 'emerald' | 'obsidian')[] = [
            'neon', 'crimson', 'amethyst', 'emerald', 'obsidian'
          ];
          const botTitles = ['AI Prodigy', 'Card Calculator', 'Cyber Tactician', 'Speed Demon', 'Wild Card'];
          room.players.push({
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: `Bot ${botIdx}`,
            avatar: botAvatars[botIdx % botAvatars.length],
            aura: botAuras[botIdx % botAuras.length],
            title: botTitles[botIdx % botTitles.length],
            cards: [],
            isBot: true,
          });
          broadcastRoomState(room);
        }
      } else if (msg.type === 'REMOVE_PLAYER') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          room.players = room.players.filter((p) => p.id !== msg.playerId);
          broadcastRoomState(room);
        }
      } else if (msg.type === 'PLAY_CARD') {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          applyPlayCard(room, userId, msg.cardId, msg.chosenColor);
        }
      } else if (msg.type === 'DRAW_CARD') {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          applyDrawCard(room, userId);
        }
      } else if (msg.type === 'CALL_UNO') {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const player = room.players.find((p) => p.id === userId);
          if (player) {
            if (player.cards.length === 1) {
              player.hasCalledUno = true;
              if (player.stats) player.stats.unosCalled++;
              broadcastToRoom(room, {
                type: 'UNO_CALLED',
                playerId: player.id,
                playerName: player.name,
              });
            } else {
              // Basic+ Rule: "If a player Uno's incorrectly, he draws 3 cards."
              ensureDeckHasCards(room, 3);
              player.cards.push(...room.deck.splice(0, 3));
              room.lastActionMessage = `⚠️ ${player.name} called UNO incorrectly (${player.cards.length} cards in hand)! +3 penalty cards.`;
              broadcastRoomState(room);
            }
          }
        }
      } else if (msg.type === 'CHALLENGE_UNO') {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const challenger = room.players.find((p) => p.id === userId);
          const target = room.players.find((p) => p.id === msg.targetPlayerId);
          if (challenger && target) {
            if (target.cards.length === 1 && !target.hasCalledUno) {
              // Basic+ Rule: Valid challenge -> target draws 3 penalty cards
              ensureDeckHasCards(room, 3);
              target.cards.push(...room.deck.splice(0, 3));
              if (challenger.stats) challenger.stats.penaltiesGiven += 3;
              room.lastActionMessage = `🚨 ${challenger.name} CAUGHT ${target.name} forgetting UNO! +3 Penalty cards!`;
              broadcastToRoom(room, {
                type: 'UNO_CHALLENGE_SUCCESS',
                challengerName: challenger.name,
                targetName: target.name,
              });
              broadcastRoomState(room);
            } else {
              // Basic+ Rule: "If someone calls a player out inappropriately, they draw 3 cards instead."
              ensureDeckHasCards(room, 3);
              challenger.cards.push(...room.deck.splice(0, 3));
              room.lastActionMessage = `⚠️ Inappropriate accusation! ${challenger.name} falsely called out ${target.name} and draws 3 penalty cards.`;
              broadcastRoomState(room);
            }
          }
        }
      } else if (msg.type === 'SEND_EMOJI') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const sender = room.players.find((p) => p.id === userId);
          const reaction: EmojiReaction = {
            id: `react_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            senderId: userId || 'anon',
            senderName: sender?.name || 'Player',
            emoji: msg.emoji,
            label: msg.label,
            timestamp: Date.now(),
          };
          broadcastToRoom(room, {
            type: 'EMOJI_REACTION',
            reaction,
          });
        }
      } else if (msg.type === 'RESTART_GAME') {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          startGame(room);
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (userRoomCode && userId) {
      const room = rooms.get(userRoomCode);
      if (room) {
        room.players = room.players.filter((p) => p.id !== userId);
        if (room.players.length === 0) {
          if (room.botTimeout) clearTimeout(room.botTimeout);
          rooms.delete(userRoomCode);
        } else {
          // If host left, assign new host
          if (room.hostId === userId) {
            room.hostId = room.players[0].id;
          }
          broadcastRoomState(room);
        }
      }
    }
  });
});

// Health check endpoint for Cloud Run and load balancers
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Bind and listen on port immediately so Cloud Run health check passes instantly
server.listen(PORT, '0.0.0.0', () => {
  console.log(`UNO Game Server running on port ${PORT}`);
});

// Setup Vite middleware in dev or static files in production
async function setupMiddlewares() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
          watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev server failed to load, falling back to static:', e);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  }
}

setupMiddlewares();
