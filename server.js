// server.ts
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";

// src/utils/deck.ts
var COLORS = ["red", "yellow", "green", "blue"];
function createUnoDeck() {
  const deck = [];
  let idCounter = 1;
  for (const color of COLORS) {
    deck.push({
      id: `c_${idCounter++}`,
      color,
      value: "0"
    });
    for (let num = 1; num <= 9; num++) {
      const val = num.toString();
      deck.push({ id: `c_${idCounter++}`, color, value: val });
      deck.push({ id: `c_${idCounter++}`, color, value: val });
    }
  }
  for (const color of COLORS) {
    deck.push({ id: `c_${idCounter++}`, color, value: "skip" });
    deck.push({ id: `c_${idCounter++}`, color, value: "skip" });
    deck.push({ id: `c_${idCounter++}`, color, value: "reverse" });
    deck.push({ id: `c_${idCounter++}`, color, value: "reverse" });
    deck.push({ id: `c_${idCounter++}`, color, value: "draw2" });
    deck.push({ id: `c_${idCounter++}`, color, value: "draw2" });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: "wild", value: "wild" });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: "wild", value: "wild4" });
  }
  return deck;
}
function shuffleCards(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function canPlayCard(card, topCard, currentColor, playerHand) {
  if (card.value === "wild") {
    return { valid: true };
  }
  if (card.value === "wild4") {
    const hasMatchingColor = playerHand.some(
      (c) => c.color === currentColor && c.value !== "wild" && c.value !== "wild4"
    );
    if (hasMatchingColor) {
      return {
        valid: false,
        reason: "Wild +4 can only be played when you hold NO cards matching the active color!"
      };
    }
    return { valid: true };
  }
  if (card.color === currentColor) {
    return { valid: true };
  }
  if (card.value === topCard.value) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `Must match active color (${currentColor.toUpperCase()}) or symbol (${topCard.value.toUpperCase()})!`
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = 3e3;
var app = express();
var server = http.createServer(app);
var wss = new WebSocketServer({ server });
var rooms = /* @__PURE__ */ new Map();
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
function broadcastRoomState(room) {
  const sanitizedPlayers = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    cards: p.cards,
    isBot: p.isBot,
    isHost: p.id === room.hostId,
    hasCalledUno: p.hasCalledUno,
    stats: p.stats
  }));
  const payload = JSON.stringify({
    type: "GAME_STATE_UPDATE",
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
      turnDeadline: room.turnDeadline
    }
  });
  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}
function broadcastToRoom(room, messageObj) {
  const payload = JSON.stringify(messageObj);
  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}
function getNextPlayerIndex(room, step = 1) {
  const n = room.players.length;
  if (n === 0) return 0;
  return (room.currentPlayerIndex + step * room.direction + n * 100) % n;
}
function startGame(room) {
  if (room.players.length < 2) return;
  room.status = "playing";
  room.deck = shuffleCards(createUnoDeck());
  room.direction = 1;
  room.currentPlayerIndex = 0;
  room.winner = null;
  room.players.forEach((player) => {
    player.cards = room.deck.splice(0, 7);
    player.hasCalledUno = false;
    player.stats = {
      cardsPlayed: 0,
      plusFoursHit: 0,
      unosCalled: 0,
      penaltiesGiven: 0
    };
  });
  let initialCard = room.deck.pop();
  while (initialCard.value === "wild4") {
    room.deck.unshift(initialCard);
    room.deck = shuffleCards(room.deck);
    initialCard = room.deck.pop();
  }
  room.discardPile = [initialCard];
  room.currentValue = initialCard.value;
  room.currentColor = initialCard.color === "wild" ? "blue" : initialCard.color;
  room.lastActionMessage = `Match started! Top card is ${initialCard.color.toUpperCase()} ${initialCard.value.toUpperCase()}.`;
  if (initialCard.value === "reverse") {
    if (room.players.length === 2) {
      room.currentPlayerIndex = 1;
    } else {
      room.direction = -1;
      room.currentPlayerIndex = room.players.length - 1;
    }
  } else if (initialCard.value === "skip") {
    room.currentPlayerIndex = 1;
  } else if (initialCard.value === "draw2") {
    const penalized = room.players[0];
    penalized.cards.push(...room.deck.splice(0, 2));
    room.currentPlayerIndex = 1;
  }
  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}
