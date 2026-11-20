import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
await mkdir(out, { recursive: true });
await cp(join(here, 'game'), join(out, 'game'), { recursive: true });

const captures = join(here, 'screenshots');
const hasCaptures = await stat(captures).then(s => s.isDirectory(), (error: NodeJS.ErrnoException) => {
  if (error.code !== 'ENOENT') throw error;
  return false;
});
if (hasCaptures) await cp(captures, join(out, 'screenshots'), { recursive: true });

const dossier = await buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});
await writeFile(join(out, 'dossier.json'), JSON.stringify(dossier));
