import { groups, docs, issues, coverage, examples } from './content.js';

const main = document.querySelector('#main');
const outline = document.querySelector('#page-outline');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = (id, label, cls = '') => `<a class="${cls}" href="#/${id}">${label || esc(docs.find(d => d.id === id)?.title || id)}</a>`;
const source = name => `<button type="button" class="source-link" data-source="${esc(name)}"><span aria-hidden="true">↗</span> ${esc(name)}</button>`;
const list = entries => `<ul class="guidance-list">${entries.map(s => `<li>${s}</li>`).join('')}</ul>`;
const section = (id, title, content, desc = '') => `<section class="doc-section" id="${id}"><div class="section-heading"><h2>${title}</h2></div>${desc ? `<p class="section-description">${desc}</p>` : ''}${content}</section>`;
let inventory;
let route = '';
let renderedPage = '';
let toastTimer;
let frameCount = 0;
const themes = new Map();
const coverageId = file => `page-${file.replace('.html', '')}`;
const productLink = (file, label) => inventory.hosted
  ? link(`coverage?section=${coverageId(file)}`, `${esc(label)} <span aria-hidden="true">→</span>`)
  : `<a href="http://127.0.0.1:5000/${file}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;

function toast(message) {
  const element = document.querySelector('#docs-toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2600);
}

function thumbnail(id) {
  const name = id.split('/').pop();
  const map = {
    color: '<div class="mini-swatches"><i></i><i></i><i></i><i></i><i></i></div>',
    typography: '<div class="mini-type">Aa<span>DM Sans · Six roles</span></div>',
    layout: '<div class="mini-layout"><i></i><div><b></b><b></b><span></span><span></span></div></div>',
    icons: '<div class="mini-icons"><img src="./reference/assets/assignments/edit.svg" alt="" /><img src="./reference/assets/assignments/calendar.svg" alt="" /><img src="./reference/assets/announcement-editor/attachment.svg" alt="" /></div>',
    accessibility: '<div class="mini-focus">Visible focus<span>Tab ↵</span></div>',
    buttons: '<div class="mini-buttons"><span class="btn btn-primary">Save changes</span><span class="btn btn-outlined">Cancel</span></div>',
    fields: '<div class="mini-field"><span>Assignment name</span><div>Assignment 3<i></i></div></div>',
    selection: '<div class="mini-selection"><span class="mini-check">✓</span><span class="mini-check empty"></span><span class="mini-switch"></span></div>',
    navigation: '<div class="mini-tabs"><span class="active">Announcements</span><span>Emails</span></div>',
    tables: '<div class="mini-table"><div><b>Student</b><b>Grade</b></div><div><span>Alex Chen</span><span>92</span></div><div><span>Jordan Lee</span><span>87</span></div></div>',
    status: '<div class="mini-badges"><span class="badge badge-success">Graded</span><span class="badge badge-primary">Open</span><span class="badge" style="background:#f1ecfa;color:#6543a1">Quiz</span></div>',
    cards: '<div class="mini-metric"><span>Students</span><strong>160</strong><i></i></div>',
    feedback: '<div class="mini-dialog"><strong>Review before saving</strong><span></span><div><i>Cancel</i><b>Save</b></div></div>',
    editor: '<div class="mini-editor"><div><b>B</b><i>I</i><u>U</u><span>↗</span></div><span></span><span></span></div>',
  };
  return `<div class="catalog-art art-${name}" aria-hidden="true">${map[name] || '<span class="pattern-symbol">↳</span>'}</div>`;
}

function card(doc) {
  return link(doc.id, `${thumbnail(doc.id)}<div class="catalog-copy"><h3>${doc.title}<span aria-hidden="true">↗</span></h3><p>${doc.description}</p></div>`, 'catalog-card');
}

function renderNavigation() {
  const nav = document.querySelector('#navigation');
  nav.innerHTML = `<div class="nav-intro">${link('overview', '<span class="nav-home" aria-hidden="true">⌂</span> Overview')}</div>${groups.map(g => `<div class="nav-group">${link(g.id, g.title, 'nav-group-title')}<div>${docs.filter(d => d.id.startsWith(`${g.id}/`)).map(d => link(d.id, d.title)).join('')}</div></div>`).join('')}<div class="nav-group nav-reference"><span class="nav-group-title">Reference</span>${link('coverage', 'Page coverage')}${link('review', `Review notes <span class="nav-count">${Object.keys(issues).length}</span>`)}</div>`;
  for (const a of nav.querySelectorAll('a')) if (a.hash === `#/${route}`) a.setAttribute('aria-current', 'page');
}