function resetTurnTimer(room) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.status !== "playing") return;
  room.turnDeadline = Date.now() + 15e3;
  room.turnTimer = setTimeout(() => {
    applyTurnTimeout(room);
  }, 15e3);
}
function applyTurnTimeout(room) {
  if (room.status !== "playing") return;
  const currentP = room.players[room.currentPlayerIndex];
  if (!currentP) return;
  ensureDeckHasCards(room, 1);
  const drawn = room.deck.pop();
  if (drawn) {
    currentP.cards.push(drawn);
  }
  room.lastActionMessage = `\u23F1\uFE0F ${currentP.name} ran out of time! Auto-drew a penalty card.`;
  room.currentPlayerIndex = getNextPlayerIndex(room, 1);
  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}
function checkBotTurn(room) {
  if (room.status !== "playing") return;
  const curr = room.players[room.currentPlayerIndex];
  if (!curr || !curr.isBot) return;
  if (room.botTimeout) clearTimeout(room.botTimeout);
  room.botTimeout = setTimeout(() => {
    runBotAction(room, curr);
  }, 1200);
}
function runBotAction(room, bot) {
  if (room.status !== "playing") return;
  const topCard = room.discardPile[room.discardPile.length - 1];
  const playableCards = bot.cards.filter(
    (c) => canPlayCard(c, topCard, room.currentColor, bot.cards).valid
  );
  if (playableCards.length > 0) {
    const cardToPlay = playableCards[0];
    let chosenColor;
    if (cardToPlay.color === "wild") {
      const counts = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
      bot.cards.forEach((c) => {
        if (c.color !== "wild") counts[c.color]++;
      });
      const topCol = Object.keys(counts).filter((c) => c !== "wild").sort((a, b) => counts[b] - counts[a])[0];
      chosenColor = topCol || "red";
    }
    if (bot.cards.length === 2) {
      bot.hasCalledUno = true;
      broadcastToRoom(room, {
        type: "UNO_CALLED",
        playerId: bot.id,
        playerName: bot.name
      });
    }
    applyPlayCard(room, bot.id, cardToPlay.id, chosenColor);
  } else {
    applyDrawCard(room, bot.id);
  }
}
function applyPlayCard(room, playerId, cardId, chosenColor) {
  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1 || playerIdx !== room.currentPlayerIndex) return;
  const player = room.players[playerIdx];
  const cardIdx = player.cards.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return;
  const card = player.cards[cardIdx];
  const topCard = room.discardPile[room.discardPile.length - 1];
  const validation = canPlayCard(card, topCard, room.currentColor, player.cards);
  if (!validation.valid) return;
  if (!player.stats) {
    player.stats = { cardsPlayed: 0, plusFoursHit: 0, unosCalled: 0, penaltiesGiven: 0 };
  }
  player.stats.cardsPlayed++;
  if (card.value === "wild4") {
    player.stats.plusFoursHit++;
  }
  player.cards.splice(cardIdx, 1);
  if (card.color === "wild") {
    card.chosenColor = chosenColor || "blue";
    room.currentColor = card.chosenColor;
  } else {
    room.currentColor = card.color;
  }
  room.currentValue = card.value;
  room.discardPile.push(card);
  if (player.cards.length === 1 && !player.hasCalledUno) {
    player.hasCalledUno = true;
    player.stats.unosCalled++;
    broadcastToRoom(room, {
      type: "UNO_CALLED",
      playerId: player.id,
      playerName: player.name
    });
  }
  if (player.cards.length === 0) {
    room.status = "game_over";
    room.winner = player;
    room.lastActionMessage = `\u{1F389} ${player.name} won the match!`;
    if (room.turnTimer) clearTimeout(room.turnTimer);
    broadcastRoomState(room);
    return;
  }
  let nextIdxStep = 1;
  let actionLog = `${player.name} played ${card.color.toUpperCase()} ${card.value.toUpperCase()}.`;
  if (card.value === "reverse") {
    if (room.players.length === 2) {
      nextIdxStep = 2;
      actionLog = `${player.name} played Reverse (Acts as Skip in 2P)!`;
    } else {
      room.direction = room.direction * -1;
      nextIdxStep = 1;
      actionLog = `${player.name} reversed the turn direction!`;
    }
  } else if (card.value === "skip") {
    nextIdxStep = 2;
    const skippedPlayer = room.players[getNextPlayerIndex(room, 1)];
    actionLog = `${player.name} skipped ${skippedPlayer.name}!`;
  } else if (card.value === "draw2") {
    nextIdxStep = 2;
    const victim = room.players[getNextPlayerIndex(room, 1)];
    ensureDeckHasCards(room, 2);
    victim.cards.push(...room.deck.splice(0, 2));
    actionLog = `${player.name} hit ${victim.name} with Draw Two (+2)!`;
    player.stats.penaltiesGiven += 2;
  } else if (card.value === "wild4") {
    nextIdxStep = 2;
    const victim = room.players[getNextPlayerIndex(room, 1)];
    ensureDeckHasCards(room, 4);
    victim.cards.push(...room.deck.splice(0, 4));
    actionLog = `${player.name} changed color to ${room.currentColor.toUpperCase()} & hit ${victim.name} with +4!`;
    player.stats.penaltiesGiven += 4;
  } else if (card.value === "wild") {
    actionLog = `${player.name} played Wild and set color to ${room.currentColor.toUpperCase()}!`;
  }
  room.lastActionMessage = actionLog;
  room.currentPlayerIndex = getNextPlayerIndex(room, nextIdxStep);
  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}
