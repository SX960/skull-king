// ============================================================
// SKULL KING — Complete Browser Implementation
// ============================================================

const SUITS = ['yellow', 'purple', 'green', 'black'];
const SUIT_LABEL = { yellow: 'Yellow', purple: 'Purple', green: 'Green', black: 'Black' };
const SUIT_EMOJI = { yellow: '☀️', purple: '🌊', green: '🌿', black: '⚓' };

// ---- STATE ----
let STATE = defaultState();

function defaultState() {
  return {
    phase: 'SETUP',
    round: 1,
    players: [],
    currentTrick: { leadSuit: null, plays: [] },
    completedTricks: [],
    trickNumber: 1,
    activePlayerIndex: 0,
    leadPlayerIndex: 0,
    roundLeaderIndex: 0,
    bidCursor: 0,
    revealHand: false,
    showTrickResult: false,
    lastTrickWinner: null,
    lastTrickBonus: 0,
    lastTrickPlays: []
  };
}

// ---- DECK ----
function buildDeck() {
  const cards = [];
  let id = 0;
  SUITS.forEach(suit => {
    for (let v = 1; v <= 14; v++) {
      cards.push({ id: id++, type: 'number', suit, value: v,
        display: String(v), emoji: SUIT_EMOJI[suit] });
    }
  });
  for (let i = 0; i < 5; i++)
    cards.push({ id: id++, type: 'escape', suit: null, value: null, display: 'Escape', emoji: '🏳️' });
  for (let i = 0; i < 5; i++)
    cards.push({ id: id++, type: 'pirate', suit: null, value: null, display: 'Pirate', emoji: '☠️' });
  for (let i = 0; i < 2; i++)
    cards.push({ id: id++, type: 'mermaid', suit: null, value: null, display: 'Mermaid', emoji: '🧜' });
  cards.push({ id: id++, type: 'skull_king', suit: null, value: null, display: 'Skull King', emoji: '💀' });
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

function dealCards() {
  const deck = shuffle(buildDeck());
  const n = STATE.round;
  STATE.players.forEach((p, i) => {
    p.hand = deck.slice(i * n, (i + 1) * n);
    p.bid = null;
    p.tricksWon = 0;
    p.bonusPoints = 0;
  });
}
