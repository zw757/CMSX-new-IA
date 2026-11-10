import moreIcon from './assets/announcements/more.svg';
import editIcon from './assets/announcements/edit.svg';
import deleteIcon from './assets/announcements/menu-delete.svg';
import { STORAGE_KEY, DELETED_KEY, getAnnouncements, getDeletedAnnouncements, writeStored, escapeHTML, plainText, showToast } from './announcement-data.js';

const sections = document.getElementById('announcementSections');
const filters = document.getElementById('categoryFilters');
const detail = document.getElementById('announcementDetail');
const deletedButton = document.getElementById('deletedItemsButton');
let activeCategory = '';
let showingDeleted = false;
let selectedId = new URLSearchParams(location.search).get('id');
let openMenu = '';
let menuOrigin;
const baseCategories = ['Prelim', 'Assignments', 'Office Hours', 'Regrades'];

const icon = source => `<img src="${source}" alt="" aria-hidden="true" />`;
const source = () => showingDeleted ? getDeletedAnnouncements() : getAnnouncements();
const visible = () => source().filter(item => !activeCategory || item.category === activeCategory);
const metadata = item => `<div class="announcement-meta"><span>${escapeHTML(item.author || 'Professor')}</span><span class="announcement-meta-divider" aria-hidden="true"></span><span>Posted on ${escapeHTML(item.posted)}</span></div>`;
const heading = item => `<div class="announcement-item-heading"><span class="announcement-item-title">${escapeHTML(item.title)}</span><span class="announcement-item-category">${escapeHTML(item.category || 'General')}</span></div>`;
const menuButton = (item, slot) => `<button class="announcement-more" type="button" data-menu-id="${escapeHTML(item.id)}" data-menu-slot="${slot}" aria-label="Actions for ${escapeHTML(item.title)}" aria-haspopup="menu" aria-expanded="${openMenu === slot + ':' + item.id}">${icon(moreIcon)}</button>`;
function menu(item, slot) {
  if (openMenu !== slot + ':' + item.id) return '';
  return `<div class="announcement-item-menu" role="menu" aria-label="Announcement actions">
    <a role="menuitem" href="announcement-edit.html?id=${encodeURIComponent(item.id)}${showingDeleted ? '&deleted=true' : ''}">${icon(editIcon)}<span>Edit</span></a>
    <button role="menuitem" type="button" data-delete-id="${escapeHTML(item.id)}">${icon(deleteIcon)}<span>${showingDeleted ? 'Restore' : 'Delete'}</span></button>
  </div>`;
}

function renderFilters() {
  const categories = [...new Set([...baseCategories, ...source().map(item => item.category).filter(Boolean)])];
  filters.innerHTML = categories.map(category => `<button class="announcement-category-filter ${activeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${activeCategory === category}">${escapeHTML(category)}</button>`).join('');
  filters.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    activeCategory = activeCategory === button.dataset.category ? '' : button.dataset.category;
    openMenu = '';
    render();
    filters.querySelectorAll('[data-category]').forEach(next => { if (next.dataset.category === button.dataset.category) next.focus(); });
  }));
}

function renderSections() {
  const items = visible();
  if (!items.some(item => item.id === selectedId)) selectedId = items[0]?.id;
  const periods = showingDeleted ? ['Deleted Items'] : [...new Set(['This Week', 'Last Week', 'This Month', ...items.map(item => item.period || 'This Week')])];
  sections.innerHTML = periods.map(period => {
    const group = showingDeleted ? items : items.filter(item => (item.period || 'This Week') === period);
    if (!group.length) return '';
    const periodId = 'period-' + period.toLowerCase().replace(/\s+/g, '-');
    return `<section class="announcement-period" aria-labelledby="${periodId}">
      <h3 class="announcement-period-title" id="${periodId}">${escapeHTML(period)}</h3>
      <div class="announcement-period-list">${group.map(item => `
        <article class="announcement-list-item ${item.id === selectedId ? 'is-selected' : ''}" data-item-id="${escapeHTML(item.id)}">
          <button class="announcement-select" type="button" data-select-id="${escapeHTML(item.id)}" aria-pressed="${item.id === selectedId}" aria-label="View ${escapeHTML(item.title)}">
            <div class="announcement-card-header"><div>${heading(item)}${metadata(item)}</div></div>
            <p class="announcement-item-summary">${escapeHTML(item.summary || plainText(item.body))}</p>
          </button>
          ${menuButton(item, 'list')}${menu(item, 'list')}
        </article>`).join('')}
      </div>
    </section>`;
  }).join('') || '<p class="announcement-reader-empty">No announcements in this category.</p>';
  sections.querySelectorAll('[data-select-id]').forEach(button => button.addEventListener('click', () => {
    selectedId = button.dataset.selectId;
    openMenu = '';
    renderSections();
    renderDetail();
    bindActions(sections);
    sections.querySelectorAll('[data-select-id]').forEach(next => { if (next.dataset.selectId === selectedId) next.focus({ preventScroll: true }); });
    const url = new URL(location.href);
    url.searchParams.set('id', selectedId);
    history.replaceState(null, '', url);
  }));
}