function pageHead(title, description, group = '', tag = '') {
  return `<div class="page-breadcrumb">${link('overview', 'Design system')}${group ? `<span>/</span>${link(group.toLowerCase(), group)}` : ''}<span>/</span><span>${title === 'CMSX Design System' ? 'Overview' : title}</span></div><div class="page-heading">${tag ? `<p class="eyebrow">${tag}</p>` : ''}<h1>${title}</h1><p class="page-description">${description}</p></div>`;
}

function preview(key, label = '') {
  const entry = examples[key];
  const frameId = `specimen-${++frameCount}`;
  return `<div class="specimen"><div class="specimen-toolbar"><span><span class="status-dot"></span>${label || 'Component preview'}</span><div class="theme-switch" role="group" aria-label="Preview theme"><button type="button" data-theme="light" data-frame="${frameId}" aria-pressed="true">Light</button><button type="button" data-theme="dark" data-frame="${frameId}" aria-pressed="false">Dark</button></div></div><iframe id="${frameId}" data-example="${key}" title="${esc(label || key)} example" sandbox="allow-scripts allow-same-origin" style="height:${entry.height}px"></iframe><div class="specimen-caption">${key === 'sidebar' ? 'Actual shared component · links stay inside this example' : entry.script === 'select' ? 'Product styles and select module · illustrative values' : 'Product styles · illustrative content and documentation-only interactions'}</div><details class="example-code" open><summary>Example HTML</summary><div class="example-code-actions"><span>Illustrative markup</span><button type="button" data-example-copy="${key}">Copy code</button></div><pre><code>${esc(entry.html.replaceAll('><', '>\n<'))}</code></pre></details></div>`;
}

function fillPreview(frame, theme = 'light') {
  const entry = examples[frame.dataset.example];
  themes.set(frame.id, theme);
  const css = ['styles.css', ...(entry.css || []), 'dark-theme.css'];
  frame.srcdoc = `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><base href="${new URL('./', location.href).href}"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(f => `<link rel="stylesheet" href="./reference/${f}">`).join('')}<style>
  body{padding:28px;background:var(--bg-page);min-height:0}body>*{min-width:0}.sample-row{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:24px}.sample-row>div{display:flex;flex-direction:column;align-items:flex-start;gap:12px}.sample-row small,.sample-caption{font-size:var(--font-size-caption);line-height:var(--line-height-caption);color:var(--text-secondary)}.sample-caption{margin-bottom:12px}.sample-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.sample-field{display:flex;flex-direction:column;gap:8px;font-size:var(--font-size-ui);line-height:var(--line-height-ui);min-width:0}.sample-inline{display:flex;gap:10px;align-items:center}.sample-toolbar{display:flex;gap:4px;padding:8px;border-bottom:1px solid var(--divider)}.sample-toolbar img{width:20px;height:20px}.sample-toast{padding:12px 16px;border-radius:var(--border-radius);box-shadow:var(--shadow-2);background:#263238;color:white;font-size:var(--font-size-ui)}.review-dialog{max-width:calc(100% - 32px)}@media(max-width:480px){body{padding:20px}.sample-grid{grid-template-columns:1fr}.sample-row{gap:16px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
  </style></head><body class="${entry.className || ''}" data-sample="${frame.dataset.example}" data-frame="${frame.id}" data-module="${entry.script || ''}">${entry.html}<script type="module" src="./preview.js"></script></body></html>`;
}

