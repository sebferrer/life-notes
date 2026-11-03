// Minimal static server for the production build (www), used by the Playwright tests.
// Usage: node tests/support/serve.mjs [port]
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize, resolve } from 'path';

const root = resolve('www');
const port = Number(process.argv[2] || 4300);
const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf'
};

createServer(async (request, response) => {
	const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
	const file = normalize(join(root, path === '/' ? 'index.html' : path));
	if (!file.startsWith(root)) {
		response.writeHead(403).end();
		return;
	}
	try {
		const content = await readFile(file);
		response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
		response.end(content);
	} catch {
		response.writeHead(404).end();
	}
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