function renderDetail() {
  const item = visible().find(item => item.id === selectedId);
  if (!item) {
    detail.innerHTML = '<p class="announcement-reader-empty">Select an announcement to read it.</p>';
    return;
  }
  detail.innerHTML = `
    <div class="announcement-reader-avatar"><span class="announcement-avatar" aria-hidden="true">${escapeHTML(item.initials || 'OP')}</span></div>
    <div class="announcement-reader-main">
      <div class="announcement-reader-header"><div>${heading(item)}${metadata(item)}</div>${menuButton(item, 'detail')}${menu(item, 'detail')}</div>
      <div class="announcement-reader-body" tabindex="0" role="region" aria-label="${escapeHTML(item.title)} content">${item.body || ''}
        ${item.attachments?.length ? `<div class="announcement-saved-attachments">${item.attachments.map(file => `<p><a href="${escapeHTML(file.url)}" download="${escapeHTML(file.name)}">${escapeHTML(file.name)}</a></p>`).join('')}</div>` : ''}
      </div>
    </div>`;
  bindActions(detail);
}

function bindActions(container) {
  container.querySelectorAll('[data-menu-id]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.menuSlot + ':' + button.dataset.menuId;
    openMenu = openMenu === key ? '' : key;
    menuOrigin = { id: button.dataset.menuId, slot: button.dataset.menuSlot };
    renderSections();
    renderDetail();
    bindActions(sections);
    if (openMenu) document.querySelector('.announcement-item-menu [role="menuitem"]')?.focus();
    else focusMenuOrigin();
  }));
  container.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.deleteId;
    const from = source();
    const item = from.find(entry => entry.id === id);
    if (!item) return;
    const destinationKey = showingDeleted ? STORAGE_KEY : DELETED_KEY;
    const destination = showingDeleted ? getAnnouncements() : getDeletedAnnouncements();
    if (!writeStored(destinationKey, [item, ...destination.filter(entry => entry.id !== id)])) {
      showToast('Could not save the announcement change.');
      return;
    }
    writeStored(showingDeleted ? DELETED_KEY : STORAGE_KEY, from.filter(entry => entry.id !== id));
    openMenu = '';
    render();
    showToast(showingDeleted ? 'Announcement restored.' : 'Moved to Deleted Items.');
  }));
}
function focusMenuOrigin() {
  if (!menuOrigin) return;
  document.querySelectorAll('[data-menu-id]').forEach(button => {
    if (button.dataset.menuId === menuOrigin.id && button.dataset.menuSlot === menuOrigin.slot) button.focus({ preventScroll: true });
  });
}
function closeMenu() {
  if (!openMenu) return;
  openMenu = '';
  renderSections();
  renderDetail();
  bindActions(sections);
}
function render() {
  renderFilters();
  renderSections();
  renderDetail();
  bindActions(sections);
}
deletedButton.addEventListener('click', () => {
  showingDeleted = !showingDeleted;
  activeCategory = '';
  openMenu = '';
  deletedButton.setAttribute('aria-pressed', String(showingDeleted));
  deletedButton.querySelector('span').textContent = showingDeleted ? 'Back to Announcements' : 'Deleted Items';
  render();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.announcement-item-menu, .announcement-more')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (!openMenu) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
    focusMenuOrigin();
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const entries = [...document.querySelectorAll('.announcement-item-menu [role="menuitem"]')];
    const index = entries.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
    entries[next]?.focus();
  } else if (event.key === 'Tab') closeMenu();
});
render();

