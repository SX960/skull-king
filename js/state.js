// ---- TRANSITIONS ----
function initGame(playerNames) {
  STATE.players = playerNames.map((name, i) => ({
    id: i, name,
    hand: [], bid: null, tricksWon: 0, bonusPoints: 0,
    totalScore: 0, roundScores: []
  }));
  STATE.round = 1;
  STATE.roundLeaderIndex = 0;
  startDeal();
}

function startDeal() {
  dealCards();
  STATE.phase = 'DEAL';
  STATE.completedTricks = [];
  STATE.trickNumber = 1;
  STATE.currentTrick = { leadSuit: null, plays: [] };
  STATE.showTrickResult = false;
  saveState(); render();
}

function startBid() {
  STATE.phase = 'BID';
  STATE.bidCursor = STATE.roundLeaderIndex;
  STATE.revealHand = false;
  saveState(); render();
}

function recordBid(bid) {
  STATE.players[STATE.bidCursor].bid = bid;
  STATE.bidCursor = (STATE.bidCursor + 1) % STATE.players.length;
  if (STATE.players.every(p => p.bid !== null)) {
    startPlay();
  } else {
    STATE.revealHand = false;
    saveState(); render();
  }
}

function startPlay() {
  STATE.phase = 'PLAY';
  STATE.activePlayerIndex = STATE.roundLeaderIndex;
  STATE.leadPlayerIndex   = STATE.roundLeaderIndex;
  STATE.currentTrick = { leadSuit: null, plays: [] };
  STATE.revealHand = false;
  STATE.showTrickResult = false;
  saveState(); render();
}

function recordPlay(cardId) {
  const player = STATE.players[STATE.activePlayerIndex];
  const idx = player.hand.findIndex(c => c.id === cardId);
  if (idx === -1) return;
  const card = player.hand[idx];
  if (!isLegalPlay(player, card)) return;

  const playOrder = STATE.currentTrick.plays.length;
  STATE.currentTrick.plays.push({ playerId: player.id, card, playOrder });

  if (!STATE.currentTrick.leadSuit && card.type === 'number')
    STATE.currentTrick.leadSuit = card.suit;

  player.hand.splice(idx, 1);

  if (STATE.currentTrick.plays.length === STATE.players.length) {
    evaluateTrick();
  } else {
    STATE.activePlayerIndex = (STATE.activePlayerIndex + 1) % STATE.players.length;
    STATE.revealHand = false;
    saveState(); render();
  }
}

function evaluateTrick() {
  const plays   = STATE.currentTrick.plays;
  const winnerId = determineTrickWinner(plays);
  const bonus    = accumulateBonuses(plays, winnerId);

  const winner = STATE.players.find(p => p.id === winnerId);
  winner.tricksWon++;
  winner.bonusPoints += bonus;

  STATE.currentTrick.winnerId = winnerId;
  STATE.completedTricks.push({ ...STATE.currentTrick, plays: [...plays] });
  STATE.lastTrickWinner = winnerId;
  STATE.lastTrickBonus  = bonus;
  STATE.lastTrickPlays  = plays.map(p => ({ ...p }));
  STATE.showTrickResult = true;

  saveState(); render();
}

function nextTrick() {
  STATE.showTrickResult = false;

  if (STATE.players[0].hand.length === 0) {
    endRound(); return;
  }

  const winnerIdx = STATE.players.findIndex(p => p.id === STATE.lastTrickWinner);
  STATE.leadPlayerIndex   = winnerIdx;
  STATE.activePlayerIndex = winnerIdx;
  STATE.trickNumber++;
  STATE.currentTrick = { leadSuit: null, plays: [] };
  STATE.revealHand = false;

  saveState(); render();
}

function endRound() {
  STATE.phase = 'SCORE';
  STATE.players.forEach(p => {
    const delta = calculateRoundScore(p.bid, p.tricksWon, p.bonusPoints, STATE.round);
    p.roundScores.push({ round: STATE.round, bid: p.bid, tricks: p.tricksWon, bonus: p.bonusPoints, delta });
    p.totalScore += delta;
  });
  saveState(); render();
}

function nextRound() {
  if (STATE.round >= 10) {
    STATE.phase = 'FINAL';
    saveState(); render(); return;
  }
  STATE.round++;
  STATE.roundLeaderIndex = (STATE.roundLeaderIndex + 1) % STATE.players.length;
  startDeal();
}

function dismissPassDevice() {
  STATE.revealHand = true;
  saveState(); render();
}

function handleCardPlay(cardId) { recordPlay(cardId); }

function handleStartGame() {
  const count = parseInt(document.getElementById('playerCount').value);
  const names = [];
  for (let i = 1; i <= count; i++) {
    const el = document.getElementById('p' + i + 'name');
    names.push(el ? (el.value.trim() || 'Player ' + i) : 'Player ' + i);
  }
  clearSave();
  STATE = defaultState();
  initGame(names);
}

function handleNewGame() {
  clearSave();
  STATE = defaultState();
  render();
}

function confirmNewGame() {
  if (confirm('Abandon this game and start over?')) handleNewGame();
}

function newGameBtn() {
  return `<button onclick="confirmNewGame()" title="Abandon and start new game"
    style="background:none;border:1px solid #1e3a5a;border-radius:6px;
    color:#475569;font-size:0.75em;padding:4px 10px;cursor:pointer;
    font-family:Georgia,serif;transition:color 0.1s,border-color 0.1s"
    onmouseover="this.style.color='#f87171';this.style.borderColor='#f87171'"
    onmouseout="this.style.color='#475569';this.style.borderColor='#1e3a5a'">
    ✕ New Game
  </button>`;
}

function updatePlayerFields() {
  const count = parseInt(document.getElementById('playerCount').value);
  const container = document.getElementById('playerNames');
  container.innerHTML = Array.from({ length: count }, (_, i) => `
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;color:#94a3b8;font-size:0.9em;">Player ${i+1}</label>
      <input type="text" id="p${i+1}name" value="Player ${i+1}" placeholder="Player ${i+1} name">
    </div>`).join('');
}

// ---- PERSISTENCE ----
function saveState() {
  try { localStorage.setItem('skullking_v2', JSON.stringify(STATE)); } catch(e) {}
}
function loadState() {
  try {
    const s = localStorage.getItem('skullking_v2');
    if (s) { STATE = JSON.parse(s); return true; }
  } catch(e) {}
  return false;
}
function clearSave() {
  try { localStorage.removeItem('skullking_v2'); } catch(e) {}
}
