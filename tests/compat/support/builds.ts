import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// The commit of the published 0.3.7, the V1 on the phones (default V1 of tests/compat/build.mjs)
export const PUBLISHED_V1_SHA = '17071de5bf5a7d0c3cd88226934f93fc0a5f927e';

export const COMPAT_PORT = Number(process.env.COMPAT_PORT || 4310);
export const COMPAT_URL = `http://localhost:${COMPAT_PORT}`;

// Same defaults as tests/compat/build.mjs. COMPAT_BUILDS: another builds file (e.g. a V2 with a fault injected on
// purpose, to check that the tests catch it)
export function compatBuildsFile(): string {
	if (process.env.COMPAT_BUILDS) {
		return resolve(process.env.COMPAT_BUILDS.trim());
	}
	const root = resolve(process.env.COMPAT_DIR || join(tmpdir(), 'life-notes-compat'));
	// trim: "set COMPAT_MODE=prod && ..." (npm scripts on Windows) keeps the space before &&
	return join(root, `builds-${(process.env.COMPAT_MODE || '').trim() === 'prod' ? 'prod' : 'dev'}.json`);
}

export interface BuildInfo {
	mode: string;
	v1: { ref: string, sha: string, version: string, www: string };
	v2: { ref: string, sha: string, version: string, www: string };
}

export function readBuilds(): BuildInfo {
	return JSON.parse(readFileSync(compatBuildsFile(), 'utf-8'));
}
