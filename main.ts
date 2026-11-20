import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const bundleDirectory = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
mkdirSync(bundleDirectory, { recursive: true });

for (const directoryName of ['game', 'screenshots']) {
  const from = resolve(projectDirectory, directoryName);
  const to = resolve(bundleDirectory, directoryName);
  if (existsSync(from) && from !== to) {
    cpSync(from, to, { recursive: true, force: true });
  }
}

const dossierContents = buildDossier(bundleDirectory, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(resolve(bundleDirectory, 'dossier.json'), dossierContents);
console.log(`Palmshade game bundle prepared at ${bundleDirectory}`);
