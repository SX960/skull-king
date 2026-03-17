'use strict';
const express  = require('express');
const { WebSocketServer } = require('ws');
const http     = require('http');
const { networkInterfaces } = require('os');

const PORT = 3000;
const app  = express();
app.use(express.static(__dirname));
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ─── Game logic (ported from deck.js / logic.js) ─────────────────────────────
const SUITS     = ['yellow', 'purple', 'green', 'black'];
const SUIT_EMOJI = { yellow:'☀️', purple:'🌊', green:'🌿', black:'⚓' };

function buildDeck() {
  const cards = []; let id = 0;
  SUITS.forEach(suit => {
    for (let v = 1; v <= 14; v++)
      cards.push({ id: id++, type:'number', suit, value:v, display:String(v), emoji:SUIT_EMOJI[suit] });
  });
  for (let i = 0; i < 5; i++) cards.push({ id:id++, type:'escape',     display:'Escape',     emoji:'🏳️' });
  for (let i = 0; i < 5; i++) cards.push({ id:id++, type:'pirate',     display:'Pirate',     emoji:'☠️' });
  for (let i = 0; i < 2; i++) cards.push({ id:id++, type:'mermaid',    display:'Mermaid',    emoji:'🧜' });
  cards.push(                              { id:id++, type:'skull_king',display:'Skull King', emoji:'💀' });
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function determineTrickWinner(plays, leadSuit) {
  const nonEscapes = plays.filter(p => p.card.type !== 'escape');
  if (!nonEscapes.length) return plays.find(p => p.playOrder === 0).playerId;

  const sk       = plays.find(p => p.card.type === 'skull_king');
  const mermaids = plays.filter(p => p.card.type === 'mermaid').sort((a,b) => a.playOrder - b.playOrder);
  const pirates  = plays.filter(p => p.card.type === 'pirate' ).sort((a,b) => a.playOrder - b.playOrder);

  if (sk) {
    if (pirates.length && mermaids.length) return pirates[0].playerId;
    if (mermaids.length) return mermaids[0].playerId;
    return sk.playerId;
  }
  if (pirates.length)  return pirates[0].playerId;
  if (mermaids.length) return mermaids[0].playerId;

  const blacks = plays.filter(p => p.card.type === 'number' && p.card.suit === 'black');
  if (blacks.length) return blacks.reduce((b,p) => p.card.value > b.card.value ? p : b).playerId;

  if (leadSuit) {
    const leads = plays.filter(p => p.card.type === 'number' && p.card.suit === leadSuit);
    if (leads.length) return leads.reduce((b,p) => p.card.value > b.card.value ? p : b).playerId;
  }
  return plays.find(p => p.playOrder === 0).playerId;
}

function accumulateBonuses(plays, winnerId) {
  const wp = plays.find(p => p.playerId === winnerId);
  if (!wp) return 0;
  const wc = wp.card; let bonus = 0;
  if (wc.type === 'skull_king') bonus += 30 * plays.filter(p => p.card.type === 'pirate').length;
  if (wc.type === 'pirate')     bonus += 20 * plays.filter(p => p.card.type === 'mermaid').length;
  if (wc.type === 'mermaid' && plays.some(p => p.card.type === 'skull_king')) bonus += 40;
  return bonus;
}

function calculateRoundScore(bid, tricks, bonus, round) {
  if (bid === 0) return tricks === 0 ? 10 * round : -10 * round;
  return tricks === bid ? 20 * bid + bonus : -10 * Math.abs(bid - tricks);
}

function isLegalPlay(hand, card, leadSuit) {
  if (!leadSuit || card.type !== 'number') return true;
  if (card.suit === leadSuit) return true;
  return !hand.some(c => c.type === 'number' && c.suit === leadSuit);
}

// ─── Game state ───────────────────────────────────────────────────────────────
let G = freshGame();
function freshGame() {
  return {
    phase: 'LOBBY',          // LOBBY | BID | PLAY | TRICK_RESULT | SCORE | FINAL
    players: [],             // { uid, name, isHost, hand, bid, tricksWon, bonusPoints, scores[], ws, connected }
    round: 1,
    totalRounds: 10,
    currentTrick: { leadSuit: null, plays: [] },
    trickNumber: 1,
    activePlayerIndex: 0,
    leadPlayerIndex: 0,
    roundStartIndex: 0,
    trickResult: null,       // { winnerName, bonus, plays[] }
  };
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
wss.on('connection', ws => {
  ws.uid   = null;
  ws.alive = true;
  ws.on('pong', () => ws.alive = true);

  ws.on('message', raw => {
    try { handle(ws, JSON.parse(raw)); } catch(e) { console.error(e); }
  });

  ws.on('close', () => {
    const p = G.players.find(p => p.uid === ws.uid);
    if (!p) return;
    p.connected = false;
    if (G.phase === 'LOBBY') G.players = G.players.filter(p => p.uid !== ws.uid);
    // If it was their turn during PLAY, auto-skip could go here — for now just mark disconnected
    broadcast();
  });

  // Send lobby state immediately so client sees the join screen
  sendTo(ws);
});

// Heartbeat
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.alive) return ws.terminate();
    ws.alive = false; ws.ping();
  });
}, 30000);