function applyDrawCard(room, playerId) {
  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1 || playerIdx !== room.currentPlayerIndex) return;
  const player = room.players[playerIdx];
  ensureDeckHasCards(room, 1);
  const drawn = room.deck.pop();
  if (!drawn) return;
  player.cards.push(drawn);
  const topCard = room.discardPile[room.discardPile.length - 1];
  const canPlayDrawn = canPlayCard(drawn, topCard, room.currentColor, player.cards).valid;
  if (player.isBot && canPlayDrawn) {
    let chosenColor;
    if (drawn.color === "wild") chosenColor = "red";
    setTimeout(() => {
      applyPlayCard(room, player.id, drawn.id, chosenColor);
    }, 600);
    return;
  }
  room.lastActionMessage = `${player.name} drew a card.`;
  room.currentPlayerIndex = getNextPlayerIndex(room, 1);
  resetTurnTimer(room);
  broadcastRoomState(room);
  checkBotTurn(room);
}
function ensureDeckHasCards(room, count) {
  if (room.deck.length >= count) return;
  if (room.discardPile.length > 1) {
    const topCard = room.discardPile.pop();
    const cardsToRecycle = room.discardPile.splice(0, room.discardPile.length);
    cardsToRecycle.forEach((c) => {
      delete c.chosenColor;
    });
    room.deck.push(...shuffleCards(cardsToRecycle));
    room.discardPile = [topCard];
  }
}
wss.on("connection", (ws) => {
  let userRoomCode = null;
  let userId = null;
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "CREATE_ROOM") {
        const code = generateRoomCode();
        const player = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: msg.name || "Host",
          avatar: msg.avatar || "\u{1F60E}",
          cards: [],
          isHost: true,
          ws
        };
        const newRoom = {
          code,
          players: [player],
          hostId: player.id,
          status: "lobby",
          currentPlayerIndex: 0,
          direction: 1,
          deck: [],
          discardPile: [],
          currentColor: "red",
          currentValue: "0",
          winner: null,
          lastActionMessage: "Room created. Waiting for players to join.",
          turnDeadline: 0
        };
        rooms.set(code, newRoom);
        userRoomCode = code;
        userId = player.id;
        ws.send(JSON.stringify({ type: "ROOM_CREATED", roomCode: code, playerId: player.id }));
        broadcastRoomState(newRoom);
      } else if (msg.type === "JOIN_ROOM") {
        const code = (msg.roomCode || "").toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", message: `Room ${code} not found.` }));
          return;
        }
        if (room.status !== "lobby") {
          ws.send(JSON.stringify({ type: "ERROR", message: `Game already in progress.` }));
          return;
        }
        if (room.players.length >= 10) {
          ws.send(JSON.stringify({ type: "ERROR", message: `Room is full (max 10 players).` }));
          return;
        }
        const newPlayer = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: msg.name || `Player ${room.players.length + 1}`,
          avatar: msg.avatar || "\u{1F98A}",
          cards: [],
          isHost: false,
          ws
        };
        room.players.push(newPlayer);
        userRoomCode = code;
        userId = newPlayer.id;
        ws.send(JSON.stringify({ type: "JOINED_ROOM", roomCode: code, playerId: newPlayer.id }));
        broadcastRoomState(room);
      } else if (msg.type === "START_GAME") {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          startGame(room);
        }
      } else if (msg.type === "ADD_BOT") {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.players.length < 10) {
          const botIdx = room.players.length + 1;
          const botAvatars = ["\u{1F916}", "\u{1F47E}", "\u26A1", "\u{1F42F}", "\u{1F984}"];
          room.players.push({
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: `Bot ${botIdx}`,
            avatar: botAvatars[botIdx % botAvatars.length],
            cards: [],
            isBot: true
          });
          broadcastRoomState(room);
        }
      } else if (msg.type === "REMOVE_PLAYER") {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          room.players = room.players.filter((p) => p.id !== msg.playerId);
          broadcastRoomState(room);
        }
      } else if (msg.type === "PLAY_CARD") {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          applyPlayCard(room, userId, msg.cardId, msg.chosenColor);
        }
      } else if (msg.type === "DRAW_CARD") {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          applyDrawCard(room, userId);
        }
      } else if (msg.type === "CALL_UNO") {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const player = room.players.find((p) => p.id === userId);
          if (player) {
            player.hasCalledUno = true;
            if (player.stats) player.stats.unosCalled++;
            broadcastToRoom(room, {
              type: "UNO_CALLED",
              playerId: player.id,
              playerName: player.name
            });
          }
        }
      } else if (msg.type === "CHALLENGE_UNO") {
        if (!userRoomCode || !userId) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const challenger = room.players.find((p) => p.id === userId);
          const target = room.players.find((p) => p.id === msg.targetPlayerId);
          if (challenger && target && target.cards.length === 1 && !target.hasCalledUno) {
            ensureDeckHasCards(room, 2);
            target.cards.push(...room.deck.splice(0, 2));
            if (challenger.stats) challenger.stats.penaltiesGiven += 2;
            room.lastActionMessage = `\u{1F6A8} ${challenger.name} CAUGHT ${target.name} forgetting UNO! +2 Penalty cards!`;
            broadcastToRoom(room, {
              type: "UNO_CHALLENGE_SUCCESS",
              challengerName: challenger.name,
              targetName: target.name
            });
            broadcastRoomState(room);
          }
        }
      } else if (msg.type === "SEND_EMOJI") {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room) {
          const sender = room.players.find((p) => p.id === userId);
          const reaction = {
            id: `react_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            senderId: userId || "anon",
            senderName: sender?.name || "Player",
            emoji: msg.emoji,
            label: msg.label,
            timestamp: Date.now()
          };
          broadcastToRoom(room, {
            type: "EMOJI_REACTION",
            reaction
          });
        }
      } else if (msg.type === "RESTART_GAME") {
        if (!userRoomCode) return;
        const room = rooms.get(userRoomCode);
        if (room && room.hostId === userId) {
          startGame(room);
        }
      }
    } catch (err) {
      console.error("WebSocket message parsing error:", err);
    }
  });
  ws.on("close", () => {
    if (userRoomCode && userId) {
      const room = rooms.get(userRoomCode);
      if (room) {
        room.players = room.players.filter((p) => p.id !== userId);
        if (room.players.length === 0) {
          if (room.botTimeout) clearTimeout(room.botTimeout);
          rooms.delete(userRoomCode);
        } else {
          if (room.hostId === userId) {
            room.hostId = room.players[0].id;
          }
          broadcastRoomState(room);
        }
      }
    }
  });
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {}
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`UNO Game Server running on port ${PORT}`);
  });
}
startServer();
