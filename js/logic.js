// ---- LEGAL PLAY ----
function isLegalPlay(player, card) {
  const leadSuit = STATE.currentTrick.leadSuit;
  if (!leadSuit) return true;
  if (card.type !== 'number') return true;
  if (card.suit === leadSuit) return true;
  return !player.hand.some(c => c.type === 'number' && c.suit === leadSuit);
}

// ---- TRICK WINNER ----
// Rank: Pirate > Mermaid > Skull King > Black suit > Lead suit > Off-suit > Escape
// SK loses ONLY to Mermaid; Mermaid beats SK but loses to Pirate
function determineTrickWinner(plays) {
  const nonEscapes = plays.filter(p => p.card.type !== 'escape');
  if (nonEscapes.length === 0) {
    return plays.find(p => p.playOrder === 0).playerId;
  }

  const skPlay = plays.find(p => p.card.type === 'skull_king');
  const mermaids = plays.filter(p => p.card.type === 'mermaid').sort((a,b) => a.playOrder - b.playOrder);
  const pirates  = plays.filter(p => p.card.type === 'pirate').sort((a,b) => a.playOrder - b.playOrder);

  if (skPlay) {
    // Mermaid beats SK; if mermaid + pirate, pirate beats mermaid (checked below), so:
    // actually re-check with all three present: pirate > mermaid > SK
    if (pirates.length > 0 && mermaids.length > 0) return pirates[0].playerId;
    if (mermaids.length > 0) return mermaids[0].playerId;
    if (pirates.length > 0) return skPlay.playerId; // SK beats pirate (no mermaid)
    return skPlay.playerId;
  }

  if (pirates.length > 0) return pirates[0].playerId;
  if (mermaids.length > 0) return mermaids[0].playerId;

  const leadSuit = STATE.currentTrick.leadSuit;
  const blackPlays = plays.filter(p => p.card.type === 'number' && p.card.suit === 'black');
  if (blackPlays.length > 0)
    return blackPlays.reduce((b, p) => p.card.value > b.card.value ? p : b).playerId;

  if (leadSuit) {
    const leadPlays = plays.filter(p => p.card.type === 'number' && p.card.suit === leadSuit);
    if (leadPlays.length > 0)
      return leadPlays.reduce((b, p) => p.card.value > b.card.value ? p : b).playerId;
  }

  // All off-suit or no real winner: lead player wins
  return plays.find(p => p.playOrder === 0).playerId;
}

// ---- BONUSES ----
function accumulateBonuses(plays, winnerId) {
  const wp = plays.find(p => p.playerId === winnerId);
  if (!wp) return 0;
  const wc = wp.card;
  let bonus = 0;
  if (wc.type === 'skull_king') {
    bonus += 30 * plays.filter(p => p.card.type === 'pirate').length;
  }
  if (wc.type === 'pirate') {
    bonus += 20 * plays.filter(p => p.card.type === 'mermaid').length;
  }
  if (wc.type === 'mermaid') {
    if (plays.some(p => p.card.type === 'skull_king')) bonus += 40;
  }
  return bonus;
}

// ---- SCORING ----
function calculateRoundScore(bid, tricks, bonus, round) {
  if (bid === 0) return tricks === 0 ? 10 * round : -10 * round;
  return tricks === bid ? 20 * bid + bonus : -10 * Math.abs(bid - tricks);
}
