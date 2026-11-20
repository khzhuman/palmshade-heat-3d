import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
mkdirSync(outputRoot, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  const source = resolve(sourceRoot, folder);
  const destination = resolve(outputRoot, folder);
  if (existsSync(source) && source !== destination) {
    cpSync(source, destination, { recursive: true, force: true });
  }
}
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(resolve(outputRoot, 'dossier.json'), dossier);
console.log(`Palmshade game bundle prepared at ${outputRoot}`);
