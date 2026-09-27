import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGame } from './studio.mjs';

const game = {
  slug: 'moon-run',
  title: 'Moon Run',
  description: 'A lunar adventure.',
  status: 'prototype',
  controls: ['keyboard', 'touch'],
};
test('accepts valid game metadata and strips unrecognized fields', () => {
  assert.deepEqual(
    validateGame({ ...game, privateNotes: 'not public' }, 'moon-run'),
    game,
  );
});
test('rejects unsafe or mismatched paths', () => {
  for (const slug of [
    '../escape',
    'UpperCase',
    'with space',
    '',
    'other-game',
  ]) {
    assert.throws(() => validateGame({ ...game, slug }, 'moon-run'), /slug/);
  }
});
test('rejects missing descriptions, unknown statuses, and undeclared controls', () => {
  for (const change of [
    { description: '' },
    { title: null },
    { status: 'done-ish' },
    { controls: [] },
    { controls: ['telepathy'] },
  ]) {
    assert.throws(() => validateGame({ ...game, ...change }, 'moon-run'));
  }
});

test('scaffold builds at its own Pages URL and drafts never leak into deployment', async () => {
  const { mkdtemp, cp, symlink, mkdir, readFile, writeFile, rm } =
    await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { root } = await import('./studio.mjs');
  const temp = await mkdtemp(path.join(tmpdir(), 'arcade-studio-test-'));
  const run = (args) =>
    execFileSync(process.execPath, ['scripts/studio.mjs', ...args], {
      cwd: temp,
      stdio: 'pipe',
    });
  try {
    for (const file of [
      'package.json',
      'tsconfig.base.json',
      'scripts/studio.mjs',
      'docs/templates',
      'apps/arcade',
    ]) {
      await cp(path.join(root, file), path.join(temp, file), {
        recursive: true,
        filter: (source) =>
          !source.split(path.sep).includes('dist') &&
          !source.split(path.sep).includes('node_modules'),
      });
    }
    await mkdir(path.join(temp, 'games'));
    await symlink(
      path.join(root, 'node_modules'),
      path.join(temp, 'node_modules'),
      'dir',
    );
    run(['new', 'test-game']);
    assert.throws(() => run(['new', '../escape']));
    assert.throws(() => run(['new', 'test-game']));
    run(['build']);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(temp, 'dist/catalog.json'), 'utf8')),
      [],
    );
    await assert.rejects(
      readFile(path.join(temp, 'dist/games/test-game/index.html')),
      { code: 'ENOENT' },
    );
    const manifest = path.join(temp, 'games/test-game/game.json');
    const game = JSON.parse(await readFile(manifest, 'utf8'));
    await writeFile(manifest, JSON.stringify({ ...game, status: 'prototype' }));
    run(['build']);
    assert.equal(
      JSON.parse(
        await readFile(path.join(temp, 'dist/catalog.json'), 'utf8'),
      )[0].slug,
      'test-game',
    );
    const html = await readFile(
      path.join(temp, 'dist/games/test-game/index.html'),
      'utf8',
    );
    assert.match(html, /\/arcade-o-rade\/games\/test-game\/assets\//);
    await writeFile(manifest, JSON.stringify(game));
    run(['build']);
    await assert.rejects(
      readFile(path.join(temp, 'dist/games/test-game/index.html')),
      { code: 'ENOENT' },
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
