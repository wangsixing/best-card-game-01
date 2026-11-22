/* Emberfall — the card definitions and the deck builder.
   One card = one idea: a suit (Flame / Stone / Bloom / Gale) with its own
   colour and shape, a mana cost, and a single clear effect. */

export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#ff5a3c', soft: '#ffd9d0', verb: 'Burn' },
  stone: { name: 'Stone', glyph: '■', color: '#5b8fd6', soft: '#d8e6fb', verb: 'Guard' },
  bloom: { name: 'Bloom', glyph: '●', color: '#3fae6a', soft: '#d6f2e2', verb: 'Mend' },
  gale:  { name: 'Gale',  glyph: '◆', color: '#9b6dd6', soft: '#eadffa', verb: 'Storm' },
};

/* id, suit, cost, power, draw, heal, block, text — every card does exactly
   what its text says, so the table never needs a rulebook. */
export const CARD_DEFS = [
  { id: 'spark',     name: 'Ember Spark',  suit: 'flame', cost: 1, power: 3,  text: 'Deal 3 damage.' },
  { id: 'slash',     name: 'Cinder Slash', suit: 'flame', cost: 2, power: 5,  text: 'Deal 5 damage.' },
  { id: 'wildfire',  name: 'Wildfire',     suit: 'flame', cost: 3, power: 8,  text: 'Deal 8 damage.' },
  { id: 'phoenix',   name: 'Phoenix Dive', suit: 'flame', cost: 4, power: 11, text: 'Deal 11 damage.' },
  { id: 'stonewall', name: 'Stonewall',    suit: 'stone', cost: 1, block: 4,  text: 'Gain 4 block.' },
  { id: 'aegis',     name: 'Granite Aegis',suit: 'stone', cost: 2, block: 7,  text: 'Gain 7 block.' },
  { id: 'bastion',   name: 'Bastion',      suit: 'stone', cost: 3, block: 11, text: 'Gain 11 block.' },
  { id: 'thorn',     name: 'Thornbloom',   suit: 'bloom', cost: 1, heal: 4,   text: 'Restore 4 Ember.' },
  { id: 'lifespring',name: 'Lifespring',   suit: 'bloom', cost: 2, heal: 7,   text: 'Restore 7 Ember.' },
  { id: 'sunpetal',  name: 'Sunpetal',     suit: 'bloom', cost: 3, heal: 10,  text: 'Restore 10 Ember.' },
  { id: 'gust',      name: 'Gale Gust',    suit: 'gale',  cost: 2, power: 3, draw: 1, text: 'Deal 3 damage. Draw 1 card.' },
  { id: 'stormcall', name: 'Stormcall',    suit: 'gale',  cost: 3, power: 5, draw: 2, text: 'Deal 5 damage. Draw 2 cards.' },
];

export const MAX_LIFE = 24;
export const MAX_MANA = 8;
export const START_HAND = 4;
export const MAX_HAND = 8;

/** Two copies of every design make one 24-card deck. */
export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) deck.push({ ...def }, { ...def });
  return deck;
}

/** Fisher–Yates shuffle driven by an injected random source, so a seeded
    run deals the same cards every time (used by the ?shot= demo states). */
export function shuffle(deck, rand) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Tiny mulberry32 PRNG: one seed, one reproducible game. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The headline number a card shows: damage, block or healing, whichever
    it does — so a card reads at a glance even shrunk to a thumbnail. */
export function cardHeadline(card) {
  if (card.power) return { value: card.power, kind: 'damage' };
  if (card.block) return { value: card.block, kind: 'block' };
  return { value: card.heal, kind: 'heal' };
}
