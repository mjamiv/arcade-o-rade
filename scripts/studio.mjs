import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const base = '/arcade-o-rade/';
const statuses = ['draft', 'prototype', 'alpha', 'beta', 'released'];
export function validateGame(game, folder) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug ?? '') ||
    game.slug !== folder
  )
    throw new Error(`${folder}: slug must match its kebab-case folder name`);
  for (const key of ['title', 'description']) {
    if (typeof game[key] !== 'string' || !game[key].trim())
      throw new Error(`${folder}: ${key} is required`);
  }
  if (!statuses.includes(game.status))
    throw new Error(`${folder}: invalid status`);
  if (
    !Array.isArray(game.controls) ||
    !game.controls.length ||
    game.controls.some(
      (c) => !['keyboard', 'mouse', 'touch', 'gamepad'].includes(c),
    )
  )
    throw new Error(`${folder}: declare supported controls`);
  return {
    slug: game.slug,
    title: game.title,
    description: game.description,
    status: game.status,
    controls: game.controls,
  };
}
export async function readGames() {
  const entries = await readdir(path.join(root, 'games'), {
    withFileTypes: true,
  });
  const games = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const dir = path.join(root, 'games', entry.name);
    const game = validateGame(
      JSON.parse(await readFile(path.join(dir, 'game.json'), 'utf8')),
      entry.name,
    );
    const pkg = JSON.parse(
      await readFile(path.join(dir, 'package.json'), 'utf8'),
    );
    if (
      pkg.name !== `@arcade-o-rade/${game.slug}` ||
      !pkg.scripts?.build ||
      !pkg.scripts?.typecheck
    )
      throw new Error(
        `${game.slug}: expected named workspace with build and typecheck scripts`,
      );
    for (const file of ['README.md', 'DESIGN.md', 'ASSETS.md']) {
      if (!existsSync(path.join(dir, file)))
        throw new Error(`${game.slug}: missing ${file}`);
    }
    games.push(game);
  }
  return games;
}
async function catalog(games) {
  await mkdir(path.join(root, 'apps/arcade/public'), { recursive: true });
  await writeFile(
    path.join(root, 'apps/arcade/public/catalog.json'),
    JSON.stringify(
      games.filter((g) => g.status !== 'draft'),
      null,
      2,
    ) + '\n',
  );
}
function npm(args) {
  execFileSync('npm', args, { cwd: root, stdio: 'inherit' });
}
async function build() {
  const games = await readGames();
  await catalog(games);
  // This is generated output only, never source files.
  await rm(path.join(root, 'dist'), { recursive: true, force: true });
  npm([
    'run',
    'build',
    '--workspace=@arcade-o-rade/arcade',
    '--',
    '--base',
    base,
  ]);
  await cp(path.join(root, 'apps/arcade/dist'), path.join(root, 'dist'), {
    recursive: true,
  });
  for (const game of games) {
    // Compile drafts for CI, but never include them in the public deployment.
    npm([
      'run',
      'build',
      `--workspace=@arcade-o-rade/${game.slug}`,
      '--',
      '--base',
      `${base}games/${game.slug}/`,
    ]);
    if (game.status !== 'draft')
      await cp(
        path.join(root, 'games', game.slug, 'dist'),
        path.join(root, 'dist/games', game.slug),
        { recursive: true },
      );
  }
  await writeFile(path.join(root, 'dist/.nojekyll'), '');
  await writeFile(
    path.join(root, 'dist/404.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Game not found · Arcade-o-Rade</title><body style="background:#111719;color:#edf0df;font-family:system-ui;padding:10%"><h1>This cabinet is empty.</h1><p>That page may have moved.</p><a style="color:#d7f66f" href="${base}">Back to the arcade</a></body></html>`,
  );
}
async function createGame(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? ''))
    throw new Error(
      'Usage: npm run new:game -- my-game (lowercase kebab-case)',
    );
  if (['arcade'].includes(slug))
    throw new Error('That name is reserved for the studio workspace');
  const dir = path.join(root, 'games', slug);
  if (existsSync(dir))
    throw new Error(`${slug} already exists; nothing changed`);
  const title = slug
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ');
  await mkdir(path.join(dir, 'src'), { recursive: true });
  const files = {
    'package.json':
      JSON.stringify(
        {
          name: `@arcade-o-rade/${slug}`,
          version: '0.0.0',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite --host 127.0.0.1',
            build: 'vite build',
            typecheck: 'tsc -p tsconfig.json',
          },
        },
        null,
        2,
      ) + '\n',
    'game.json':
      JSON.stringify(
        {
          slug,
          title,
          description: 'Game concept pending.',
          status: 'draft',
          controls: ['keyboard'],
        },
        null,
        2,
      ) + '\n',
    'tsconfig.json':
      JSON.stringify(
        { extends: '../../tsconfig.base.json', include: ['src'] },
        null,
        2,
      ) + '\n',
    'index.html': `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p id="status">Studio scaffold — not a playable game yet.</p></main><script type="module" src="/src/main.ts"></script></body></html>\n`,
    'src/main.ts': `// Pick the engine and implement the approved vertical slice after DESIGN.md is agreed.\nimport './style.css';\n`,
    'src/style.css':
      'body { margin: 0; padding: 3rem; font-family: system-ui, sans-serif; color: #edf0df; background: #111719; }\n',
    'README.md': `# ${title}\n\nStatus: design pending. This is a scaffold, not a game.\n\nRun from the repo root: \n\n\`\`\`sh\nnpm run dev --workspace=@arcade-o-rade/${slug}\n\`\`\`\n\n- [Game design](DESIGN.md)\n- [Asset register](ASSETS.md)\n\nProduction URL after publishing: ${base}games/${slug}/\n`,
    'DESIGN.md': await readFile(
      path.join(root, 'docs/templates/GAME-DESIGN.md'),
      'utf8',
    ),
    'ASSETS.md': await readFile(
      path.join(root, 'docs/templates/ASSET-REGISTER.md'),
      'utf8',
    ),
  };
  for (const [file, content] of Object.entries(files))
    await writeFile(path.join(dir, file), content);
  console.log(
    `Created games/${slug}. Next: npm install, npm run format, then fill out DESIGN.md. Drafts are not deployed.`,
  );
}
async function main() {
  switch (process.argv[2]) {
    case 'new':
      await createGame(process.argv[3]);
      break;
    case 'validate':
      console.log(`Validated ${(await readGames()).length} game workspaces.`);
      break;
    case 'catalog':
      await catalog(await readGames());
      break;
    case 'build':
      await build();
      break;
    default:
      throw new Error('Expected new, validate, catalog, or build');
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
