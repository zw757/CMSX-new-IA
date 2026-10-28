import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { prepare, root } from './scripts/prepare.mjs';

await prepare();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const generated = /^\/(reference\/|sources\/|inventory\.json$)/.test(path);
    const base = generated ? join(root, '.generated') : root;
    const file = resolve(base, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${base}/`) || (!generated && !['index.html', 'app.js', 'content.js', 'styles.css', 'preview.js'].includes(path.slice(1) || 'index.html'))) throw new Error('Not found');
    if (!(await stat(file)).isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
});
server.listen(5001, '127.0.0.1', () => console.log('CMSX design system: http://127.0.0.1:5001/'));
