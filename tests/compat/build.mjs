// Builds the two versions compared by the compatibility tests (see tests/compat/README.md):
// - V1: the published version, from a git ref (default: the commit of the 0.3.7, the version on the phones), extracted
//   with "git archive" (the repository and its working tree are left untouched)
// - V2: the current working tree
// Usage: node tests/compat/build.mjs [--prod] [--skip-v2]
// Env: COMPAT_V1_REF (git ref of the V1), COMPAT_DIR (where the sources and builds go, default: temp dir)
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const repo = resolve('.');
const prod = process.argv.includes('--prod');
const skipV2 = process.argv.includes('--skip-v2');
// The commit of the published 0.3.7 (origin/master before the V2): not "master", which becomes the V2 once merged.
// Same value as PUBLISHED_V1_SHA in support/builds.ts
const v1Ref = process.env.COMPAT_V1_REF || '17071de5bf5a7d0c3cd88226934f93fc0a5f927e';
const root = resolve(process.env.COMPAT_DIR || join(tmpdir(), 'life-notes-compat'));
const mode = prod ? 'prod' : 'dev';

function git(...args) {
	return execFileSync('git', args, { cwd: repo, encoding: 'utf-8' }).trim();
}

function ngBuild(cwd, outputPath) {
	const args = [join(repo, 'node_modules/@angular/cli/bin/ng'), 'build', `--output-path=${outputPath}`];
	if (prod) {
		args.push('--prod');
	}
	console.log(`> ng build ${prod ? '--prod ' : ''}(${cwd}) -> ${outputPath}`);
	execFileSync(process.execPath, args, {
		cwd,
		stdio: 'inherit',
		env: { ...process.env, NODE_OPTIONS: '--openssl-legacy-provider', NG_CLI_ANALYTICS: 'false' }
	});
}

function versionOf(source) {
	return /CURRENT_VERSION = "([^"]+)"/.exec(source)[1];
}

mkdirSync(root, { recursive: true });
const v1Sha = git('rev-parse', v1Ref);
const v1Source = join(root, `v1-src-${v1Sha.slice(0, 10)}`);
const v1Build = join(root, `v1-${mode}-${v1Sha.slice(0, 10)}`);

// V1: extracted once per commit, built once per commit and mode
if (!existsSync(join(v1Build, 'index.html'))) {
	if (!existsSync(join(v1Source, 'angular.json'))) {
		rmSync(v1Source, { recursive: true, force: true });
		mkdirSync(v1Source, { recursive: true });
		// Relative paths: the tar of Git for Windows takes "C:" for a remote host
		const archive = 'v1-source.tar';
		git('archive', '--format=tar', '-o', join(v1Source, archive), v1Sha);
		execFileSync('tar', ['-xf', archive], { cwd: v1Source });
		rmSync(join(v1Source, archive));
	}
	// The dependencies of the V1 are a subset of the current ones, at the same versions (see the lock files)
	if (!existsSync(join(v1Source, 'node_modules'))) {
		symlinkSync(join(repo, 'node_modules'), join(v1Source, 'node_modules'), 'junction');
	}
	ngBuild(v1Source, v1Build);
} else {
	console.log(`V1 ${v1Sha.slice(0, 10)} (${mode}) already built: ${v1Build}`);
}

const v2Build = join(root, `v2-${mode}`);
if (!skipV2) {
	rmSync(v2Build, { recursive: true, force: true });
	ngBuild(repo, v2Build);
}

const v1Version = versionOf(git('show', `${v1Sha}:src/app/infra/settings.service.ts`));
const v2Version = versionOf(readFileSync(join(repo, 'src/app/infra/settings.service.ts'), 'utf-8'));
const info = {
	mode,
	v1: { ref: v1Ref, sha: v1Sha, version: v1Version, www: v1Build },
	v2: { ref: 'working tree', sha: git('rev-parse', 'HEAD'), version: v2Version, www: v2Build }
};
writeFileSync(join(root, `builds-${mode}.json`), JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
