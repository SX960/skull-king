// ---- CARD RENDERING ----
function cardBackground(card) {
  if (card.type === 'number') {
    return { yellow: 'linear-gradient(145deg,#f5c518,#d4a017)',
             purple: 'linear-gradient(145deg,#7c3aed,#5b21b6)',
             green:  'linear-gradient(145deg,#16a34a,#166534)',
             black:  'linear-gradient(145deg,#334155,#1e293b)' }[card.suit];
  }
  return { escape:     'linear-gradient(145deg,#94a3b8,#64748b)',
           pirate:     'linear-gradient(145deg,#dc2626,#7f1d1d)',
           mermaid:    'linear-gradient(145deg,#0891b2,#0c4a6e)',
           skull_king: 'linear-gradient(145deg,#4c1d95,#1e1b4b)' }[card.type];
}

function cardTextColor(card) {
  return (card.type === 'number' && card.suit === 'yellow') ? '#1a1000' : '#fff';
}

function renderCard(card, opts = {}) {
  const { legal = true, size = 'md', onclick = '' } = opts;
  const bg = cardBackground(card);
  const tc = cardTextColor(card);
  const w  = size === 'sm' ? 56  : size === 'lg' ? 96  : 72;
  const h  = size === 'sm' ? 78  : size === 'lg' ? 134 : 100;
  const fs = size === 'sm' ? 11  : size === 'lg' ? 15  : 13;
  const ef = size === 'sm' ? 18  : size === 'lg' ? 30  : 22;

  const topLabel  = card.type === 'number' ? card.value : card.emoji;
  const midEmoji  = card.type === 'number' ? card.emoji : '';
  const botLabel  = card.type === 'number' ? card.value : card.display;

  const cls = 'card ' + (legal ? 'legal' : 'illegal');
  const style = [
    `background:${bg}`, `color:${tc}`,
    `width:${w}px`, `height:${h}px`, `font-size:${fs}px`,
    'border-radius:8px', 'padding:5px',
    'display:inline-flex', 'flex-direction:column', 'justify-content:space-between',
    'margin:3px', 'vertical-align:top',
    `border:2px solid rgba(255,255,255,${legal ? '0.25' : '0.08'})`,
    `box-shadow:2px 4px 8px rgba(0,0,0,0.45)`,
    `opacity:${legal ? 1 : 0.45}`,
    `cursor:${legal && onclick ? 'pointer' : 'default'}`
  ].join(';');

  return `<div class="${cls}" style="${style}" ${onclick ? `onclick="${onclick}"` : ''} title="${card.display}">
    <span style="font-weight:bold">${topLabel}</span>
    <span style="text-align:center;font-size:${ef}px">${midEmoji}</span>
    <span style="font-size:${fs-2}px;text-align:right;opacity:0.85">${botLabel}</span>
  </div>`;
}

// ---- OVERLAYS ----
function renderPassOverlay(name) {
  return `<div style="position:fixed;inset:0;background:rgba(2,10,25,0.97);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:200;cursor:pointer;" onclick="dismissPassDevice()">
    <div style="text-align:center;padding:40px 30px;max-width:380px;">
      <div style="font-size:4em;margin-bottom:18px">🏴‍☠️</div>
      <div style="font-size:1em;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">Pass device to</div>
      <div style="font-size:2.6em;font-weight:bold;color:#c9a84c;margin-bottom:32px;line-height:1.2">${name}</div>
      <div style="background:linear-gradient(135deg,#c9a84c,#a07030);color:#0a2342;
        padding:16px 48px;border-radius:10px;font-size:1.1em;font-weight:bold;
        display:inline-block;letter-spacing:0.05em">Tap to Continue</div>
    </div>
  </div>`;
}

