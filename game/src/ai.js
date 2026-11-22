/* Emberfall — the Warden's brain. It reads the table and counters you:
   it takes lethal when it sees it, shields when it is bleeding, heals when
   it is low, and otherwise spends its mana on the best damage it can buy.
   Every choice is scored, so its plays are readable, not random. */

import { playCard } from './state.js';

/** Score one card in the Warden's hand against the current table. */
export function scoreCard(game, card) {
  const foe = game.foe;
  const you = game.you;
  let score = 0;
  if (card.power) {
    // Damage that actually lands is worth more than damage your block eats.
    const throughBlock = Math.max(0, card.power - you.block);
    score += throughBlock * 2 + Math.min(card.power, you.block) * 0.5;
    if (card.power >= you.life) score += 100; // lethal: always take it
    if (card.draw) score += 3 + card.draw * 2;
  }
  if (card.block) {
    // Block matters most when your next hit would hurt.
    const danger = you.hand.reduce((s, c) => s + (c.power || 0), 0);
    score += card.block * (foe.life <= 10 ? 1.6 : 0.9);
    if (danger > foe.life) score += card.block * 0.8;
  }
  if (card.heal) {
    const missing = 24 - foe.life;
    if (missing <= 0) return -1; // never waste a heal at full Ember
    score += Math.min(card.heal, missing) * (foe.life <= 8 ? 2.2 : 1.1);
  }
  // Cheap cards that leave mana for a second play beat one big card.
  score += (4 - card.cost) * 0.4;
  return score;
}

/** Pick the Warden's next move: the best-scoring affordable card, or null
    when nothing is worth playing (it saves nothing — mana does not carry). */
export function chooseCard(game) {
  const foe = game.foe;
  let best = null;
  let bestScore = 0;
  foe.hand.forEach((card, i) => {
    if (card.cost > foe.mana) return;
    const s = scoreCard(game, card);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

/** Play the Warden's whole turn, one card at a time, with a small pause
    between plays so the table reads like a duel, not a dump. The callback
    fires after each play (to re-render) and once when the turn is done. */
export function runAiTurn(game, onPlay, onDone, delay = 650) {
  const step = () => {
    if (game.phase !== 'ai') { onDone(); return; }
    const pick = chooseCard(game);
    if (pick === null) { onDone(); return; }
    playCard(game, 'foe', pick);
    onPlay();
    if (game.phase === 'won' || game.phase === 'lost') { onDone(); return; }
    setTimeout(step, delay);
  };
  setTimeout(step, delay);
}
