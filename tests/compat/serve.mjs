// Static server of the two builds of tests/compat/build.mjs, on a single origin: the "ln_build" cookie (v1 or v2,
// default v2) chooses the build of each request. As on a phone, the database (IndexedDB) of a page is kept when the
// app is replaced by the other version: switching the cookie and reloading is an update (or a rollback) of the app.
// Usage: node tests/compat/serve.mjs <port> <builds.json>
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { extname, join, normalize, resolve } from 'path';

const port = Number(process.argv[2] || 4310);
const builds = JSON.parse(readFileSync(process.argv[3], 'utf-8'));
const roots = { v1: resolve(builds.v1.www), v2: resolve(builds.v2.www) };
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

function buildOf(request) {
	const match = /(?:^|;\s*)ln_build=(v1|v2)/.exec(request.headers.cookie || '');
	return match ? match[1] : 'v2';
}

createServer(async (request, response) => {
	const root = roots[buildOf(request)];
	const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
	const file = normalize(join(root, path === '/' ? 'index.html' : path));
	if (!file.startsWith(root)) {
		response.writeHead(403).end();
		return;
	}
	try {
		const content = await readFile(file);
		// Never cached: the same URL serves the V1 or the V2
		response.writeHead(200, {
			'Content-Type': types[extname(file)] || 'application/octet-stream',
			'Cache-Control': 'no-store'
		});
		response.end(content);
	} catch {
		response.writeHead(404).end();
	}
}).listen(port, () => console.log(`Serving V1 ${roots.v1} and V2 ${roots.v2} on http://localhost:${port}`));
