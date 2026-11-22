/* Emberfall — the table's conductor. It boots the game, wires clicks and
   keys, runs the Warden's turn, and stages the four screenshot states the
   maker needs (?shot=title | play | win | loss). */

import { newGame, playCard, canPlay, endPlayerTurn, startPlayerTurn, startAiTurn, forceWin, PHASES } from './state.js';
import { renderGame, showTitle, showEnd, hideOverlay, floatText } from './render.js';
import { runAiTurn } from './ai.js';
import { sfx, setMuted, isMuted } from './audio.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');           // title | play | win | loss
const SEED = Number(params.get('seed') || 7);
if (SHOT) document.body.classList.add('no-anim');

let game = null;
let aiBusy = false;

const handlers = {
  onPlayCard(index) { tryPlay(index); },
};

function tryPlay(index) {
  if (!game || game.phase !== PHASES.PLAYER || aiBusy) return;
  if (!canPlay(game, index)) { sfx.error(); return; }
  const card = game.you.hand[index];
  const foeLifeBefore = game.foe.life;
  const youLifeBefore = game.you.life;
  playCard(game, 'you', index);
  if (card.power) { sfx.hit(); floatText('foe', `-${Math.max(0, foeLifeBefore - game.foe.life)}`, 'damage'); }
  else if (card.heal) { sfx.heal(); floatText('you', `+${Math.max(0, game.you.life - youLifeBefore)}`, 'heal'); }
  else if (card.block) { sfx.block(); floatText('you', `+${card.block} 🛡`, 'block'); }
  else sfx.play();
  afterAction();
}

function afterAction() {
  renderGame(game, handlers);
  if (game.phase === PHASES.WON) { sfx.win(); showEnd(game, restart); }
  else if (game.phase === PHASES.LOST) { sfx.lose(); showEnd(game, restart); }
}

function onEndTurn() {
  if (!game || game.phase !== PHASES.PLAYER || aiBusy) return;
  aiBusy = true;
  sfx.turn();
  endPlayerTurn(game);
  startAiTurn(game);
  renderGame(game, handlers);
  runAiTurn(
    game,
    () => { sfx.play(); renderGame(game, handlers); },
    () => {
      aiBusy = false;
      if (game.phase === PHASES.WON) { sfx.win(); showEnd(game, restart); renderGame(game, handlers); return; }
      if (game.phase === PHASES.LOST) { sfx.lose(); showEnd(game, restart); renderGame(game, handlers); return; }
      startPlayerTurn(game);
      sfx.turn();
      renderGame(game, handlers);
    },
  );
}

function restart() {
  hideOverlay();
  game = newGame();
  aiBusy = false;
  renderGame(game, handlers);
  sfx.deal();
}

function begin() {
  hideOverlay();
  game = newGame();
  renderGame(game, handlers);
  sfx.deal();
}

/* ---------- wiring ---------- */

document.getElementById('end-turn').addEventListener('click', onEndTurn);
document.getElementById('restart').addEventListener('click', restart);
document.getElementById('mute').addEventListener('click', (e) => {
  setMuted(!isMuted());
  e.currentTarget.textContent = isMuted() ? 'Sound: Off' : 'Sound: On';
  e.currentTarget.setAttribute('aria-pressed', String(isMuted()));
});
document.getElementById('overlay-button').addEventListener('click', () => {
  if (game && (game.phase === PHASES.WON || game.phase === PHASES.LOST)) restart();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!game) { begin(); return; }
    if (game.phase === PHASES.WON || game.phase === PHASES.LOST) { restart(); return; }
    onEndTurn();
    return;
  }
  if (e.key >= '1' && e.key <= '9') {
    const index = Number(e.key) - 1;
    if (game && index < game.you.hand.length) tryPlay(index);
  }
  if (e.key === 'r' || e.key === 'R') restart();
});

/* ---------- boot: a live game, or one staged screenshot state ---------- */

function stageShot(shot) {
  if (shot === 'title') {
    game = null;
    showTitle(begin);
    return;
  }
  // A mid-duel table: a few rounds in, both sides bloodied, cards in play.
  game = newGame(SEED);
  game.you.mana = 8; game.you.maxMana = 8;
  game.foe.mana = 8; game.foe.maxMana = 8;
  if (shot === 'play') {
    const firstDamage = (hand) => hand.findIndex((c) => c.power);
    playCard(game, 'you', firstDamage(game.you.hand));
    playCard(game, 'foe', firstDamage(game.foe.hand));
    playCard(game, 'you', firstDamage(game.you.hand));
    game.you.mana = 3;
    game.you.life = 19; game.foe.life = 16;
    renderGame(game, handlers);
    return;
  }
  if (shot === 'win') {
    game.foe.life = 2;
    const i = game.you.hand.findIndex((c) => c.power >= 2);
    if (i >= 0) playCard(game, 'you', i);
    if (game.phase !== PHASES.WON) { game.foe.life = 0; forceWin(game, 'you'); }
    renderGame(game, handlers);
    showEnd(game, restart);
    return;
  }
  if (shot === 'loss') {
    game.you.life = 3;
    const i = game.foe.hand.findIndex((c) => c.power >= 3);
    if (i >= 0) playCard(game, 'foe', i);
    if (game.phase !== PHASES.LOST) { game.you.life = 0; forceWin(game, 'foe'); }
    renderGame(game, handlers);
    showEnd(game, restart);
    return;
  }
  renderGame(game, handlers);
}

if (SHOT) stageShot(SHOT);
else {
  showTitle(begin);
  // Paint an empty table behind the title overlay so the first frame is
  // never a blank page.
  game = newGame();
  renderGame(game, handlers);
}
