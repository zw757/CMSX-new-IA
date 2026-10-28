import { readFile, readdir, mkdir, cp, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const product = resolve(root, '..');
export async function prepare(destination = join(root, '.generated'), { hosted = false } = {}) {
  await mkdir(join(destination, 'reference'), { recursive: true });
  await mkdir(join(destination, 'sources'), { recursive: true });
  const files = (await readdir(product)).filter(f => /\.(html|css|js|jsx|mjs|md)$/.test(f) && !f.endsWith('.test.mjs'));
  files.push('public/theme-init.js');
  const sources = {};
  const pages = [];
  for (const file of files) {
    const text = await readFile(join(product, file), 'utf8');
    sources[file] = { lines: text.split('\n').length };
    await mkdir(dirname(join(destination, 'sources', `${file}.txt`)), { recursive: true });
    await writeFile(join(destination, 'sources', `${file}.txt`), text);
    if (file.endsWith('.css') || ['cmsx-select.js', 'sidebar.js'].includes(file)) {
      await cp(join(product, file), join(destination, 'reference', file));
    }
    if (file.endsWith('.html')) pages.push({ file, title: text.match(/<title>(.*?)<\/title>/s)?.[1], headings: [...text.matchAll(/<h[123][^>]*>(.*?)<\/h[123]>/gs)].map(m => m[1].replace(/<[^>]*>/g, '').trim()) });
    if (file.endsWith('.html') && text.includes('<style>')) await writeFile(join(destination, 'reference', file.replace('.html', '-inline.css')), [...text.matchAll(/<style[^>]*>(.*?)<\/style>/gs)].map(m => m[1]).join('\n'));
  }
  await cp(join(product, 'assets'), join(destination, 'reference/assets'), { recursive: true });
  await cp(join(product, 'cmsx-logo.svg'), join(destination, 'reference/cmsx-logo.svg'));
  const readTokens = text => Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
  const base = await readFile(join(product, 'styles.css'), 'utf8');
  const dark = await readFile(join(product, 'dark-theme.css'), 'utf8');
  const inventory = { hosted, pages, sources, tokens: readTokens(base.slice(base.indexOf(':root {'), base.indexOf('/* ============ RESET'))), darkTokens: readTokens(dark.slice(0, dark.indexOf('/* Shared shell'))) };
  await writeFile(join(destination, 'inventory.json'), JSON.stringify(inventory, null, 2));
  return inventory;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const build = process.argv.includes('--build');
  const destination = join(root, build ? 'dist' : '.generated');
  const inventory = await prepare(destination, { hosted: build });
  if (build) for (const file of ['index.html', 'app.js', 'content.js', 'styles.css', 'preview.js']) await cp(join(root, file), join(destination, file));
  console.log(`${build ? 'Built dist' : 'Prepared references'}: ${inventory.pages.length} product pages, ${Object.keys(inventory.sources).length} source files. Product files were read only.`);
}
