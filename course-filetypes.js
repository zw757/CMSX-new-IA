import { settingsSession } from './course-settings-draft.js';
import { validateFiletype } from './course-settings-state.mjs';
import { staffIcons } from './course-settings-assets.js';

const rows = document.getElementById('filetypes-rows');
const wrapper = document.getElementById('filetypes-table-wrapper');
const add = document.querySelector('[data-settings-action="add-filetype"]');
const error = document.getElementById('filetypes-error');
let filetypes = settingsSession.current().filetypes, draft = null, sorting = null;
function setError(message = '') { error.textContent = message; error.hidden = !message; }
function icon(name, width, height) {
  const img = document.createElement('img'); img.src = staffIcons[name];
  img.alt = ''; img.width = width; img.height = height; return img;
}
function action(label, name, callback, text = '') {
  const button = document.createElement('button'); button.type = 'button';
  button.className = `btn ${name === 'save' ? 'btn-primary' : 'staff-neutral-button'}`;
  button.setAttribute('aria-label', label); button.append(icon(name, name === 'edit' ? 20 : name === 'save' ? 22 : 24, name === 'edit' ? 20 : 24));
  if (text) button.append(document.createTextNode(text));
  button.addEventListener('click', callback); return button;
}
function persistDraft() { settingsSession.stageFiletypes(filetypes); }
function cancel() { draft = null; setError(); render(); add.focus({ preventScroll: true }); }
export function finishFiletypeEdit() {
  if (!draft) return true;
  try {
    const row = validateFiletype(draft, filetypes.filter(item => item.id !== draft.id));
    const index = filetypes.findIndex(item => item.id === row.id);
    if (index < 0) filetypes.push(row); else filetypes[index] = row;
    draft = null; persistDraft(); setError(); render(); return true;
  } catch (issue) {
    setError(issue.message); document.getElementById('course-features').open = true;
    rows.querySelector('input')?.focus(); return false;
  }
}
function render() {
  wrapper.hidden = !filetypes.length && !draft; add.disabled = !!draft;
  const data = [...filetypes];
  if (sorting) data.sort((a, b) => a.name.localeCompare(b.name) * (sorting === 'ascending' ? 1 : -1));
  if (draft && !data.some(row => row.id === draft.id)) data.push(draft);
  rows.replaceChildren(...data.map(item => {
    const row = document.createElement('tr'), editing = draft?.id === item.id;
    for (const [key, label] of [['name', 'Filetype name'], ['extensions', 'Allowed extensions']]) {
      const cell = document.createElement('td');
      if (editing) {
        const input = document.createElement('input'); input.className = 'form-control'; input.value = draft[key];
        input.setAttribute('aria-label', label); input.setAttribute('aria-describedby', 'filetypes-error');
        input.maxLength = key === 'name' ? 80 : 1200; input.placeholder = key === 'name' ? 'Name' : 'jpg, png, webp';
        input.addEventListener('input', () => { draft[key] = input.value; setError(); }); cell.append(input);
      } else cell.textContent = item[key];
      row.append(cell);
    }
    const cell = document.createElement('td'), actions = document.createElement('div'); actions.className = 'staff-row-actions';
    const edit = editing ? action(`Save filetype ${item.name || 'new'}`, 'save', () => finishFiletypeEdit(), 'Save')
      : action(`Edit filetype ${item.name}`, 'edit', () => { draft = { ...item }; render(); rows.querySelector('input')?.focus(); }, 'Edit');
    const remove = action(editing ? 'Cancel filetype edit' : `Delete filetype ${item.name}`, 'delete', () => {
      if (editing) { cancel(); return; }
      filetypes = filetypes.filter(row => row.id !== item.id); persistDraft(); render(); add.focus({ preventScroll: true });
    });
    edit.disabled = !!draft && !editing; remove.disabled = !!draft && !editing;
    actions.append(edit, remove); cell.append(actions); row.append(cell); return row;
  }));
}
add.addEventListener('click', () => {
  if (draft) return;
  draft = { id: crypto.randomUUID(), name: '', extensions: '' }; render(); rows.querySelector('input')?.focus();
});
rows.addEventListener('keydown', event => {
  if (event.key === 'Escape' && draft) { event.preventDefault(); cancel(); }
  if (event.key === 'Enter' && draft) { event.preventDefault(); finishFiletypeEdit(); }
});
document.getElementById('filetypes-sort').addEventListener('click', () => {
  sorting = sorting === 'ascending' ? 'descending' : 'ascending';
  document.getElementById('filetypes-sort-heading').setAttribute('aria-sort', sorting); render();
});
render();
