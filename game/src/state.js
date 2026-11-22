/* Emberfall — the game state and its rules. Pure logic, no DOM: every
   turn is a small, testable step (draw, play, end turn, AI turn, win check). */

import { MAX_LIFE, MAX_MANA, START_HAND, MAX_HAND, buildDeck, shuffle, seededRandom } from './cards.js';

export const PHASES = { TITLE: 'title', PLAYER: 'player', AI: 'ai', WON: 'won', LOST: 'lost' };

export function newFighter() {
  return { life: MAX_LIFE, block: 0, mana: 0, maxMana: 0, deck: [], hand: [], discard: [] };
}

export function newGame(seed = (Math.random() * 1e9) | 0) {
  const rand = seededRandom(seed);
  const game = {
    seed,
    rand,
    phase: PHASES.PLAYER,
    round: 1,
    you: newFighter(),
    foe: newFighter(),
    arena: [],          // cards played this round, newest last: {card, by}
    log: [],
    winner: null,
    stats: { played: 0, damageDealt: 0, damageTaken: 0, healed: 0 },
  };
  for (const side of ['you', 'foe']) {
    game[side].deck = shuffle(buildDeck(), rand);
    game[side].maxMana = 1;
    game[side].mana = 1;
  }
  drawCards(game, 'you', START_HAND);
  drawCards(game, 'foe', START_HAND);
  pushLog(game, 'The duel begins. Both keepers draw 4 cards.');
  return game;
}

export function pushLog(game, text) {
  game.log.push(text);
  if (game.log.length > 40) game.log.shift();
}

/** Draw n cards; an empty deck costs 2 Ember per missing card (fatigue),
    so stalling forever is not a plan. */
export function drawCards(game, side, n) {
  const f = game[side];
  for (let i = 0; i < n; i++) {
    if (f.hand.length >= MAX_HAND) { pushLog(game, side === 'you' ? 'Your hand is full — card burned.' : 'The Warden’s hand is full — card burned.'); return; }
    if (f.deck.length === 0) {
      if (f.discard.length === 0) {
        f.life = Math.max(0, f.life - 2);
        pushLog(game, `${who(side)} deck is empty — fatigue burns 2 Ember.`);
        if (f.life <= 0) endGame(game, side === 'you' ? 'foe' : 'you');
        continue;
      }
      f.deck = shuffle(f.discard.splice(0), game.rand);
      pushLog(game, `${who(side)} reshuffles the discard pile.`);
    }
    f.hand.push(f.deck.pop());
  }
}

export function who(side) { return side === 'you' ? 'You' : 'The Warden'; }

/** Can this card be played right now? Only on your turn, with mana to spare. */
export function canPlay(game, index) {
  if (game.phase !== PHASES.PLAYER) return false;
  const card = game.you.hand[index];
  return !!card && card.cost <= game.you.mana;
}

/** Resolve one card. Damage eats block first, then Ember. */
export function playCard(game, side, index) {
  const f = game[side];
  const card = f.hand[index];
  if (!card || card.cost > f.mana) return null;
  f.mana -= card.cost;
  f.hand.splice(index, 1);
  f.discard.push(card);
  game.arena.push({ card, by: side });
  if (game.arena.length > 6) game.arena.shift();

  const other = side === 'you' ? game.foe : game.you;
  let line = side === 'you' ? `You play ${card.name}` : `The Warden plays ${card.name}`;
  if (card.power) {
    const dealt = dealDamage(game, other, card.power);
    line += ` — ${dealt} damage`;
    if (side === 'you') game.stats.damageDealt += dealt; else game.stats.damageTaken += dealt;
  }
  if (card.block) { f.block += card.block; line += ` — +${card.block} block`; }
  if (card.heal) {
    const healed = Math.min(card.heal, MAX_LIFE - f.life);
    f.life += healed;
    if (side === 'you') game.stats.healed += healed;
    line += ` — +${healed} Ember`;
  }
  if (card.draw) { drawCards(game, side, card.draw); line += ` — draws ${card.draw}`; }
  line += '.';
  pushLog(game, line);
  if (side === 'you') game.stats.played += 1;
  checkEnd(game);
  return card;
}

/** Block absorbs first; the rest hits Ember. Returns damage that landed. */
export function dealDamage(game, target, amount) {
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const landed = amount - absorbed;
  target.life = Math.max(0, target.life - landed);
  return landed;
}

/** End your turn: the Warden answers, then a new round begins for you. */
export function endPlayerTurn(game) {
  if (game.phase !== PHASES.PLAYER) return;
  game.phase = PHASES.AI;
  pushLog(game, '— Your turn ends. The Warden answers. —');
}

export function startPlayerTurn(game) {
  game.round += 1;
  game.phase = PHASES.PLAYER;
  game.you.block = 0;
  game.you.maxMana = Math.min(MAX_MANA, game.you.maxMana + 1);
  game.you.mana = game.you.maxMana;
  game.foe.block = 0;
  drawCards(game, 'you', 1);
  pushLog(game, `Round ${game.round}: you draw a card and gain mana (${game.you.mana}/${game.you.maxMana}).`);
  checkEnd(game);
}

export function startAiTurn(game) {
  game.foe.maxMana = Math.min(MAX_MANA, game.foe.maxMana + 1);
  game.foe.mana = game.foe.maxMana;
  game.foe.block = 0;
  drawCards(game, 'foe', 1);
}

function checkEnd(game) {
  if (game.phase === PHASES.WON || game.phase === PHASES.LOST) return;
  if (game.foe.life <= 0) endGame(game, 'you');
  else if (game.you.life <= 0) endGame(game, 'foe');
}

function endGame(game, winner) {
  game.winner = winner;
  game.phase = winner === 'you' ? PHASES.WON : PHASES.LOST;
  pushLog(game, winner === 'you'
    ? 'The Warden’s last ember gutters out. You win!'
    : 'Your ember fades to ash. The Warden wins.');
}

/** Screenshot staging only: declare the winner outright. The live game
    never calls this — it only ever wins through checkEnd. */
export function forceWin(game, winner) {
  endGame(game, winner);
}
