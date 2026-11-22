/* Emberfall — tiny synthesized sound effects. No audio files: every blip
   is an oscillator, so the game stays a handful of static files. */

let ctx = null;
let muted = false;

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One short tone: frequency, length, shape, and how loud. */
function blip(freq, dur, type = 'sine', vol = 0.08, when = 0) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  deal() { blip(520, 0.09, 'triangle', 0.05); blip(780, 0.07, 'triangle', 0.04, 0.06); },
  play() { blip(660, 0.1, 'square', 0.045); blip(880, 0.12, 'square', 0.04, 0.07); },
  hit() { blip(180, 0.16, 'sawtooth', 0.07); blip(120, 0.2, 'sawtooth', 0.06, 0.05); },
  heal() { blip(523, 0.14, 'sine', 0.06); blip(784, 0.18, 'sine', 0.05, 0.09); },
  block() { blip(300, 0.12, 'triangle', 0.06); },
  turn() { blip(440, 0.08, 'sine', 0.05); },
  win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.07, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.26, 'sine', 0.06, i * 0.15)); },
  error() { blip(140, 0.12, 'square', 0.05); },
};