// ─── Handlers ─────────────────────────────────────────────────────────────────
function handle(ws, msg) {
  switch (msg.type) {
    case 'JOIN':       onJoin(ws, msg);      break;
    case 'REJOIN':     onRejoin(ws, msg);    break;
    case 'SET_ROUNDS': onSetRounds(ws, msg); break;
    case 'START':      onStart(ws);          break;
    case 'BID':        onBid(ws, msg);       break;
    case 'PLAY':       onPlay(ws, msg);      break;
    case 'NEXT_ROUND': onNextRound(ws);      break;
  }
}

function onJoin(ws, msg) {
  if (G.phase !== 'LOBBY') return err(ws, 'Game already in progress.');
  if (G.players.length >= 6) return err(ws, 'Game is full (max 6 players).');
  const uid  = String(msg.uid || ws.uid || Math.random().toString(36).slice(2));
  const name = String(msg.name || '').trim().slice(0, 14) || `Player ${G.players.length + 1}`;

  // Prevent duplicate join
  if (G.players.find(p => p.uid === uid)) return;

  ws.uid = uid;
  const isHost = G.players.length === 0;
  G.players.push({ uid, name, isHost, hand:[], bid:null, tricksWon:0, bonusPoints:0, scores:[], ws, connected:true });
  broadcast();
}

function onRejoin(ws, msg) {
  const uid = String(msg.uid || '');
  const p   = G.players.find(p => p.uid === uid);
  if (p) {
    ws.uid      = uid;
    p.ws        = ws;
    p.connected = true;
    broadcast();
  } else {
    sendTo(ws); // show join screen
  }
}

function onSetRounds(ws, msg) {
  const p = G.players.find(p => p.uid === ws.uid);
  if (!p?.isHost || G.phase !== 'LOBBY') return;
  G.totalRounds = Math.max(1, Math.min(10, parseInt(msg.rounds) || 10));
  broadcast();
}

function onStart(ws) {
  const p = G.players.find(p => p.uid === ws.uid);
  if (!p?.isHost || G.phase !== 'LOBBY' || G.players.length < 2) return;
  G.round = 1;
  startRound();
}

function startRound() {
  const deck = shuffle(buildDeck());
  const n = G.round;
  G.players.forEach((p, i) => {
    p.hand        = deck.slice(i * n, (i + 1) * n);
    p.bid         = null;
    p.tricksWon   = 0;
    p.bonusPoints = 0;
  });
  G.phase             = 'BID';
  G.currentTrick      = { leadSuit: null, plays: [] };
  G.trickNumber       = 1;
  G.leadPlayerIndex   = G.roundStartIndex % G.players.length;
  G.activePlayerIndex = G.leadPlayerIndex;
  G.trickResult       = null;
  broadcast();
}

function onBid(ws, msg) {
  if (G.phase !== 'BID') return;
  const pi = G.players.findIndex(p => p.uid === ws.uid);
  if (pi === -1 || G.players[pi].bid !== null) return;
  G.players[pi].bid = Math.max(0, Math.min(G.round, parseInt(msg.bid) ?? 0));
  if (G.players.every(p => p.bid !== null)) {
    G.phase             = 'PLAY';
    G.activePlayerIndex = G.leadPlayerIndex;
  }
  broadcast();
}