function noteList(keys, expanded = false) {
  return `<div class="review-list">${keys.map(key => { const n = issues[key]; return `<details class="review-note"${expanded ? ' open' : ''}><summary><span class="review-dot" aria-hidden="true"></span>${n.title}</summary><div><p>${n.text}</p><div class="source-list">${n.sources.map(source).join('')}</div></div></details>`; }).join('')}</div>`;
}

function sourcesSection(names) {
  return section('sources', 'Source files', `<div class="source-list">${names.map(source).join('')}</div>`, 'Open the implementation used for this reference. These files are read-only snapshots.');
}

function renderOverview() {
  return `${pageHead('CMSX Design System', 'The foundations, components, and patterns behind a clearer course management experience.', '', 'A reference for designing & building')}
  <div class="overview-meta"><span><b>${inventory.pages.length}</b> product pages reviewed</span><span><b>9</b> component families</span><span class="reference-label">Initial documentation</span></div>
  <div class="intro-note"><span class="note-mark" aria-hidden="true">i</span><p>Built from the existing CMSX interface. Examples use its styles and assets; open questions are kept visible in ${link('review', 'review notes')}.</p></div>
  ${section('foundations', 'Foundations', `<div class="catalog-grid">${['color', 'typography', 'layout'].map(id => card(docs.find(d => d.id === `foundations/${id}`))).join('')}</div><div class="section-tail">${link('foundations/icons', 'Icons & identity <span aria-hidden="true">↗</span>')}${link('foundations/accessibility', 'Accessibility <span aria-hidden="true">↗</span>')}</div>`, 'The shared visual decisions that make CMSX feel like CMSX.')}
  ${section('components', 'Components', `<div class="catalog-grid">${docs.filter(d => d.kind === 'component').map(card).join('')}</div>`, 'Find a component once. Explore its variants, states, and uses across the product.')}
  ${section('patterns', 'Patterns', `<div class="pattern-list">${docs.filter(d => d.kind === 'pattern').map((d, i) => link(d.id, `<span class="pattern-number">0${i + 1}</span><div><h3>${d.title}</h3><p>${d.description}</p></div><span aria-hidden="true">↗</span>`, 'pattern-row')).join('')}</div>`, 'Common workflows, assembled from the same building blocks.')}
  ${section('about', 'About this reference', `<div class="about-grid"><div><h3>Traceable to the product</h3><p>Coverage includes all 13 HTML entry pages and their in-page views. Source links explain where each family comes from.</p>${link('coverage', 'Explore page coverage →')}</div><div><h3>Clear about what is unfinished</h3><p>Page-specific styles and prototype behavior are documented as they exist. Review notes record inconsistencies and missing contracts.</p>${link('review', 'Read review notes →')}</div></div><p class="reference-credit">Documentation layout informed by <a href="https://base-ui.com/react/overview/quick-start" target="_blank" rel="noopener">Base UI’s documentation ↗</a>. CMSX styles and components remain the visual source.</p>`)} `;
}

function renderGroup(group) {
  const entries = docs.filter(d => d.id.startsWith(`${group.id}/`));
  return pageHead(group.title, group.description) + section('catalog', `Explore ${group.title.toLowerCase()}`, `<div class="catalog-grid">${entries.map(card).join('')}</div>`);
}

function renderComponent(doc) {
  const uses = coverage.filter(row => row[3].includes(doc.id.split('/')[1]));
  const variants = `<div class="table-overflow"><table class="docs-table"><thead><tr><th scope="col">Variant</th><th scope="col">Source selector</th><th scope="col">Purpose</th></tr></thead><tbody>${doc.variants.map(v => `<tr><th scope="row">${v[0]}</th><td><code>${esc(v[1])}</code></td><td>${v[2]}</td></tr>`).join('')}</tbody></table></div>`;
  return pageHead(doc.title, doc.description, 'Components', 'Component family') + `<div class="page-tools"><button type="button" data-source="${doc.sources[0]}">View source <span aria-hidden="true">↗</span></button><button type="button" data-copy-link>Copy page link</button><span>CMSX implementation</span></div>` + section('examples', 'Visual examples', preview(doc.preview)) + (doc.preview === 'navigation' ? section('product-navigation', 'Shared product navigation', preview('sidebar')) : '') + section('variants', 'Variants & states', variants + `<p class="body-copy">${doc.states}</p>`) + section('usage', 'Usage guidance', list(doc.usage)) + section('used-in', 'Used across the product', `<div class="usage-links">${uses.map(row => productLink(row[0], row[1])).join('')}</div><p class="small-note">${inventory.hosted ? 'Links open the documented product-page inventory.' : 'Links open the local product.'} Shared styles may have page-specific overrides.</p>`) + section('review', 'Needs review', noteList(doc.notes)) + sourcesSection(doc.sources) + related(doc.related);
}

