import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prepare, product } from './prepare.mjs';
import { docs, coverage, examples, groups, issues } from '../content.js';

const inventory = await prepare();
const ids = new Set(docs.map(d => d.id));
assert.equal(ids.size, docs.length, 'Documentation routes must be unique');
const actualPages = inventory.pages.map(p => p.file).sort();
assert.deepEqual(coverage.map(p => p[0]).sort(), actualPages, 'Every product entry page must be covered exactly once');
for (const d of docs) {
  assert(groups.some(g => d.id.startsWith(`${g.id}/`)), `Unknown group: ${d.id}`);
  if (d.preview) assert(examples[d.preview], `Missing example: ${d.preview}`);
  for (const source of d.sources) assert(inventory.sources[source], `Missing source: ${source}`);
  for (const id of d.related) assert(ids.has(id), `Missing related page: ${id}`);
  for (const id of d.notes) assert(issues[id], `Missing review note: ${id}`);
  for (const step of d.steps || []) assert(ids.has(step[2]), `Missing step component: ${step[2]}`);
}
for (const row of coverage) {
  for (const id of row[3]) assert(ids.has(`components/${id}`), `Missing component: ${id}`);
  for (const id of row[4]) assert(ids.has(`patterns/${id}`), `Missing pattern: ${id}`);
}
for (const note of Object.values(issues)) for (const source of note.sources) assert(inventory.sources[source], `Missing note source: ${source}`);
for (const example of Object.values(examples)) {
  for (const asset of example.html.matchAll(/\.\/reference\/(assets\/[^" ]+)/g)) await access(join(product, asset[1]));
  for (const file of example.css || []) if (!file.endsWith('-inline.css')) await access(join(product, file));
}
assert.equal(inventory.tokens['--primary'], '#006699');
assert.equal(inventory.darkTokens['--primary'], '#4daafc');
assert.equal(inventory.tokens['--font-size-body'], '1rem');
for (const file of ['app.js', 'preview.js', 'content.js']) {
  const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert(!/localStorage\.(setItem|removeItem|clear)/.test(text), 'Documentation must not mutate product storage');
}
console.log(`Verified ${docs.length} documentation pages, ${actualPages.length} product pages, all catalog links, source references, example assets, and shared token values.`);