function onPlay(ws, msg) {
  if (G.phase !== 'PLAY') return;
  const pi = G.players.findIndex(p => p.uid === ws.uid);
  if (pi === -1 || pi !== G.activePlayerIndex) return;

  const player  = G.players[pi];
  const cardIdx = player.hand.findIndex(c => c.id === msg.cardId);
  if (cardIdx === -1) return;
  const card = player.hand[cardIdx];

  if (!isLegalPlay(player.hand, card, G.currentTrick.leadSuit)) return err(ws, 'Illegal play — you must follow suit.');

  player.hand.splice(cardIdx, 1);
  if (!G.currentTrick.leadSuit && card.type === 'number') G.currentTrick.leadSuit = card.suit;

  G.currentTrick.plays.push({ playerId: ws.uid, playerIndex: pi, playerName: player.name, card, playOrder: G.currentTrick.plays.length });

  if (G.currentTrick.plays.length === G.players.length) {
    resolveTrick();
  } else {
    G.activePlayerIndex = (G.activePlayerIndex + 1) % G.players.length;
    broadcast();
  }
}

function resolveTrick() {
  const plays    = G.currentTrick.plays;
  const leadSuit = G.currentTrick.leadSuit;
  const winnerId = determineTrickWinner(plays, leadSuit);
  const bonus    = accumulateBonuses(plays, winnerId);
  const winnerPi = G.players.findIndex(p => p.uid === winnerId);

  G.players[winnerPi].tricksWon++;
  G.players[winnerPi].bonusPoints += bonus;
  G.trickResult = { winnerName: G.players[winnerPi].name, bonus, plays: [...plays] };
  G.phase = 'TRICK_RESULT';
  broadcast();

  setTimeout(() => {
    if (G.phase !== 'TRICK_RESULT') return;
    if (G.players[0].hand.length === 0) {
      endRound();
    } else {
      G.leadPlayerIndex   = winnerPi;
      G.activePlayerIndex = winnerPi;
      G.currentTrick      = { leadSuit: null, plays: [] };
      G.trickNumber++;
      G.trickResult = null;
      G.phase = 'PLAY';
      broadcast();
    }
  }, 2500);
}

function endRound() {
  G.players.forEach(p => {
    p.scores.push(calculateRoundScore(p.bid, p.tricksWon, p.bonusPoints, G.round));
  });
  G.phase = 'SCORE';
  G.trickResult = null;
  broadcast();
}

function onNextRound(ws) {
  const p = G.players.find(p => p.uid === ws.uid);
  if (!p?.isHost || G.phase !== 'SCORE') return;
  if (G.round >= G.totalRounds) { G.phase = 'FINAL'; broadcast(); }
  else {
    G.round++;
    G.roundStartIndex = (G.roundStartIndex + 1) % G.players.length;
    startRound();
  }
}

// ─── Broadcast / view ─────────────────────────────────────────────────────────
function err(ws, msg) { try { ws.send(JSON.stringify({ type:'ERROR', msg })); } catch(e) {} }

function sendTo(ws) {
  const pi = G.players.findIndex(p => p.uid === ws.uid);
  try { ws.send(JSON.stringify({ type:'STATE', state: buildView(pi) })); } catch(e) {}
}

function broadcast() {
  // Joined players
  G.players.forEach((p, pi) => {
    if (p.ws?.readyState === 1) try { p.ws.send(JSON.stringify({ type:'STATE', state: buildView(pi) })); } catch(e) {}
  });
  // Unjoined spectators/newcomers
  wss.clients.forEach(ws => {
    if (ws.readyState === 1 && !G.players.find(p => p.uid === ws.uid)) sendTo(ws);
  });
}

function buildView(myIndex) {
  const bidsRevealed = G.phase !== 'BID';
  return {
    phase: G.phase,
    round: G.round,
    totalRounds: G.totalRounds,
    myIndex,
    activePlayerIndex: G.activePlayerIndex,
    leadPlayerIndex:   G.leadPlayerIndex,
    trickNumber:       G.trickNumber,
    currentTrick:      G.currentTrick,
    trickResult:       G.trickResult,
    players: G.players.map((p, i) => ({
      name:       p.name,
      isHost:     p.isHost,
      connected:  p.connected,
      bid:        bidsRevealed ? p.bid : (p.bid !== null ? true : null), // hide value during bidding
      tricksWon:  p.tricksWon,
      bonusPoints:p.bonusPoints,
      scores:     p.scores,
      handCount:  p.hand.length,
      hand:       i === myIndex ? p.hand : [],
    })),
  };
}

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n☠  Skull King — Multiplayer Server\n');
  console.log(`  Local:   http://localhost:${PORT}/skulking_multi.html`);
  Object.values(networkInterfaces()).flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .forEach(n => console.log(`  Network: http://${n.address}:${PORT}/skulking_multi.html`));
  console.log('\n  Share the Network URL with friends on the same WiFi.\n');
});
