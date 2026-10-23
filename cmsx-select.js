// Shared dropdown presentation for single-value native selects. The original
// select stays in the form so existing value reads and change handlers work.
let openControl = null;
let nextId = 0;

function optionText(option) {
  return option?.label || option?.textContent?.trim() || '';
}

function selectLabel(select) {
  const floatingLabel = select.closest('.outlined-field')?.querySelector(':scope > span:not(.cmsx-select)')?.textContent.trim();
  const linkedLabel = [...(select.labels || [])].map(label => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('select, .cmsx-select, input, button').forEach(control => control.remove());
    return copy.textContent.replace(/\s*\*\s*/g, ' ').trim();
  }).filter(Boolean).join(' ');
  const nearbyLabel = select.closest('.form-group, .filter-field, .create-field, .outlined-field')?.querySelector('label')?.textContent.trim();
  return select.getAttribute('aria-label') || floatingLabel || linkedLabel || nearbyLabel || select.name || 'Select option';
}

function syncControl(control) {
  const { select, trigger, value, menu } = control;
  const selected = select.selectedOptions[0] || select.options[0];
  const label = optionText(selected);
  value.textContent = label;
  trigger.disabled = select.disabled;
  trigger.setAttribute('aria-label', `${selectLabel(select)}: ${label}`);
  if (openControl === control) {
    menu.querySelectorAll('[role="option"]').forEach(option => {
      option.setAttribute('aria-selected', String(Number(option.dataset.index) === select.selectedIndex));
    });
  }
}

function closeMenu(returnFocus = false) {
  if (!openControl) return;
  const { trigger, menu } = openControl;
  menu.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  openControl = null;
  if (returnFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
}

function positionMenu(control) {
  const { trigger, menu } = control;
  const rect = trigger.getBoundingClientRect();
  menu.style.width = `${Math.min(Math.max(rect.width, 190), window.innerWidth - 16)}px`;
  menu.hidden = false;
  const menuHeight = menu.getBoundingClientRect().height;
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${rect.bottom + menuHeight + 4 <= window.innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - menuHeight - 4)}px`;
}

function openMenu(control, focusIndex = control.select.selectedIndex) {
  if (control.select.disabled) return;
  if (openControl === control) { closeMenu(true); return; }
  closeMenu();
  syncControl(control);
  const { select, trigger, menu } = control;
  menu.replaceChildren(...[...select.options].map((option, index) => {
    const row = document.createElement('span');
    row.className = 'cmsx-dropdown-option';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(index === select.selectedIndex));
    row.setAttribute('aria-disabled', String(option.disabled));
    row.tabIndex = -1;
    row.dataset.index = index;
    row.textContent = optionText(option);
    return row;
  }));
  openControl = control;
  trigger.setAttribute('aria-expanded', 'true');
  positionMenu(control);
  const options = [...menu.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
  const focused = menu.querySelector(`[data-index="${focusIndex}"]:not([aria-disabled="true"])`) || options[0];
  focused?.focus({ preventScroll: true });
}

function chooseOption(control, index) {
  const option = control.select.options[index];
  if (!option || option.disabled) return;
  if (control.select.selectedIndex !== index) {
    control.select.selectedIndex = index;
    control.select.dispatchEvent(new Event('input', { bubbles: true }));
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncControl(control);
  closeMenu(true);
}

function enhanceSelect(select) {
  if (select.multiple || select.size > 1 || select.hasAttribute('data-native-select') || select.closest('.cmsx-select')) return;
  const root = document.createElement('span');
  root.className = 'cmsx-select';
  const trigger = document.createElement('button');
  trigger.className = 'cmsx-select-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const value = document.createElement('span');
  value.className = 'cmsx-select-value';
  const chevron = document.createElement('span');
  chevron.className = 'cmsx-dropdown-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  trigger.append(value, chevron);
  const menu = document.createElement('span');
  menu.className = 'cmsx-dropdown-menu';
  menu.id = `cmsx-select-menu-${++nextId}`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', selectLabel(select));
  menu.hidden = true;
  trigger.setAttribute('aria-controls', menu.id);
  select.before(root);
  root.append(select, trigger, menu);
  select.classList.add('cmsx-select-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const control = { root, select, trigger, value, menu };
  let typeahead = '';
  let typeaheadTimer;
  syncControl(control);
  select.addEventListener('input', () => syncControl(control));
  select.addEventListener('change', () => syncControl(control));
  new MutationObserver(() => syncControl(control)).observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
  trigger.addEventListener('click', () => openMenu(control));
  trigger.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? select.options.length - 1
      : Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1)));
    openMenu(control, index);
  });
  menu.addEventListener('click', event => {
    const row = event.target.closest('[role="option"]');
    if (row) chooseOption(control, Number(row.dataset.index));
  });
  menu.addEventListener('keydown', event => {
    const options = [...menu.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    else if (event.key === 'Tab') closeMenu();
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (document.activeElement?.dataset.index !== undefined) chooseOption(control, Number(document.activeElement.dataset.index));
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[next]?.focus({ preventScroll: true });
    } else if (event.key.length === 1 && event.key !== ' ' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      typeahead += event.key.toLocaleLowerCase();
      clearTimeout(typeaheadTimer);
      typeaheadTimer = setTimeout(() => { typeahead = ''; }, 700);
      const match = options.find(option => option.textContent.trim().toLocaleLowerCase().startsWith(typeahead));
      match?.focus({ preventScroll: true });
    }
  });
  [...(select.labels || [])].forEach(label => {
    label.addEventListener('click', event => {
      if (root.contains(event.target)) return;
      event.preventDefault();
      trigger.click();
    });
  });
}

function initializeSelects() {
  document.querySelectorAll('select').forEach(enhanceSelect);
  document.addEventListener('pointerdown', event => {
    if (openControl && !openControl.root.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (openControl && !openControl.root.contains(event.target)) closeMenu();
  });
  window.addEventListener('scroll', event => {
    if (openControl && event.target !== openControl.menu) closeMenu();
  }, true);
  window.addEventListener('resize', () => closeMenu());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeSelects, { once: true });
else initializeSelects();