function renderTrickOverlay() {
  const winner = STATE.players.find(p => p.id === STATE.lastTrickWinner);
  const bonus  = STATE.lastTrickBonus;
  const plays  = STATE.lastTrickPlays;

  const cards = plays.map(p => {
    const pl = STATE.players.find(pl => pl.id === p.playerId);
    const isW = p.playerId === STATE.lastTrickWinner;
    return `<div style="text-align:center;margin:0 4px">
      <div style="font-size:0.7em;color:${isW ? '#ffd700' : '#64748b'};margin-bottom:3px">
        ${pl.name}${isW ? ' 👑' : ''}
      </div>
      ${renderCard(p.card, { legal: true, size: 'sm' })}
    </div>`;
  }).join('');

  const bonusHtml = bonus > 0
    ? `<div style="color:#4ade80;font-size:1em;margin-top:8px">+${bonus} bonus!</div>` : '';

  return `<div style="position:fixed;inset:0;background:rgba(2,10,25,0.88);
    display:flex;align-items:center;justify-content:center;z-index:200;cursor:pointer;"
    onclick="nextTrick()">
    <div style="background:#0d2540;border:2px solid #c9a84c;border-radius:14px;
      padding:28px 24px;max-width:480px;width:92%;text-align:center;
      box-shadow:0 0 40px rgba(201,168,76,0.2)">
      <div style="font-size:0.85em;color:#64748b;margin-bottom:6px">Trick ${STATE.trickNumber} Result</div>
      <div style="font-size:2em;font-weight:bold;color:#c9a84c">${winner.name} wins!</div>
      ${bonusHtml}
      <div style="display:flex;justify-content:center;flex-wrap:wrap;margin:18px 0 10px">${cards}</div>
      <div style="color:#475569;font-size:0.8em">Tap anywhere to continue</div>
    </div>
  </div>`;
}

// ---- PHASE RENDERS ----
function renderSetup() {
  return `<div style="min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:24px">
    <div style="font-size:3.5em;margin-bottom:10px">💀</div>
    <h1 style="font-size:2.4em;color:#c9a84c;margin-bottom:6px;
      text-shadow:0 2px 8px rgba(201,168,76,0.3)">Skull King</h1>
    <p style="color:#475569;margin-bottom:32px;font-size:0.95em">The Pirate Trick-Taking Game</p>

    <div class="panel" style="width:100%;max-width:400px">
      <div style="margin-bottom:20px">
        <label style="display:block;margin-bottom:8px;color:#c9a84c;font-size:0.9em">Number of Players</label>
        <select id="playerCount" onchange="updatePlayerFields()">
          <option value="2">2 Players</option>
          <option value="3">3 Players</option>
          <option value="4">4 Players</option>
          <option value="5">5 Players</option>
          <option value="6">6 Players</option>
        </select>
      </div>

      <div id="playerNames">
        ${[1,2].map(i => `
          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:4px;color:#94a3b8;font-size:0.9em">Player ${i}</label>
            <input type="text" id="p${i}name" value="Player ${i}" placeholder="Player ${i} name">
          </div>`).join('')}
      </div>

      <button class="btn-gold" style="width:100%;padding:14px;font-size:1.1em;margin-top:8px"
        onclick="handleStartGame()">⚓ Set Sail!</button>
    </div>

    <div style="margin-top:20px;color:#1e4a7a;font-size:0.8em;text-align:center">
      10 rounds · 2–6 players · Pass device between turns
    </div>
  </div>`;
}

