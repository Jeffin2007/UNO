import React, { useState, useEffect, useRef } from 'react';
import { AvatarAura, Card, CardColor, EmojiReaction, GameState, Player, PlayDirection } from './types/uno';
import { calculateNextTurnIndex, canPlayCard, COLORS, createUnoDeck, shuffleCards } from './utils/deck';
import { sound } from './utils/audio';
import { ThreeGameTable } from './components/ThreeGameTable';
import { PlayerHand } from './components/PlayerHand';
import { ColorPickerModal } from './components/ColorPickerModal';
import { UnoAnnouncement } from './components/UnoAnnouncement';
import { ReactionPicker } from './components/ReactionPicker';
import { GameOverModal } from './components/GameOverModal';
import { LobbyScreen } from './components/LobbyScreen';
import { Volume2, VolumeX, Music, Volume1, ArrowLeft, RefreshCw } from 'lucide-react';

export default function App() {
  // Game Setup & Mode
  const [mode, setMode] = useState<'online' | 'local' | 'solo_ai'>('online');
  const [inGame, setInGame] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [myPlayerId, setMyPlayerId] = useState('p_local_1');
  const [isHost, setIsHost] = useState(true);

  // Core Game State
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [direction, setDirection] = useState<PlayDirection>(1);
  const directionRef = useRef<PlayDirection>(1);
  directionRef.current = direction;
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [drawPileCount, setDrawPileCount] = useState(0);
  const [localDeck, setLocalDeck] = useState<Card[]>([]);
  const [currentColor, setCurrentColor] = useState<CardColor>('red');
  const [currentValue, setCurrentValue] = useState<Card['value']>('0');
  const [lastActionMessage, setLastActionMessage] = useState('Welcome to 3D UNO Arena!');
  const [winner, setWinner] = useState<Player | null>(null);

  // Interaction State
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [unoAnnouncementPlayer, setUnoAnnouncementPlayer] = useState<string | null>(null);
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [localTurnHandover, setLocalTurnHandover] = useState<boolean>(false);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(15);
  const [canPassTurn, setCanPassTurn] = useState<boolean>(false);

  // Audio & Settings State
  const [isMuted, setIsMuted] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // WebSocket Ref for Online Multiplayer
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // ----------------------------------------------------
  // COMPETITIVE 15-SECOND TURN SHOT CLOCK
  // ----------------------------------------------------
  useEffect(() => {
    if (!inGame || winner) return;

    setTurnSecondsLeft(15);
    const interval = setInterval(() => {
      setTurnSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timeout occurred!
          if (mode !== 'online') {
            sound.playTimeoutBuzzer();
            const curr = players[currentPlayerIndex];
            if (curr) {
              executeLocalDrawCard(curr.id);
            }
          }
          return 15;
        }

        // Only tick during human player's turn to prevent annoying bot tick sounds
        if (prev <= 5 && prev > 1) {
          const curr = players[currentPlayerIndex];
          if (curr?.id === myPlayerId) {
            sound.playTick();
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inGame, currentPlayerIndex, winner, mode, myPlayerId]);

  // ----------------------------------------------------
  // ONLINE MULTIPLAYER (WEBSOCKET CLIENT)
  // ----------------------------------------------------
  const connectWebSocket = (): WebSocket => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return socketRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_CREATED') {
          setRoomCode(data.roomCode);
          setMyPlayerId(data.playerId);
          setIsHost(true);
        } else if (data.type === 'JOINED_ROOM') {
          setRoomCode(data.roomCode);
          setMyPlayerId(data.playerId);
          setIsHost(false);
        } else if (data.type === 'GAME_STATE_UPDATE') {
          const state = data.state;
          setRoomCode(state.roomCode);
          setPlayers(state.players);
          setCurrentPlayerIndex(state.currentPlayerIndex);
          setDirection(state.direction);
          setDrawPileCount(state.drawPileCount);
          setDiscardPile(state.discardPile);
          setCurrentColor(state.currentColor);
          setCurrentValue(state.currentValue);
          setLastActionMessage(state.lastActionMessage);
          setWinner(state.winner);

          if (state.status === 'playing') {
            setInGame(true);
          } else if (state.status === 'lobby') {
            setInGame(false);
          }
        } else if (data.type === 'UNO_CALLED') {
          setUnoAnnouncementPlayer(data.playerName);
        } else if (data.type === 'EMOJI_REACTION') {
          setReactions((prev) => [...prev, data.reaction]);
        } else if (data.type === 'ERROR') {
          alert(data.message);
        }
      } catch (e) {
        console.error('Error parsing ws msg', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    socketRef.current = ws;
    return ws;
  };

  const handleCreateOnlineRoom = (name: string, avatar: string, aura?: AvatarAura, title?: string) => {
    setMode('online');
    const ws = connectWebSocket();
    const send = () => {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM', name, avatar, aura, title }));
    };
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.onopen = () => {
        setIsConnected(true);
        send();
      };
    }
  };

  const handleJoinOnlineRoom = (code: string, name: string, avatar: string, aura?: AvatarAura, title?: string) => {
    setMode('online');
    const ws = connectWebSocket();
    const send = () => {
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode: code, name, avatar, aura, title }));
    };
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.onopen = () => {
        setIsConnected(true);
        send();
      };
    }
  };

  const handleOnlineStartGame = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'START_GAME' }));
    }
  };

  const handleOnlineAddBot = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ADD_BOT' }));
    }
  };

  const handleOnlineRemovePlayer = (id: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'REMOVE_PLAYER', playerId: id }));
    }
  };

  // ----------------------------------------------------
  // LOCAL MULTIPLAYER & SOLO AI ENGINE
  // ----------------------------------------------------
  const handleStartSoloAI = (name: string, avatar: string, botCount: number, aura?: AvatarAura, title?: string) => {
    setMode('solo_ai');
    setMyPlayerId('p_human');
    setIsHost(true);

    const botAvatars = ['🤖', '👾', '⚡', '🐯', '🦄', '🦊', '😎'];
    const botAuras: AvatarAura[] = ['neon', 'crimson', 'amethyst', 'emerald', 'obsidian', 'gold'];
    const botTitles = ['AI Prodigy', 'Card Calculator', 'Cyber Tactician', 'Speed Demon', 'Wild Card'];

    const pList: Player[] = [
      {
        id: 'p_human',
        name: name || 'Player',
        avatar: avatar || '😎',
        aura: aura || 'gold',
        title: title || 'UNO Grandmaster',
        cards: [],
        isHost: true,
      },
    ];
    for (let i = 1; i <= botCount; i++) {
      pList.push({
        id: `bot_${i}`,
        name: `Bot ${i}`,
        avatar: botAvatars[i % botAvatars.length],
        aura: botAuras[i % botAuras.length],
        title: botTitles[i % botTitles.length],
        cards: [],
        isBot: true,
      });
    }

    startLocalOrSoloMatch(pList, 'solo_ai');
  };

  const handleStartLocalGame = (localList: { name: string; avatar: string; aura?: AvatarAura; title?: string }[]) => {
    setMode('local');
    setMyPlayerId('local_turn'); // Dynamic in local
    setIsHost(true);

    const pList: Player[] = localList.map((p, idx) => ({
      id: `p_local_${idx}`,
      name: p.name,
      avatar: p.avatar,
      aura: p.aura || 'gold',
      title: p.title || 'Challenger',
      cards: [],
      isHost: idx === 0,
    }));

    startLocalOrSoloMatch(pList, 'local');
  };

  const startLocalOrSoloMatch = (playerList: Player[], currentMode: 'local' | 'solo_ai') => {
    // 1. High-entropy multi-pass CSPRNG shuffle of full 108-card deck
    const deck = shuffleCards(createUnoDeck());

    // 2. Deal 7 cards to each player
    playerList.forEach((player) => {
      player.cards = deck.splice(0, 7);
      player.hasCalledUno = false;
    });

    // 3. Fair random first player selection (Basic+ rule)
    const firstPlayerIdx = Math.floor(Math.random() * playerList.length);
    const firstPlayer = playerList[firstPlayerIdx];

    // 4. First player excavates the top card from Draw Pile before their turn (Basic+ rule)
    const initialCard = deck.pop()!;
    let startColor: CardColor = initialCard.color === 'wild' ? 'blue' : initialCard.color;
    let startIdx = firstPlayerIdx;
    let startDir: PlayDirection = 1;
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

    // Immediately resolve excavated card effect on first player (as if played by player on his right):
    if (initialCard.value === 'draw2') {
      // First player must draw 2 and loses their turn (Basic+ rule)
      firstPlayer.cards.push(...deck.splice(0, 2));
      startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, playerList.length, 1);
      startMsg = `Excavated Draw Two! ${firstPlayer.name} drew 2 cards and lost turn. ${playerList[startIdx].name} begins!`;
    } else if (initialCard.value === 'wild4') {
      // First player chooses color, draws 4 cards and loses turn (Basic+ rule)
      firstPlayer.cards.push(...deck.splice(0, 4));
      startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, playerList.length, 1);
      startMsg = `Excavated Wild Draw 4! Color set to ${startColor.toUpperCase()}. ${firstPlayer.name} drew 4 cards and lost turn. ${playerList[startIdx].name} begins!`;
    } else if (initialCard.value === 'skip') {
      // First player is skipped (Basic+ rule)
      startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, playerList.length, 1);
      startMsg = `Excavated Skip! ${firstPlayer.name} was skipped. ${playerList[startIdx].name} begins!`;
    } else if (initialCard.value === 'reverse') {
      if (playerList.length === 2) {
        // In 2 players, reverse acts as skip (Basic+ rule)
        startIdx = calculateNextTurnIndex(firstPlayerIdx, startDir, playerList.length, 1);
        startMsg = `Excavated Reverse (acts as Skip in 2P)! ${firstPlayer.name} skipped. ${playerList[startIdx].name} begins!`;
      } else {
        // Reverses direction to Counter-Clockwise (CCW = -1) (Basic+ rule)
        startDir = -1;
        startIdx = firstPlayerIdx;
        startMsg = `Excavated Reverse! Turn direction reversed to Counter-Clockwise ↺. ${firstPlayer.name} begins!`;
      }
    } else if (initialCard.value === 'wild') {
      startMsg = `Excavated Wild! Starting color set to ${startColor.toUpperCase()}. ${firstPlayer.name} begins!`;
    } else {
      startMsg = `Excavated ${initialCard.color.toUpperCase()} ${initialCard.value.toUpperCase()}. ${firstPlayer.name} begins (Clockwise ↻)!`;
    }

    directionRef.current = startDir;
    setPlayers(playerList);
    setLocalDeck(deck);
    setDrawPileCount(deck.length);
    setDiscardPile([initialCard]);
    setCurrentColor(startColor);
    setCurrentValue(initialCard.value);
    setCurrentPlayerIndex(startIdx);
    setDirection(startDir);
    setWinner(null);
    setCanPassTurn(false);
    setLastActionMessage(startMsg);
    setInGame(true);

    if (currentMode === 'local' && startIdx > 0) {
      setLocalTurnHandover(true);
    }
  };

  // Solo Bot Turn Loop
  useEffect(() => {
    if (mode !== 'solo_ai' || !inGame || winner) return;

    const currentP = players[currentPlayerIndex];
    if (!currentP || !currentP.isBot) return;

    const timer = setTimeout(() => {
      executeLocalBotMove(currentP);
    }, 800);

    return () => clearTimeout(timer);
  }, [mode, inGame, currentPlayerIndex, players, winner]);

  const executeLocalBotMove = (bot: Player) => {
    const topCard = discardPile[discardPile.length - 1];
    const playable = bot.cards.filter((c) => canPlayCard(c, topCard, currentColor, bot.cards).valid);

    if (playable.length > 0) {
      const cardToPlay = playable[0];
      let chosenColor: CardColor | undefined;
      if (cardToPlay.color === 'wild') {
        const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
        bot.cards.forEach((c) => {
          if (c.color !== 'wild') counts[c.color]++;
        });
        const topCol = (Object.keys(counts) as CardColor[])
          .filter((c) => c !== 'wild')
          .sort((a, b) => counts[b] - counts[a])[0];
        chosenColor = topCol || 'blue';
      }

      if (bot.cards.length === 2) {
        bot.hasCalledUno = true;
        setUnoAnnouncementPlayer(bot.name);
      }

      executeLocalPlayCard(bot.id, cardToPlay, chosenColor);
    } else {
      executeLocalDrawCard(bot.id);
    }
  };

  const executeLocalPlayCard = (playerId: string, card: Card, chosenColor?: CardColor) => {
    const pIdx = players.findIndex((p) => p.id === playerId);
    if (pIdx === -1 || pIdx !== currentPlayerIndex) return;

    setCanPassTurn(false);
    const updatedPlayers = [...players];
    const player = updatedPlayers[pIdx];
    const cardIdx = player.cards.findIndex((c) => c.id === card.id);
    if (cardIdx === -1) return;

    sound.playCardSnap();
    player.cards.splice(cardIdx, 1);

    const playedCard = { ...card };
    let nextColor = currentColor;
    if (playedCard.color === 'wild') {
      playedCard.chosenColor = chosenColor || 'blue';
      nextColor = playedCard.chosenColor;
    } else {
      nextColor = playedCard.color;
    }

    const updatedDiscard = [...discardPile, playedCard];
    setDiscardPile(updatedDiscard);
    setCurrentColor(nextColor);
    setCurrentValue(playedCard.value);

    // Audio by card type
    if (playedCard.value === 'reverse') sound.playReverse();
    else if (playedCard.value === 'skip') sound.playSkip();
    else if (playedCard.value === 'draw2') sound.playDrawTwo();
    else if (playedCard.value === 'wild4') sound.playDrawFour();
    else if (playedCard.value === 'wild') sound.playWild();

    // UNO Check
    if (player.cards.length === 1 && !player.hasCalledUno) {
      player.hasCalledUno = true;
      setUnoAnnouncementPlayer(player.name);
    }

    // Win Check
    if (player.cards.length === 0) {
      setWinner(player);
      setLastActionMessage(`🎉 ${player.name} won the match!`);
      return;
    }

    // Next player & Direction calculation (Basic+ Rules)
    const currentDir = directionRef.current;
    let nextDirection = currentDir;
    let nextPlayerIdx = currentPlayerIndex;
    let msg = `${player.name} played ${playedCard.color.toUpperCase()} ${playedCard.value.toUpperCase()}.`;

    if (playedCard.value === 'reverse') {
      if (players.length === 2) {
        // In 2 players, Reverse acts as a Skip (current player goes again)
        nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 2);
        msg = `${player.name} played Reverse (Acts as Skip in 2P)!`;
      } else {
        // Reverse turn direction (CCW to CW or vice-versa)
        nextDirection = (currentDir * -1) as PlayDirection;
        directionRef.current = nextDirection;
        setDirection(nextDirection);
        nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, nextDirection, players.length, 1);
        msg = `${player.name} reversed turn direction to ${nextDirection === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}!`;
      }
    } else if (playedCard.value === 'skip') {
      const skippedIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
      nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 2);
      msg = `${player.name} skipped ${players[skippedIdx].name}!`;
    } else if (playedCard.value === 'draw2') {
      const victimIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
      drawCardsToPlayerLocally(victimIdx, 2);
      nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 2);
      msg = `${player.name} hit ${players[victimIdx].name} with Draw Two (+2) & skipped their turn!`;
    } else if (playedCard.value === 'wild4') {
      const victimIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
      drawCardsToPlayerLocally(victimIdx, 4);
      nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 2);
      msg = `${player.name} set color to ${nextColor.toUpperCase()} & hit ${players[victimIdx].name} with +4 (turn skipped)!`;
    } else {
      nextPlayerIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
    }

    setPlayers(updatedPlayers);
    setCurrentPlayerIndex(nextPlayerIdx);
    setLastActionMessage(msg);

    if (mode === 'local') {
      setLocalTurnHandover(true);
    }
  };

  const drawCardsToPlayerLocally = (targetIdx: number, count: number) => {
    setLocalDeck((prevDeck) => {
      let deck = [...prevDeck];
      if (deck.length < count) {
        // Reshuffle discard pile (excluding the active top card)
        const top = discardPile[discardPile.length - 1];
        const rest = discardPile.slice(0, -1);
        deck = [...deck, ...shuffleCards(rest)];
        setDiscardPile([top]);
      }
      const drawn = deck.splice(0, count);
      setPlayers((prevP) => {
        const copy = [...prevP];
        copy[targetIdx].cards.push(...drawn);
        return copy;
      });
      setDrawPileCount(deck.length);
      return deck;
    });
  };

  const executeLocalDrawCard = (playerId: string) => {
    const pIdx = players.findIndex((p) => p.id === playerId);
    if (pIdx === -1 || pIdx !== currentPlayerIndex) return;

    sound.playDraw();

    setLocalDeck((prevDeck) => {
      let deck = [...prevDeck];
      if (deck.length === 0) {
        const top = discardPile[discardPile.length - 1];
        const rest = discardPile.slice(0, -1);
        deck = shuffleCards(rest);
        setDiscardPile([top]);
      }

      const drawn = deck.pop();
      if (!drawn) return deck;

      const updatedPlayers = [...players];
      updatedPlayers[pIdx].cards.push(drawn);
      setPlayers(updatedPlayers);
      setDrawPileCount(deck.length);

      // Basic+ Rules: "You can either Discard one or Draw one, and not both. Doing both or passing is not an option."
      // Drawing immediately finishes the turn and moves to the next player!
      const currentDir = directionRef.current;
      const nextIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
      setCurrentPlayerIndex(nextIdx);
      setCanPassTurn(false);
      setLastActionMessage(`${updatedPlayers[pIdx].name} drew a card. Turn passed.`);

      if (mode === 'local') {
        setLocalTurnHandover(true);
      }

      return deck;
    });
  };

  const handlePassTurn = () => {
    setCanPassTurn(false);
    const currentDir = directionRef.current;
    const nextIdx = calculateNextTurnIndex(currentPlayerIndex, currentDir, players.length, 1);
    setCurrentPlayerIndex(nextIdx);
    setLastActionMessage(`${players[currentPlayerIndex]?.name || 'Player'} passed turn.`);
    if (mode === 'local') {
      setLocalTurnHandover(true);
    }
  };

  // ----------------------------------------------------
  // PLAYER ACTIONS (UI WRAPPERS)
  // ----------------------------------------------------
  const handlePlayCardAttempt = (card: Card) => {
    if (card.color === 'wild') {
      setPendingWildCard(card);
    } else {
      if (mode === 'online') {
        socketRef.current?.send(JSON.stringify({ type: 'PLAY_CARD', cardId: card.id }));
      } else {
        const activePlayer = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
        if (activePlayer) {
          executeLocalPlayCard(activePlayer.id, card);
        }
      }
    }
  };

  const handleSelectWildColor = (selectedColor: CardColor) => {
    if (!pendingWildCard) return;
    const card = pendingWildCard;
    setPendingWildCard(null);

    if (mode === 'online') {
      socketRef.current?.send(
        JSON.stringify({ type: 'PLAY_CARD', cardId: card.id, chosenColor: selectedColor })
      );
    } else {
      const activePlayer = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
      if (activePlayer) {
        executeLocalPlayCard(activePlayer.id, card, selectedColor);
      }
    }
  };

  const handleDrawCard = () => {
    if (mode === 'online') {
      socketRef.current?.send(JSON.stringify({ type: 'DRAW_CARD' }));
    } else {
      const activePlayer = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
      if (activePlayer) {
        executeLocalDrawCard(activePlayer.id);
      }
    }
  };

  const handleCallUno = () => {
    if (mode === 'online') {
      socketRef.current?.send(JSON.stringify({ type: 'CALL_UNO' }));
    } else {
      const activePlayer = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
      if (!activePlayer) return;

      const pIdx = players.findIndex((p) => p.id === activePlayer.id);

      if (activePlayer.cards.length === 1) {
        // Valid UNO declaration
        activePlayer.hasCalledUno = true;
        sound.playUnoCall();
        setUnoAnnouncementPlayer(activePlayer.name);
        setLastActionMessage(`🔥 ${activePlayer.name} declared UNO!`);
      } else {
        // Basic+ Rule: "If a player Uno's incorrectly, he draws 3 cards."
        if (pIdx !== -1) {
          drawCardsToPlayerLocally(pIdx, 3);
          sound.playChallengeSuccess();
          setLastActionMessage(`⚠️ False UNO call! ${activePlayer.name} has ${activePlayer.cards.length} cards. +3 penalty cards.`);
        }
      }
    }
  };

  const handleChallengeUno = (targetPlayerId: string) => {
    if (mode === 'online') {
      socketRef.current?.send(JSON.stringify({ type: 'CHALLENGE_UNO', targetPlayerId }));
    } else {
      const challenger = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
      const targetIdx = players.findIndex((p) => p.id === targetPlayerId);
      if (!challenger || targetIdx === -1) return;

      const target = players[targetIdx];
      if (target.cards.length === 1 && !target.hasCalledUno) {
        // Basic+ Rule: "If someone notices a player hasn't Uno'ed, and he still has one card, he draws 3 cards."
        drawCardsToPlayerLocally(targetIdx, 3);
        sound.playChallengeSuccess();
        setLastActionMessage(`🚨 ${challenger.name} caught ${target.name} forgetting UNO! +3 Penalty cards!`);
      } else {
        // Basic+ Rule: "If someone calls a player out inappropriately, they draw 3 cards instead."
        const challengerIdx = players.findIndex((p) => p.id === challenger.id);
        if (challengerIdx !== -1) {
          drawCardsToPlayerLocally(challengerIdx, 3);
          sound.playChallengeSuccess();
          setLastActionMessage(`⚠️ Inappropriate accusation! ${challenger.name} falsely called out ${target.name} and draws 3 penalty cards.`);
        }
      }
    }
  };

  const handleSendReaction = (emoji: string, label: string) => {
    const activePlayer = mode === 'local' ? players[currentPlayerIndex] : players.find((p) => p.id === myPlayerId);
    if (mode === 'online') {
      socketRef.current?.send(JSON.stringify({ type: 'SEND_EMOJI', emoji, label }));
    } else {
      const react: EmojiReaction = {
        id: `react_${Date.now()}`,
        senderId: activePlayer?.id || 'p_local',
        senderName: activePlayer?.name || 'Player',
        emoji,
        label,
        timestamp: Date.now(),
      };
      setReactions((prev) => [...prev, react]);
    }
  };

  const handlePlayAgain = () => {
    if (mode === 'online') {
      socketRef.current?.send(JSON.stringify({ type: 'RESTART_GAME' }));
    } else {
      startLocalOrSoloMatch(players, mode);
    }
  };

  const handleReturnToLobby = () => {
    setInGame(false);
    setWinner(null);
  };

  // Audio Toggles
  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const toggleBGM = () => {
    const playing = sound.toggleBGM();
    setIsBgmPlaying(playing);
  };

  // Current Player identification
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn =
    mode === 'local'
      ? true // in local pass and play, whoever is active controls the hand
      : currentPlayer?.id === myPlayerId;

  // Active cards to render in the player's bottom hand
  const activeHandCards =
    mode === 'local'
      ? currentPlayer?.cards || []
      : players.find((p) => p.id === myPlayerId)?.cards || [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Outfit',sans-serif] flex flex-col">
      {!inGame ? (
        /* LOBBY & GAME SETUP SCREEN */
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          isHost={isHost}
          myPlayerId={myPlayerId}
          mode={mode}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onJoinOnlineRoom={handleJoinOnlineRoom}
          onStartSoloAI={handleStartSoloAI}
          onStartLocalGame={handleStartLocalGame}
          onStartGame={handleOnlineStartGame}
          onAddBot={handleOnlineAddBot}
          onRemovePlayer={handleOnlineRemovePlayer}
          isConnected={isConnected}
        />
      ) : (
        /* ACTIVE 3D GAME ARENA */
        <div className="relative w-full h-full overflow-hidden select-none">
          {/* 3D Canvas Game Table (Full Screen Background) */}
          <div className="absolute inset-0 z-0">
            <ThreeGameTable
              discardPile={discardPile}
              currentColor={currentColor}
              direction={direction}
              drawPileCount={drawPileCount}
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              myPlayerId={mode === 'local' ? currentPlayer?.id || '' : myPlayerId}
              reactions={reactions}
              onDrawCard={handleDrawCard}
              onCallUno={handleCallUno}
              onChallengeUno={handleChallengeUno}
              onPassTurn={handlePassTurn}
              canPass={canPassTurn && isMyTurn}
              isMyTurn={isMyTurn}
              canDraw={true}
            />
          </div>

          {/* Top Navigation & Status Bar */}
          <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 bg-[#070b12]/90 border-b border-white/10 backdrop-blur-md pointer-events-auto gap-1 sm:gap-3">
            {/* Zone 1: Brand Wordmark & Mode Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={handleReturnToLobby}
                className="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Return to Arena Lobby"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-['Cinzel',serif] font-bold tracking-tight text-amber-100 text-xs sm:text-sm hidden xs:inline">
                  UNO ARENA
                </span>
                <span className="text-slate-600 hidden xs:inline" aria-hidden="true">·</span>
                <span className="font-mono text-[11px] sm:text-xs text-amber-400 font-semibold truncate max-w-[75px] sm:max-w-none">
                  {mode === 'online' ? `ROOM ${roomCode}` : mode === 'solo_ai' ? 'SOLO AI' : 'LOCAL'}
                </span>
              </div>
            </div>

            {/* Zone 2: Active Turn & Shot Clock */}
            <div className="flex items-center gap-2 sm:gap-3 bg-[#0d1422] border border-white/10 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-lg shrink-0">
              {/* Active Player Avatar with Aura */}
              <div
                className={`relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-black/40 text-xs sm:text-sm border shrink-0 ${
                  currentPlayer?.aura === 'gold'
                    ? 'border-amber-400'
                    : currentPlayer?.aura === 'neon'
                    ? 'border-slate-300'
                    : currentPlayer?.aura === 'crimson'
                    ? 'border-rose-500'
                    : 'border-white/20'
                }`}
              >
                <span>{currentPlayer?.avatar}</span>
                {isMyTurn && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </div>

              {/* Turn Name & Role */}
              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-white max-w-[70px] sm:max-w-none truncate">
                    {isMyTurn ? (
                      <span className="text-amber-400 font-bold">YOUR TURN</span>
                    ) : (
                      <span>{currentPlayer?.name}</span>
                    )}
                  </span>
                  {currentPlayer?.title && (
                    <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 hidden md:inline">
                      [{currentPlayer.title.split(' ')[0]}]
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono hidden xs:inline">
                  {isMyTurn ? 'Play card or draw' : 'Awaiting move...'}
                </span>
              </div>

              {/* Radial Circular SVG Shot Clock */}
              <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 ml-0.5 sm:ml-1 shrink-0">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Active Draining Progress */}
                  <path
                    className={`transition-all duration-1000 ${
                      turnSecondsLeft <= 5
                        ? 'text-rose-500 stroke-rose-500'
                        : turnSecondsLeft <= 8
                        ? 'text-amber-400 stroke-amber-400'
                        : 'text-emerald-400 stroke-emerald-400'
                    }`}
                    strokeDasharray="100, 100"
                    strokeDashoffset={`${100 - (turnSecondsLeft / 15) * 100}`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span
                  className={`absolute font-mono font-bold text-[10px] sm:text-xs tabular-nums ${
                    turnSecondsLeft <= 5 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {turnSecondsLeft}
                </span>
              </div>
            </div>

            {/* Zone 3: Audio & Reaction Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <ReactionPicker onSendReaction={handleSendReaction} />

              <button
                onClick={toggleBGM}
                className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
                  isBgmPlaying
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Toggle Background Music"
              >
                <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={toggleMute}
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Toggle Sound Effects"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
              </button>
            </div>
          </header>

          {/* Turn Action Toast (Floating neatly beneath top nav) */}
          <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 pointer-events-none z-20 w-max max-w-[92vw] transition-all">
            <div className="bg-black/70 border border-white/15 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full shadow-2xl backdrop-blur-md">
              <p className="text-[10px] sm:text-xs font-semibold text-amber-200 tracking-wide text-center truncate">
                {lastActionMessage}
              </p>
            </div>
          </div>

          {/* Interactive Player Hand pinned to bottom */}
          <footer className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none pb-2">
            <PlayerHand
              cards={activeHandCards}
              topDiscardCard={discardPile[discardPile.length - 1] || { id: '0', color: 'red', value: '0' }}
              currentColor={currentColor}
              isMyTurn={isMyTurn}
              onPlayCard={handlePlayCardAttempt}
              onCallUno={handleCallUno}
              hasCalledUno={currentPlayer?.hasCalledUno}
            />
          </footer>

          {/* Pass-and-Play Handover Screen (Card Privacy for Local mode) */}
          {mode === 'local' && localTurnHandover && !winner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
              <div className="max-w-xs w-full bg-[#0d1422] border border-white/10 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center">
                <span className="text-4xl mb-2">{currentPlayer?.avatar}</span>
                <h3 className="font-['Cinzel',serif] text-xl font-bold text-white">
                  Pass to {currentPlayer?.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Keep cards hidden from opponents. Tap when ready to reveal your hand.
                </p>
                <button
                  onClick={() => {
                    sound.playTurnChime();
                    setLocalTurnHandover(false);
                  }}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reveal Cards
                </button>
              </div>
            </div>
          )}

          {/* Wild / Wild +4 Color Picker Modal */}
          <ColorPickerModal
            isOpen={!!pendingWildCard}
            isDrawFour={pendingWildCard?.value === 'wild4'}
            onSelectColor={handleSelectWildColor}
          />

          {/* UNO Celebratory Announcement */}
          {unoAnnouncementPlayer && (
            <UnoAnnouncement
              playerName={unoAnnouncementPlayer}
              onDismiss={() => setUnoAnnouncementPlayer(null)}
            />
          )}

          {/* Game Over Screen */}
          {winner && (
            <GameOverModal
              winner={winner}
              players={players}
              myPlayerId={mode === 'local' ? winner.id : myPlayerId}
              onPlayAgain={handlePlayAgain}
              onReturnToLobby={handleReturnToLobby}
            />
          )}
        </div>
      )}
    </div>
  );
}
