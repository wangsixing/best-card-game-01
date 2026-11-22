// Emberfall — the entrypoint for make.fun's best-card-game bounty.
// Node 22, standard library only. It hands the game in: game/ and
// screenshots/ are copied from beside this file into the output directory
// (/output on the grader, MAKEFUN_OUTPUT_DIR anywhere else), and
// dossier.json is written there with the vendored make.fun library, so the
// judge can read the game and its screenshots.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the gate's own limits: at most 4 screenshots of 256 KiB,
// game/ under 993 files and 48 MiB, paths under 1000 bytes — so an entry
// this program writes is one the gate accepts.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
