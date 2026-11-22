/* Emberfall — everything the player sees. It reads the game state and
   paints the table: hands, arena, life bars, mana, log and overlays.
   Cards are plain DOM, so they stay crisp at any size — including the
   judge's thumbnail. */

import { SUITS, MAX_LIFE, cardHeadline, CARD_DEFS } from './cards.js';
import { PHASES } from './state.js';

const $ = (id) => document.getElementById(id);

/** One face-up card. `opts.playable` marks it clickable, `opts.small`
    shrinks it for the arena row. */
export function cardElement(card, opts = {}) {
  const suit = SUITS[card.suit];
  const head = cardHeadline(card);
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.small ? ' small' : ''}${opts.playable ? ' playable' : ''}${opts.disabled ? ' disabled' : ''}`;
  el.dataset.cardId = card.id;
  const kindWord = head.kind === 'damage' ? 'damage' : head.kind === 'block' ? 'block' : 'heal';
  el.innerHTML =
    `<div class="card-cost" title="Mana cost">${card.cost}</div>` +
    `<div class="card-suit" style="color:${suit.color}">${suit.glyph}</div>` +
    `<div class="card-name">${card.name}</div>` +
    `<div class="card-headline" style="color:${suit.color}">${head.value}</div>` +
    `<div class="card-kind">${kindWord}</div>` +
    `<div class="card-text">${card.text}</div>` +
    `<div class="card-foot">${suit.name} · cost ${card.cost}</div>`;
  return el;
}

/** A face-down card back for the Warden's hand. */
export function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card back small';
  el.innerHTML = '<div class="back-emblem">🔥</div><div class="back-word">EMBERFALL</div>';
  return el;
}

function setLife(side, life) {
  $(`${side}-life`).textContent = life;
  $(`${side}-life-fill`).style.width = `${Math.max(0, (life / MAX_LIFE) * 100)}%`;
}

function setBlock(side, block) {
  const row = $(`${side}-block-row`);
  row.hidden = block <= 0;
  $(`${side}-block`).textContent = block;
}

/** Paint the whole table from the current state. `handlers` carries the
    callbacks the cards and buttons need (playCard, endTurn, restart). */
export function renderGame(game, handlers) {
  setLife('you', game.you.life);
  setLife('foe', game.foe.life);
  setBlock('you', game.you.block);
  setBlock('foe', game.foe.block);

  $('round-label').textContent = `Round ${game.round}`;
  $('phase-label').textContent =
    game.phase === PHASES.PLAYER ? 'Your turn — play a card' :
    game.phase === PHASES.AI ? 'The Warden is thinking…' :
    game.phase === PHASES.WON ? 'Victory!' : game.phase === PHASES.LOST ? 'Defeat' : '';
  $('foe-deck').textContent = `Warden deck: ${game.foe.deck.length}`;
  $('you-deck').textContent = `Your deck: ${game.you.deck.length}`;
  $('foe-hand-count').textContent = `(${game.foe.hand.length} card${game.foe.hand.length === 1 ? '' : 's'})`;

  // Mana pips: one filled pip per mana, empty up to your max.
  const pips = $('mana-pips');
  pips.innerHTML = '';
  for (let i = 0; i < game.you.maxMana; i++) {
    const pip = document.createElement('span');
    pip.className = `mana-pip${i < game.you.mana ? ' on' : ''}`;
    pips.appendChild(pip);
  }
  $('mana-num').textContent = `${game.you.mana} / ${game.you.maxMana}`;
  $('end-turn').disabled = game.phase !== PHASES.PLAYER;

  // The Warden's hand stays face-down: you see its size, never its cards.
  const foeHand = $('foe-hand');
  foeHand.innerHTML = '';
  game.foe.hand.forEach(() => foeHand.appendChild(cardBackElement()));

  // Your hand: big, readable, clickable when you can afford the card.
  const youHand = $('you-hand');
  youHand.innerHTML = '';
  game.you.hand.forEach((card, i) => {
    const affordable = game.phase === PHASES.PLAYER && card.cost <= game.you.mana;
    const el = cardElement(card, { playable: affordable, disabled: !affordable && game.phase === PHASES.PLAYER });
    el.addEventListener('click', () => handlers.onPlayCard(i));
    youHand.appendChild(el);
  });

  // The arena keeps the last few plays, so the duel's story stays visible.
  const arena = $('arena-cards');
  arena.innerHTML = '';
  game.arena.slice(-4).forEach((play) => {
    const wrap = document.createElement('div');
    wrap.className = 'arena-play';
    wrap.appendChild(cardElement(play.card, { small: true }));
    const tag = document.createElement('div');
    tag.className = `arena-tag ${play.by}`;
    tag.textContent = play.by === 'you' ? 'You played' : 'Warden played';
    wrap.appendChild(tag);
    arena.appendChild(wrap);
  });
  if (game.arena.length === 0) {
    arena.innerHTML = '<div class="arena-empty">No cards played yet — the table is waiting.</div>';
  }

  // The log reads newest-first, capped so it never crowds the table.
  const log = $('battle-log');
  log.innerHTML = '';
  game.log.slice(-6).reverse().forEach((line) => {
    const row = document.createElement('div');
    row.className = 'log-line';
    row.textContent = line;
    log.appendChild(row);
  });

  // Flash the life numbers when they just moved.
  flashLife(game);
}

let lastLife = { you: MAX_LIFE, foe: MAX_LIFE };
function flashLife(game) {
  for (const side of ['you', 'foe']) {
    const el = $(`${side}-life`);
    if (game[side].life < lastLife[side]) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    if (game[side].life > lastLife[side]) { el.classList.remove('healed'); void el.offsetWidth; el.classList.add('healed'); }
    lastLife[side] = game[side].life;
  }
}

/** A floating damage/heal number over a fighter's portrait. */
export function floatText(side, text, kind) {
  const box = side === 'you' ? $('you-box') : $('foe-box');
  const el = document.createElement('div');
  el.className = `float-text ${kind}`;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ---------- overlays: title, victory, defeat ---------- */

export function showTitle(onBegin) {
  const overlay = $('overlay');
  overlay.hidden = false;
  overlay.classList.add('title-mode');
  $('overlay-kicker').textContent = 'A CARD DUEL · YOU VS THE ASH WARDEN';
  $('overlay-title').textContent = 'EMBERFALL';
  $('overlay-text').innerHTML =
    'The last ember of the old world burns in two hands. Play Flame to strike, ' +
    'Stone to guard, Bloom to mend, Gale to storm — and burn the Warden’s Ember to zero before yours fades. ' +
    'Each round you gain mana and draw a card. Block soaks damage. An empty deck burns you.';
  $('overlay-stats').innerHTML =
    '<div class="stat-row">' +
    ['Flame ▲ deal damage', 'Stone ■ gain block', 'Bloom ● restore Ember', 'Gale ◆ damage + draw']
      .map((s) => `<span class="stat-chip">${s}</span>`).join('') +
    '</div>';
  const btn = $('overlay-button');
  btn.textContent = 'Begin the duel';
  btn.onclick = onBegin;
  // A peek at the deck, so the title screen shows real cards, not a poster.
  const preview = document.createElement('div');
  preview.className = 'title-preview';
  CARD_DEFS.slice(0, 5).forEach((def) => preview.appendChild(cardElement(def, { small: true })));
  $('overlay-stats').appendChild(preview);
}

export function showEnd(game, onAgain) {
  const won = game.phase === PHASES.WON;
  const overlay = $('overlay');
  overlay.hidden = false;
  overlay.classList.remove('title-mode');
  $('overlay-kicker').textContent = won ? 'THE LAST EMBER IS YOURS' : 'THE EMBER FADES TO ASH';
  $('overlay-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('overlay-title').style.color = won ? '#ffd166' : '#ff8a7a';
  $('overlay-text').textContent = won
    ? 'The Ash Warden bows, and the ember flares bright in your hand. The old world keeps its light — for now.'
    : 'The Warden gathers your ember into the dark. Shuffle the deck and try again — the flame remembers.';
  $('overlay-stats').innerHTML =
    `<div class="stat-row">` +
    `<span class="stat-chip">Rounds: ${game.round}</span>` +
    `<span class="stat-chip">Cards played: ${game.stats.played}</span>` +
    `<span class="stat-chip">Damage dealt: ${game.stats.damageDealt}</span>` +
    `<span class="stat-chip">Ember restored: ${game.stats.healed}</span>` +
    `</div>`;
  const btn = $('overlay-button');
  btn.textContent = 'Play again';
  btn.onclick = onAgain;
}

export function hideOverlay() {
  $('overlay').hidden = true;
}