function renderDeal() {
  return `<div style="min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:24px;text-align:center">
    <div style="position:absolute;top:14px;right:14px">${newGameBtn()}</div>
    <div style="font-size:3em;margin-bottom:18px">🃏</div>
    <h2 style="font-size:2.2em;color:#c9a84c;margin-bottom:8px">Round ${STATE.round}</h2>
    <p style="color:#64748b;margin-bottom:4px">${STATE.round} card${STATE.round > 1 ? 's' : ''} per player</p>
    <p style="color:#475569;font-size:0.9em;margin-bottom:28px">${STATE.round} trick${STATE.round > 1 ? 's' : ''} to play</p>

    <div class="panel" style="width:100%;max-width:380px;margin-bottom:28px">
      ${STATE.players.map((p, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:10px 4px;border-bottom:1px solid #1a3a5c;
          ${i === STATE.players.length - 1 ? 'border-bottom:none' : ''}">
          <span style="color:${i === STATE.roundLeaderIndex ? '#c9a84c' : '#f0e6c8'}">
            ${i === STATE.roundLeaderIndex ? '⚓ ' : ''}${p.name}
          </span>
          <span style="color:#c9a84c;font-weight:bold">${p.totalScore} pts</span>
        </div>`).join('')}
    </div>

    <button class="btn-gold" style="padding:14px 48px;font-size:1.1em" onclick="startBid()">
      Start Bidding →
    </button>
  </div>`;
}

function renderBid() {
  const player = STATE.players[STATE.bidCursor];
  if (!STATE.revealHand) return renderPassOverlay(player.name);

  const prevBids = STATE.players
    .filter(p => p.bid !== null)
    .map(p => `<span style="color:#94a3b8;font-size:0.85em">${p.name}: <b style="color:#c9a84c">${p.bid}</b></span>`)
    .join(' &nbsp;·&nbsp; ');

  const bids = Array.from({ length: STATE.round + 1 }, (_, i) => i);

  return `<div style="min-height:100vh;padding:20px;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:flex-end;margin-bottom:6px">${newGameBtn()}</div>
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:0.8em;color:#475569;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px">
        Round ${STATE.round} — Bidding
      </div>
      <div style="font-size:1.6em;font-weight:bold;color:#c9a84c">${player.name}</div>
      ${prevBids ? `<div style="margin-top:8px;line-height:1.8">${prevBids}</div>` : ''}
    </div>

    <div style="margin-bottom:20px">
      <div style="font-size:0.8em;color:#64748b;margin-bottom:8px;text-align:center;
        text-transform:uppercase;letter-spacing:0.05em">Your Hand</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">
        ${player.hand.map(c => renderCard(c, { legal: true })).join('')}
      </div>
    </div>

    <div style="text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="color:#94a3b8;margin-bottom:14px;font-size:0.95em">How many tricks will you win?</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:360px;margin:0 auto">
        ${bids.map(b => `<button class="btn-round" onclick="recordBid(${b})">${b}</button>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderPlay() {
  if (STATE.showTrickResult) {
    return `<div style="min-height:100vh;position:relative">${renderTrickOverlay()}</div>`;
  }

  const player  = STATE.players[STATE.activePlayerIndex];
  if (!STATE.revealHand) return renderPassOverlay(player.name);

  const leadSuit = STATE.currentTrick.leadSuit;

  const scorePills = STATE.players.map(p => `
    <div style="background:#0f2a4a;border:1px solid ${p.id === player.id ? '#c9a84c' : '#1e3a5a'};
      border-radius:6px;padding:5px 9px;flex-shrink:0;text-align:center;min-width:72px">
      <div style="font-size:0.7em;color:#64748b;white-space:nowrap;overflow:hidden;max-width:70px">${p.name}</div>
      <div style="font-size:0.8em;color:#f0e6c8">${p.tricksWon} / ${p.bid !== null ? p.bid : '?'}</div>
    </div>`).join('');

  const trickCards = STATE.currentTrick.plays.length === 0
    ? `<span style="color:#1e3a5a;font-style:italic;font-size:0.9em">No cards played yet</span>`
    : STATE.currentTrick.plays.map(play => {
        const pl = STATE.players.find(p => p.id === play.playerId);
        return `<div style="text-align:center">
          <div style="font-size:0.65em;color:#64748b;margin-bottom:2px">${pl.name}</div>
          ${renderCard(play.card, { legal: true, size: 'sm' })}
        </div>`;
      }).join('');

  const handCards = player.hand.map(card => {
    const legal = isLegalPlay(player, card);
    return renderCard(card, {
      legal, size: 'md',
      onclick: legal ? `handleCardPlay(${card.id})` : ''
    });
  }).join('');

  return `<div style="min-height:100vh;padding:14px;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:0.8em;color:#475569">Round ${STATE.round} · Trick ${STATE.trickNumber}/${STATE.round}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:0.9em;color:#c9a84c;font-weight:bold">${player.name}</div>
        ${newGameBtn()}
      </div>
    </div>

    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:2px">
      ${scorePills}
    </div>

    <div class="panel" style="margin-bottom:12px">
      <div style="font-size:0.75em;color:#475569;margin-bottom:8px">
        Current Trick${leadSuit ? ` &nbsp;·&nbsp; Lead: ${SUIT_EMOJI[leadSuit]} ${SUIT_LABEL[leadSuit]}` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:2px;min-height:44px;align-items:flex-end">
        ${trickCards}
      </div>
    </div>

    <div style="flex:1">
      <div style="font-size:0.75em;color:#64748b;margin-bottom:6px;text-align:center;
        text-transform:uppercase;letter-spacing:0.05em">Your Hand — tap to play</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">
        ${handCards}
      </div>
    </div>
  </div>`;
}

function renderScore() {
  const sorted = [...STATE.players].sort((a, b) => b.totalScore - a.totalScore);

  const rows = sorted.map((p, rank) => {
    const rs   = p.roundScores[STATE.round - 1];
    const pos  = rs.delta >= 0;
    const exact = p.bid === p.tricksWon; // used bid > 0 check inline
    return `<tr>
      <td style="padding:10px 12px">${rank === 0 ? '👑 ' : ''}${p.name}</td>
      <td style="padding:10px 12px;text-align:center">${rs.bid}</td>
      <td style="padding:10px 12px;text-align:center;
        color:${rs.tricks === rs.bid ? '#4ade80' : '#f87171'}">${rs.tricks}</td>
      <td style="padding:10px 12px;text-align:center;color:#4ade80">
        ${rs.bonus > 0 ? '+' + rs.bonus : '—'}
      </td>
      <td style="padding:10px 12px;text-align:center;font-weight:bold;
        color:${pos ? '#4ade80' : '#f87171'}">${pos ? '+' : ''}${rs.delta}</td>
      <td style="padding:10px 12px;text-align:center;color:#c9a84c;font-weight:bold">
        ${p.totalScore}
      </td>
    </tr>`;
  }).join('');

  const nextLabel = STATE.round >= 10 ? 'Final Standings →' : `Start Round ${STATE.round + 1} →`;

  return `<div style="min-height:100vh;padding:24px;display:flex;flex-direction:column;align-items:center">
    <div style="width:100%;max-width:600px;display:flex;justify-content:flex-end;margin-bottom:8px">${newGameBtn()}</div>
    <div style="font-size:2.2em;margin-bottom:8px">📊</div>
    <h2 style="color:#c9a84c;margin-bottom:4px;font-size:1.8em">Round ${STATE.round} Results</h2>
    <p style="color:#475569;font-size:0.85em;margin-bottom:24px">Sorted by total score</p>

    <div style="width:100%;max-width:600px;overflow-x:auto;margin-bottom:28px">
      <table style="width:100%;border-collapse:collapse;background:#0f2a4a;
        border-radius:10px;overflow:hidden">
        <thead>
          <tr style="background:#1a3a64">
            <th style="padding:10px 12px;text-align:left;color:#c9a84c">Player</th>
            <th style="padding:10px 12px;color:#c9a84c">Bid</th>
            <th style="padding:10px 12px;color:#c9a84c">Won</th>
            <th style="padding:10px 12px;color:#c9a84c">Bonus</th>
            <th style="padding:10px 12px;color:#c9a84c">Round</th>
            <th style="padding:10px 12px;color:#c9a84c">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <button class="btn-gold" style="padding:14px 48px;font-size:1.1em" onclick="nextRound()">
      ${nextLabel}
    </button>
  </div>`;
}

function renderFinal() {
  const sorted = [...STATE.players].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['🥇', '🥈', '🥉'];

  const podium = sorted.slice(0, Math.min(3, sorted.length)).map((p, i) => `
    <div style="background:#0f2a4a;border:2px solid ${i === 0 ? '#c9a84c' : '#1e3a64'};
      border-radius:12px;padding:22px 18px;text-align:center;min-width:110px;
      ${i === 0 ? 'box-shadow:0 0 24px rgba(201,168,76,0.3)' : ''}">
      <div style="font-size:2.2em">${medals[i]}</div>
      <div style="font-weight:bold;margin:8px 0 4px;color:${i === 0 ? '#c9a84c' : '#f0e6c8'}">${p.name}</div>
      <div style="font-size:1.4em;font-weight:bold;color:#c9a84c">${p.totalScore}</div>
    </div>`).join('');

  const histHeaders = Array.from({ length: 10 }, (_, i) =>
    `<th style="padding:7px 4px;color:#c9a84c;min-width:38px;text-align:center">R${i+1}</th>`
  ).join('');

  const histRows = sorted.map(p => {
    const cells = Array.from({ length: 10 }, (_, i) => {
      const rs = p.roundScores[i];
      if (!rs) return `<td style="padding:7px 4px;text-align:center;color:#1e3a5a">—</td>`;
      const pos = rs.delta >= 0;
      return `<td style="padding:7px 4px;text-align:center;font-size:0.82em;
        color:${pos ? '#4ade80' : '#f87171'}">${pos ? '+' : ''}${rs.delta}</td>`;
    }).join('');
    return `<tr>
      <td style="padding:7px 12px;white-space:nowrap">${p.name}</td>
      ${cells}
      <td style="padding:7px 10px;text-align:center;color:#c9a84c;font-weight:bold">${p.totalScore}</td>
    </tr>`;
  }).join('');

  return `<div style="min-height:100vh;padding:24px;display:flex;flex-direction:column;align-items:center">
    <div style="font-size:3em;margin-bottom:10px">💀</div>
    <h1 style="color:#c9a84c;font-size:2em;margin-bottom:4px">Final Standings</h1>
    <p style="color:#475569;margin-bottom:28px">The seas have been conquered!</p>

    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:30px">
      ${podium}
    </div>

    <div style="width:100%;max-width:700px;overflow-x:auto;margin-bottom:28px">
      <table style="width:100%;border-collapse:collapse;background:#0f2a4a;
        border-radius:10px;overflow:hidden">
        <thead>
          <tr style="background:#1a3a64">
            <th style="padding:7px 12px;text-align:left;color:#c9a84c">Player</th>
            ${histHeaders}
            <th style="padding:7px 10px;color:#c9a84c;text-align:center">Total</th>
          </tr>
        </thead>
        <tbody>${histRows}</tbody>
      </table>
    </div>

    <button class="btn-gold" style="padding:14px 48px;font-size:1.1em" onclick="handleNewGame()">
      ⚓ Play Again
    </button>

    <div style="margin-top:16px;color:#1e4a7a;font-size:0.8em">Skull King — 10 Rounds Complete</div>
  </div>`;
}

// ---- MAIN RENDER ----
function render() {
  const app = document.getElementById('app');
  switch (STATE.phase) {
    case 'SETUP': app.innerHTML = renderSetup(); break;
    case 'DEAL':  app.innerHTML = renderDeal();  break;
    case 'BID':   app.innerHTML = renderBid();   break;
    case 'PLAY':  app.innerHTML = renderPlay();  break;
    case 'SCORE': app.innerHTML = renderScore(); break;
    case 'FINAL': app.innerHTML = renderFinal(); break;
    default:      app.innerHTML = renderSetup();
  }
}
