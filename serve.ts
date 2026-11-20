import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('./game/', import.meta.url)));
const arg = process.argv.indexOf('--port');
const port = Number(arg < 0 ? process.argv.find(a => a.startsWith('--port='))?.slice(7) ?? 8080 : process.argv[arg + 1]);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wasm': 'application/wasm'
};

createServer(async (req, res) => {
  const missing = () => res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  if (req.method !== 'GET' && req.method !== 'HEAD') { missing(); return; }
  try {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!path.startsWith('/') || path.includes('\0') || path.includes('\\')) { missing(); return; }
    const candidate = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!candidate.startsWith(root + sep)) { missing(); return; }
    const file = await realpath(candidate);
    const info = await stat(file);
    if (!file.startsWith(root + sep) || !info.isFile()) { missing(); return; }
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).on('error', error => res.destroy(error)).pipe(res);
  } catch { missing(); }
}).listen(port, () => console.log('Palmshade is serving at http://localhost:' + port));
