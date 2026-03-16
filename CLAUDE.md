# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `skulking.html` directly in a browser — no build step, no server needed. The file loads `css/skulking.css` and the five `js/` modules via plain `<link>`/`<script src>` tags, which work on `file://` in all modern browsers.

## Re-splitting the monolith

If `skulking_original.html` is updated and the split files need to be regenerated:

```bash
cd claude_test
python split_skulking.py
```

The script is idempotent — safe to re-run at any time. It prints a per-file line count summary when done.

## Architecture

### Skull King (`skulking.html` + `js/` + `css/`)

The game uses a single global `STATE` object and a purely functional render loop — no framework, no DOM diffing. Every user action mutates `STATE` and calls `render()`, which replaces `#app`'s `innerHTML` wholesale.

**JS load order matters** (defined in `skulking.html`):

| File | Responsibility |
|---|---|
| `js/deck.js` | `SUITS`, `STATE` declaration, `defaultState()`, `buildDeck()`, `shuffle()`, `dealCards()` |
| `js/logic.js` | Pure functions: `isLegalPlay()`, `determineTrickWinner()`, `accumulateBonuses()`, `calculateRoundScore()` |
| `js/state.js` | All state mutations (`initGame` → `nextRound`), DOM event handlers, `saveState()`/`loadState()`/`clearSave()` via `localStorage` key `skullking_v2` |
| `js/render.js` | All HTML-string generators (`renderSetup` … `renderFinal`, `renderCard`, overlays), `render()` dispatcher |
| `js/main.js` | Boot IIFE — calls `loadState()` then `render()` |

**State machine:** `SETUP → DEAL → BID → PLAY → SCORE → (repeat) → FINAL`

The `PLAY` phase has two overlay sub-states controlled by `STATE.revealHand` (pass-device screen) and `STATE.showTrickResult` (trick result screen), both rendered inline by `renderPlay()` / `renderBid()`.

**Trump/win hierarchy** (highest to lowest): Skull King > Mermaid (beats SK only) > Pirate (first played wins if multiple) > Black suit > Lead suit > Off-suit numbered > Escape (always loses; if all escape, lead player wins).

**Scoring:**
- Bid 0: `tricks === 0` → `+10×round`; else `−10×round`
- Bid > 0, exact: `+20×bid + bonusPoints`
- Bid > 0, wrong: `−10×|bid−tricks|` (bonuses forfeited)

### Reference: `skulking_original.html`

The original 806-line monolith kept for reference and as the canonical source for `split_skulking.py`. Do not edit it directly if the split files are the source of truth.
