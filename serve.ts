import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'game');
const portArgument = process.argv.indexOf('--port');
const listenPort = portArgument < 0 ? 8080 : Number(process.argv[portArgument + 1]);
if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) {
  throw new Error('Expected --port followed by a port from 1 to 65535');
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (incoming, outgoing) => {
  if (incoming.method !== 'GET' && incoming.method !== 'HEAD') {
    outgoing.writeHead(405, { Allow: 'GET, HEAD' });
    outgoing.end();
    return;
  }
  try {
    const requestedPath = decodeURIComponent(new URL(incoming.url ?? '/', 'http://localhost').pathname);
    if (requestedPath.includes('\0') || requestedPath.includes('\\')) throw new Error('Invalid path');
    const resolvedPath = resolve(gameDirectory, '.' + (requestedPath === '/' ? '/index.html' : requestedPath));
    if (resolvedPath !== gameDirectory && !resolvedPath.startsWith(gameDirectory + sep)) throw new Error('Outside root');
    const actualPath = await realpath(resolvedPath);
    if (!actualPath.startsWith(gameDirectory + sep)) throw new Error('Outside root');
    const metadata = await stat(actualPath);
    if (!metadata.isFile()) throw new Error('Not a file');
    outgoing.writeHead(200, {
      'Content-Type': contentTypes[extname(actualPath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'no-cache',
    });
    if (incoming.method === 'HEAD') outgoing.end();
    else createReadStream(actualPath).on('error', () => outgoing.destroy()).pipe(outgoing);
  } catch {
    outgoing.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    outgoing.end('Not found');
  }
});

server.listen(listenPort, '0.0.0.0', () => console.log(`PALMSHADE HEAT 3D: http://localhost:${listenPort}`));