function renderPattern(doc) {
  const uses = coverage.filter(row => row[4].includes(doc.id.split('/')[1]));
  return pageHead(doc.title, doc.description, 'Patterns', 'Product workflow') + section('example', 'At a glance', preview(doc.preview, 'Pattern composition')) + section('flow', 'How the pattern works', `<ol class="flow-list">${doc.steps.map(([title, desc, id], i) => `<li><span class="flow-number">${i + 1}</span><div><h3>${title}</h3><p>${desc}</p>${link(id, `${docs.find(d => d.id === id).title} →`)}</div></li>`).join('')}</ol>`) + section('guidance', 'Essential guidance', list(doc.usage)) + section('screens', 'Product screens', `<div class="usage-links">${uses.map(row => productLink(row[0], row[1])).join('')}</div>`) + section('review', 'Needs review', noteList(doc.notes)) + sourcesSection(doc.sources) + related(doc.related);
}

function related(ids) {
  return section('related', 'Related documentation', `<div class="related-links">${ids.map(id => link(id, `${docs.find(d => d.id === id)?.title} <span aria-hidden="true">→</span>`)).join('')}</div>`);
}

const tokenRow = (name, purpose) => `<tr><th scope="row"><code>${name}</code></th><td><code>${esc(inventory.tokens[name] || 'Not defined')}</code></td><td>${purpose}</td></tr>`;
const table = (heads, rows) => `<div class="table-overflow"><table class="docs-table"><thead><tr>${heads.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;

function renderFoundation(doc) {
  let body = '';
  if (doc.kind === 'color') {
    const tokens = [ ['--primary', 'Primary actions'], ['--primary-dark', 'Primary hover'], ['--primary-light', 'Selected surfaces'], ['--surface', 'Cards & controls'], ['--bg-page', 'Page background'], ['--bg', 'Neutral hover'], ['--error', 'Errors'], ['--status-open', 'Open'], ['--status-graded-open', 'Graded & Open'], ['--status-graded', 'Graded'], ['--status-hidden', 'Hidden'], ['--status-closed', 'Closed'] ];
    body = section('palette', 'Interface palette', `<div class="palette-toolbar"><p>Values read from the shared stylesheets.</p><div class="theme-switch" role="group" aria-label="Color palette theme"><button type="button" data-palette="light" aria-pressed="true">Light</button><button type="button" data-palette="dark" aria-pressed="false">Dark</button></div></div><div class="swatch-grid">${tokens.map(([name, desc]) => `<button class="swatch" type="button" data-token="${name}" aria-label="Copy ${name}"><span class="swatch-color" style="background:${inventory.tokens[name]}"></span><span class="swatch-copy"><strong>${desc}</strong><code>${name}</code><span class="swatch-value">${inventory.tokens[name]}</span><span class="copy-hint">Copy token ↗</span></span></button>`).join('')}</div>`) + section('text', 'Text & dividers', table(['Token', 'Light value', 'Purpose'], [['--text-primary', 'Default text'], ['--text-secondary', 'Secondary text'], ['--text-disabled', 'Unavailable content'], ['--divider', 'Borders and separators']].map(([name, desc]) => tokenRow(name, desc)).join(''))) + section('guidance', 'Usage guidance', list(['Use semantic variables so the existing dark palette can override them.', 'Keep status labels visible alongside their color.', 'Cornell red <code>#B31B1B</code> is specified in the design notes for restrained brand accents. It is not the error color or a shared CSS token.']));
  } else if (doc.kind === 'typography') {
    const roles = [['caption', 'Caption', '12 / 16', 'Metadata, timestamps, badges'], ['ui', 'UI', '14 / 20', 'Controls, labels, tables'], ['body', 'Body', '16 / 24', 'Prose, item headings, navigation'], ['section', 'Section', '18 / 24', 'Sections, cards, dialogs'], ['title', 'Title', '24 / 32', 'Page titles'], ['metric', 'Metric', '32 / 40', 'Prominent summary numbers']];
    body = section('family', 'DM Sans', `<div class="type-hero"><span>Aa Bb Cc 123</span><p>Efficient. Credible. Composed.</p><small>Regular 400 · Medium 500 · Semibold 600 · Bold 700</small></div><p class="body-copy">DM Sans is loaded in styles.css. The grading submission preview also uses Georgia / Times New Roman to represent document content.</p>`) + section('scale', 'Six type roles', `<div class="type-scale">${roles.map(([role, label, px, use]) => `<div class="type-row"><div><strong>${label}</strong><span>${use}</span></div><span class="type-sample" style="font-size:var(--font-size-${role});line-height:var(--line-height-${role})">Course overview</span><div><code>${px} px</code><button class="token-copy" data-copy="--font-size-${role}">--font-size-${role}</button></div></div>`).join('')}</div><p class="small-note">Size / line height at a 16px browser default. Tokens use rem sizes and unitless line heights.</p>`) + section('guidance', 'Usage guidance', list(['Choose a role by purpose and pair it with the matching <code>--line-height-*</code> token.', 'Keep the browser root font size unchanged. Wrap or scroll dense content rather than reducing metadata below 12px.', 'Use regular body text, medium controls, and semibold headings. Keep prose around 65–70 characters wide.']));
  } else if (doc.kind === 'layout') {
    body = section('shell', 'The product shell', `<div class="shell-diagram" role="img" aria-label="Product shell: 68 pixel navigation rail, 60 pixel content inset, page header, optional filter rail, and main results"><div class="shell-nav">68px<br>rail</div><div class="shell-body"><div class="shell-label">60px inline padding</div><div class="shell-header">Page header · min. 72px</div><div class="shell-columns"><div>Optional<br>filter rail</div><div>Main content / results</div></div></div></div>${table(['Token', 'Value', 'Purpose'], [['--page-shell-padding-top', 'Top inset'], ['--page-shell-padding-inline', 'Inline inset'], ['--page-shell-padding-bottom', 'Bottom inset'], ['--page-header-min-height', 'Shared header baseline']].map(([key, desc]) => tokenRow(key, desc)).join(''))}`) + section('spacing', 'Existing spacing utilities', `<div class="spacing-scale">${[4, 8, 12, 16, 24].map(n => `<div><span class="space-bar" style="width:${n * 6}px"></span><code>.gap-${n}</code><span>${n}px</span></div>`).join('')}</div><p class="body-copy">These gap utilities are defined in styles.css. Larger gaps and page-specific spacing also exist; the code does not define a complete spacing-token scale.</p>`) + section('surfaces', 'Surfaces & elevation', `<div class="surface-grid">${['--shadow-1', '--shadow-2', '--dropdown-shadow'].map(t => `<div style="box-shadow:var(${t})"><code>${t}</code></div>`).join('')}</div>${table(['Token', 'Value', 'Purpose'], tokenRow('--border-radius', 'Shared 4px corner radius'))}`) + section('responsive', 'Responsive guidance', list(['The navigation rail is 68px and expands to 220px on hover.', 'Product pages use their own breakpoints. No universal breakpoint token set is defined.', 'Tables scroll horizontally, and content rails collapse or move at page-specific widths. Inspect the target page before extending its layout.']));
  } else if (doc.kind === 'icons') {
    body = section('identity', 'Product identity', `<div class="logo-specimen"><img src="./reference/cmsx-logo.svg" alt="CMSX light logo" /><div class="logo-dark"><img src="./reference/assets/cmsx-logo-dark.png" alt="CMSX dark logo" /></div></div><p class="body-copy">Use the supplied SVG for light surfaces and the existing dark-logo PNG for dark surfaces. The shared sidebar loads both and switches them with the theme.</p>`) + section('assets', 'Local icon examples', `<div class="icon-grid">${[['assignments/edit', 'Edit'], ['assignments/calendar', 'Calendar'], ['assignments/sort', 'Sort'], ['assignments/regrade', 'Regrade'], ['announcement-editor/attachment', 'Attachment'], ['announcement-editor/bold', 'Bold'], ['announcement-editor/link', 'Link'], ['announcement-editor/undo', 'Undo']].map(([path, name]) => `<div><img src="./reference/assets/${path}.svg" alt="" /><span>${name}</span><code>${path.split('/')[0]}</code></div>`).join('')}</div>`) + section('guidance', 'Usage guidance', list(['Reuse local assets where the existing feature already uses them. The global shell uses the Material Icons font.', 'Decorative icons should have empty alt text or aria-hidden. Icon-only actions need an accessible name.', 'Sizes are contextual: the sidebar uses 24px Material Icons, buttons typically 18px, and editor controls vary. Icon glyph sizes are independent of the text scale.']));
  } else {
    body = section('intent', 'The intended baseline', `<div class="intro-note"><span class="note-mark">i</span><p>The product design notes call for WCAG AA, full keyboard access, and text labels alongside color. This is a target, not a completed conformance assessment.</p></div>`) + section('implemented', 'Existing behavior to preserve', list(['Enhanced single selects implement arrow keys, Home, End, Escape, and type-ahead.', 'Course Home tabs use tab / tabpanel roles, aria-selected, and keyboard navigation.', 'Assessment creation links validation text to inputs and uses native dialogs.', 'Typography uses rem values and keeps the root browser size unchanged.'])) + section('checks', 'When using a component', `<ol class="check-list"><li>Give the control a visible label and an accessible name.</li><li>Complete the task with a keyboard; check the visible focus indicator.</li><li>Check text and controls in both light and dark themes.</li><li>Verify zoom, narrow screens, long content, and empty states.</li><li>Make errors readable in place, and announce status changes appropriately.</li></ol><p class="body-copy">These are usage checks for future work. The specimens intentionally retain current product behavior so gaps remain visible.</p>`);
  }
  return pageHead(doc.title, doc.description, 'Foundations') + body + section('review', 'Needs review', noteList(doc.notes)) + sourcesSection(doc.sources) + related(doc.related);
}

function renderCoverage() {
  return pageHead('Page coverage', 'An index of every product page reviewed, including the alternate views inside it.', '', '13 pages · one connected reference') + section('inventory', 'Product inventory', `<div class="coverage-list">${coverage.map(([file, title, views, components, patterns], index) => `<article class="coverage-item" id="${coverageId(file)}"><div class="coverage-title"><span>${String(index + 1).padStart(2, '0')}</span><h3>${title}</h3>${inventory.hosted ? `<button type="button" data-source="${file}" class="coverage-source">View source ↗</button>` : `<a href="http://127.0.0.1:5000/${file}" target="_blank" rel="noopener" aria-label="Open ${title} in the product">Open ↗</a>`}</div>${source(file)}<p>${views}</p><div class="coverage-links"><span>Components</span>${components.map(id => link(`components/${id}`)).join('')}</div><div class="coverage-links"><span>Patterns</span>${patterns.map(id => link(`patterns/${id}`)).join('')}</div></article>`).join('')}</div>`) + section('scope', 'Review scope', `<p class="body-copy">This inventory is based on the HTML entry pages, their linked CSS and JavaScript, shared modules, TYPOGRAPHY.md, and .impeccable.md. In-page views and query-string modes are grouped under their owning page. The source audit is not a full end-to-end test of every product interaction.</p><p class="body-copy">No separate editable design file or Figma reference was supplied. The code and design notes are the basis for this initial documentation.</p>`);
}

function renderReview() {
  return pageHead('Review notes', 'Observed differences and missing information, kept separate from established design decisions.', '', 'Open questions · product unchanged') + section('notes', `${Object.keys(issues).length} items to review`, noteList(Object.keys(issues)), 'Expand a note to see the evidence and its source files. These are observations, not proposed product changes.') + section('next', 'A useful next pass', list(['Decide which page-specific component differences are intentional.', 'Agree on shared focus, disabled, error, and contrast treatments.', 'Confirm persistence and backend behavior before turning prototype interactions into implementation contracts.']));
}

function render() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(2) : 'overview';
  const [next, query = ''] = raw.split('?');
  const targetSection = new URLSearchParams(query).get('section');
  if (next === renderedPage && targetSection) { document.getElementById(targetSection)?.scrollIntoView({ behavior: 'instant' }); return; }
  route = next;
  frameCount = 0;
  let html;
  let title;
  const doc = docs.find(d => d.id === route);
  const group = groups.find(g => g.id === route);
  if (doc) { title = doc.title; html = doc.kind === 'component' ? renderComponent(doc) : doc.kind === 'pattern' ? renderPattern(doc) : renderFoundation(doc); }
  else if (group) { title = group.title; html = renderGroup(group); }
  else if (route === 'overview') { title = 'Overview'; html = renderOverview(); }
  else if (route === 'coverage') { title = 'Page coverage'; html = renderCoverage(); }
  else if (route === 'review') { title = 'Review notes'; html = renderReview(); }
  else { title = 'Page not found'; html = pageHead(title, 'This documentation page does not exist.') + link('overview', 'Return to overview →', 'text-link'); }
  main.innerHTML = html + `<footer class="doc-footer"><span>CMSX Design System <span class="footer-dot">·</span> Initial reference</span><button type="button" data-copy-link>Copy page link <span aria-hidden="true">↗</span></button></footer>`;
  renderedPage = route;
  document.title = `${title} · CMSX Design System`;
  renderNavigation();
  const sections = [...main.querySelectorAll('.doc-section')];
  outline.innerHTML = `<p>On this page</p><nav>${sections.map(s => `<a href="#/${route}?section=${s.id}">${s.querySelector('h2').textContent}</a>`).join('')}</nav><div class="outline-note"><span class="status-dot"></span> Initial reference<p>Based on the existing product files.</p>${link('review', 'See review notes ↗')}</div>`;
  main.querySelectorAll('iframe[data-example]').forEach(frame => fillPreview(frame));
  document.body.classList.remove('nav-open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
  if (targetSection) document.getElementById(targetSection)?.scrollIntoView({ behavior: 'instant' });
  else { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}

async function showSource(file) {
  if (!Object.hasOwn(inventory.sources, file)) { toast('This source is not part of the snapshot.'); return; }
  const dialog = document.querySelector('#source-dialog');
  document.querySelector('#source-title').textContent = file;
  const pre = document.querySelector('#source-content');
  pre.textContent = 'Loading source…';
  dialog.showModal();
  try {
    const response = await fetch(`./sources/${file}.txt`);
    if (!response.ok) throw new Error();
    const text = await response.text();
    pre.innerHTML = text.split('\n').map((line, i) => `<span class="source-line"><span aria-hidden="true">${i + 1}</span><code>${esc(line) || ' '}</code></span>`).join('');
    pre.scrollTop = 0;
  } catch { pre.textContent = 'The source could not be loaded. Restart the documentation server to refresh the snapshot.'; }
}

async function copy(text, success = 'Copied to clipboard') {
  try { await navigator.clipboard.writeText(text); toast(success); }
  catch { toast('Clipboard unavailable. Select and copy the value directly.'); }
}

const searchDialog = document.querySelector('#search-dialog');
const searchInput = document.querySelector('#search-input');
function search() {
  const query = searchInput.value.trim().toLowerCase();
  const extra = [{ id: 'overview', title: 'Overview', description: 'Explore the CMSX Design System' }, { id: 'coverage', title: 'Page coverage', description: 'All 13 product pages and their alternate views' }, { id: 'review', title: 'Review notes', description: Object.values(issues).map(i => i.title).join(' · ') }];
  const results = [...docs, ...extra].filter(d => `${d.title} ${d.description} ${d.sources?.join(' ')} ${d.usage?.join(' ')} ${d.variants?.flat().join(' ')} ${d.steps?.flat().join(' ')} ${d.notes?.map(n => issues[n].text).join(' ')}`.toLowerCase().includes(query));
  document.querySelector('#search-count').textContent = `${results.length} results`;
  document.querySelector('#search-results').innerHTML = results.length ? results.map(d => link(d.id, `<span>${esc(d.id.includes('/') ? d.id.split('/')[0] : 'Reference')}</span><strong>${d.title}</strong><p>${esc(d.description)}</p>`, 'search-result')).join('') : '<div class="search-empty"><h3>No matching documentation</h3><p>Try a component name, a source filename, or a task like “grading”.</p></div>';
}
function openSearch() { searchDialog.showModal(); searchInput.value = ''; search(); searchInput.focus(); }

document.querySelector('.search-trigger').addEventListener('click', openSearch);
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
searchInput.addEventListener('input', search);
searchInput.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector('.search-result')?.focus(); } else if (event.key === 'Enter') { document.querySelector('.search-result')?.click(); } });
document.querySelector('#search-results').addEventListener('click', event => { if (event.target.closest('a')) searchDialog.close(); });
document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelector('.mobile-menu').addEventListener('click', event => { const open = document.body.classList.toggle('nav-open'); event.currentTarget.setAttribute('aria-expanded', String(open)); });
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!searchDialog.open && !document.querySelector('#source-dialog').open) openSearch(); }
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false'); document.querySelector('.mobile-menu').focus(); }
});
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.source) showSource(target.dataset.source);
  if (target.dataset.copy) copy(target.dataset.copy);
  if (target.dataset.exampleCopy) copy(examples[target.dataset.exampleCopy].html.replaceAll('><', '>\n<'), 'Example markup copied');
  if (target.hasAttribute('data-copy-link')) copy(location.href, 'Page link copied');
  if (target.dataset.token) copy(`var(${target.dataset.token})`, 'CSS token copied');
  if (target.dataset.theme) {
    const frame = document.getElementById(target.dataset.frame);
    target.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === target)));
    fillPreview(frame, target.dataset.theme);
  }
  if (target.dataset.palette) {
    const palette = target.dataset.palette === 'dark' ? inventory.darkTokens : inventory.tokens;
    target.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === target)));
    document.querySelectorAll('.swatch').forEach(swatch => {
      const value = palette[swatch.dataset.token];
      swatch.querySelector('.swatch-color').style.background = value;
      swatch.querySelector('.swatch-value').textContent = value;
    });
  }
});
window.addEventListener('message', event => {
  if (event.data?.type !== 'cmsx-example-size') return;
  const frame = document.getElementById(event.data.id);
  if (!frame || frame.contentWindow !== event.source) return;
  const min = examples[frame.dataset.example].height;
  frame.style.height = `${Math.min(1600, Math.max(min, Number(event.data.height) || min))}px`;
});
window.addEventListener('hashchange', render);
try {
  const response = await fetch('./inventory.json');
  if (!response.ok) throw new Error();
  inventory = await response.json();
  const productHeaderLink = document.querySelector('.product-link');
  if (!inventory.hosted) {
    productHeaderLink.href = 'http://127.0.0.1:5000/';
    productHeaderLink.target = '_blank';
    productHeaderLink.rel = 'noopener';
    productHeaderLink.innerHTML = 'Open product <span aria-hidden="true">↗</span>';
  }
  render();
} catch { main.innerHTML = '<h1>Documentation reference unavailable</h1><p>Run <code>npm run dev</code> in the design-system folder to prepare the product snapshots, then reload this page.</p>'; }
