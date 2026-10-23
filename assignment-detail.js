import { createStudents } from './student-roster.js';

const params = new URLSearchParams(window.location.search);
const assignmentId = params.get('assignment')?.trim() || 'Assignment 3: Grading Systems';
const assignmentName = {
  'assignment-1': 'Individual Assignment',
  'assignment-2': 'Group Assignment',
}[assignmentId] || assignmentId;
const isGroupAssignment = assignmentId === 'assignment-2';
const extensionStorageKey = `cmsx:assignment-extensions:${assignmentId}`;
let savedExtensions = {};
let savedGroupGrades = {};
try {
  savedExtensions = JSON.parse(localStorage.getItem(extensionStorageKey) || '{}') || {};
} catch {
  // The table remains usable when local storage is unavailable.
}
if (isGroupAssignment) {
  try {
    const stored = JSON.parse(localStorage.getItem('cmsx:group-grades:assignment-2') || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) savedGroupGrades = stored;
  } catch { /* Keep mock scores when browser storage is unavailable. */ }
}

// Match the Students table's identities and A1 scores; retain assignment-specific mock statuses.
const mockGroups = ['Group Alpha', 'Group Beta', 'Group Gamma', 'Group Delta', 'Group Epsilon', 'Ungrouped'];
const mockGraders = ['May', 'Sylvia', 'Erica'];
const graderNames = { May: 'May Wu', Sylvia: 'Sylvia Tai', Erica: 'Erica Lee' };
const initialStatuses = ['regrade', 'graded', 'ungraded', 'regrade', 'graded', 'not-submitted', 'graded', 'graded', 'partial', 'graded', 'graded', 'graded', 'regrade', 'graded', 'graded'];
const assignmentNumber = Number(
  /^assignment-([1-7])$/i.exec(assignmentId)?.[1]
  || /\bAssignment\s+([1-7])\b/i.exec(assignmentId)?.[1]
  || 1
);
const roster = createStudents(800);
const submissionUnits = isGroupAssignment
  ? Array.from({ length: Math.ceil(roster.length / 5) }, (_, index) => roster.slice(index * 5, index * 5 + 5))
  : roster.map((student) => [student]);
const submissions = submissionUnits.map((members, index) => {
  const student = members[0];
  const groupId = `G${String(index + 1).padStart(3, '0')}`;
  const savedGrade = isGroupAssignment ? savedGroupGrades[groupId] : null;
  const hasSavedGrade = Number.isFinite(savedGrade?.sharedScore) && savedGrade.sharedScore >= 0;
  const memberScores = hasSavedGrade ? members.map((member) => {
    const override = savedGrade.linked === false ? savedGrade.memberGrades?.[member.netid] : undefined;
    return Number.isFinite(override) && override >= 0 ? override : savedGrade.sharedScore;
  }) : [];
  const percentScores = memberScores.map((score) => Math.round(score / 32 * 1000) / 10);
  const savedTotal = percentScores.length
    ? Math.round(percentScores.reduce((sum, score) => sum + score, 0) / percentScores.length * 10) / 10
    : null;
  const savedRange = percentScores.length && savedGrade?.linked === false && Math.min(...percentScores) !== Math.max(...percentScores)
    ? `${scoreValue(Math.min(...percentScores))}–${scoreValue(Math.max(...percentScores))}`
    : null;
  const status = (isGroupAssignment && index === 0 ? 'graded' : initialStatuses[index]) || (index % 10 === 0 ? 'ungraded'
    : index % 10 === 1 ? 'regrade'
      : index % 10 === 2 ? 'partial' : 'graded');
  const rosterScore = isGroupAssignment
    ? Math.round(members.reduce((sum, member) => sum + member[`a${assignmentNumber}`], 0) / members.length)
    : student[`a${assignmentNumber}`];
  // This bonus-point example makes the over-max indicator visible in the mock table.
  const total = savedTotal ?? (['ungraded', 'not-submitted'].includes(status)
    ? null : !isGroupAssignment && index === 18 ? 104 : rosterScore);
  return {
    netid: isGroupAssignment ? groupId : student.netid,
    gradingNetid: isGroupAssignment ? groupId : student.netid,
    name: members.map((member) => `${member.first} ${member.last}`).join(', '),
    group: isGroupAssignment ? `Group ${index + 1}` : mockGroups[index % mockGroups.length],
    due: `2026-03-${String(7 + index % 4).padStart(2, '0')}`,
    status,
    grader: ['ungraded', 'not-submitted'].includes(status) ? '' : mockGraders[index % mockGraders.length],
    problem: `problem-${Math.floor(index / 2) % 4 + 1}`,
    section: index % 2 === 0 ? '001' : '002',
    total,
    gradeDisplay: savedRange,
    unresolvedComments: !isGroupAssignment && student.netid === 'ax53',
    extension: savedExtensions[isGroupAssignment ? `G${String(index + 1).padStart(3, '0')}` : student.netid] || '',
    // The shared mock roster tracks days remaining from a three-day allowance.
    slipDaysUsed: isGroupAssignment ? index % 4 : 3 - student.slipDays,
    fileCount: status === 'not-submitted' ? 0 : 4,
  };
});

const state = {
  search: '',
  problem: '',
  grader: '',
  section: '',
  status: '',
  scoreLow: 0,
  scoreHigh: 100,
  sortKey: null,
  sortDirection: 1,
  selected: new Set(),
  editingExtension: null,
  showAssignedTo: false,
};

const title = document.getElementById('assignmentTitle');
const body = document.getElementById('submissionsBody');
const tableShell = document.querySelector('.assignment-table-shell');
const selectAll = document.getElementById('selectAllRows');
const assignedToToggle = document.getElementById('toggleAssignedTo');
const assignedToHeader = document.getElementById('assignedToHeader');
const toast = document.getElementById('assignmentToast');
let toastTimer;

title.textContent = assignmentName;
document.title = `CMSX – ${assignmentName}`;
if (isGroupAssignment) document.getElementById('submissionIdHeading').textContent = 'Group ID';
if (isGroupAssignment) document.querySelector('[data-sort="name"]').dataset.sort = 'group';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function statusLabel(status) {
  return {
    graded: 'Graded',
    partial: 'Partially Submitted',
    ungraded: 'Ungraded',
    regrade: 'Regrade Pending',
    'not-submitted': 'Not Submitted',
  }[status] || status;
}

function scoreValue(value) {
  return value === null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function extensionLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function saveExtensions() {
  try {
    localStorage.setItem(extensionStorageKey, JSON.stringify(Object.fromEntries(
      submissions.filter((submission) => submission.extension).map(({ netid, extension }) => [netid, extension])
    )));
    return true;
  } catch {
    return false;
  }
}

function hasActiveFilters() {
  return Boolean(state.search || state.problem || state.grader || state.section || state.status
    || state.scoreLow !== 0 || state.scoreHigh !== 100);
}

function submissionMatchesFilters(submission, search) {
  const matchesSearch = !search
    || submission.netid.toLowerCase().includes(search)
    || submission.name.toLowerCase().includes(search)
    || submission.group.toLowerCase().includes(search);
  const matchesProblem = !state.problem || submission.problem === state.problem;
  const matchesGrader = !state.grader || submission.grader === state.grader;
  const matchesSection = !state.section || submission.section === state.section;
  const matchesStatus = !state.status || submission.status === state.status;
  const score = submission.total;
  const scoreFilterActive = state.scoreLow !== 0 || state.scoreHigh !== 100;
  const matchesScore = !scoreFilterActive || (score === null
    ? state.scoreLow === 0 && state.scoreHigh === 100
    : score >= state.scoreLow && score <= state.scoreHigh);
  return matchesSearch && matchesProblem && matchesGrader && matchesSection && matchesStatus && matchesScore;
}

function sortSubmissions(rows) {
  if (!state.sortKey) return rows;
  return rows.sort((left, right) => {
    const leftValue = left[state.sortKey];
    const rightValue = right[state.sortKey];
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * state.sortDirection;
    }
    return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true }) * state.sortDirection;
  });
}

function getFilterGroups() {
  const active = hasActiveFilters();
  if (!active) return { matches: sortSubmissions([...submissions]), nonmatches: [], active };

  const search = state.search.toLowerCase();
  const matches = [];
  const nonmatches = [];
  submissions.forEach((submission) => {
    (submissionMatchesFilters(submission, search) ? matches : nonmatches).push(submission);
  });
  return { matches: sortSubmissions(matches), nonmatches: sortSubmissions(nonmatches), active };
}

function renderRows() {
  const { matches, nonmatches, active } = getFilterGroups();
  const previousScrollTop = tableShell.scrollTop;
  const columnCount = document.querySelectorAll('.assignment-table thead th:not([hidden])').length;
  const rowMarkup = (rows, offset, isNonmatch = false) => rows.map((submission, index) => {
      const checked = state.selected.has(submission.netid);
      const gradeQuery = new URLSearchParams({ student: submission.gradingNetid, assignment: assignmentId });
      const submissionLabel = isGroupAssignment ? submission.group : submission.name;
      const extensionCell = state.editingExtension === submission.netid
        ? `<form class="assignment-extension-editor" data-extension-form="${escapeHtml(submission.netid)}">
            <label class="sr-only" for="extension-${escapeHtml(submission.netid)}">Extension deadline for ${escapeHtml(submissionLabel)}</label>
            <input id="extension-${escapeHtml(submission.netid)}" data-extension-input type="datetime-local" value="${escapeHtml(submission.extension)}" required />
            <button type="submit">Save</button>
            <button type="button" data-cancel-extension>Cancel</button>
            ${submission.extension ? '<button type="button" data-clear-extension>Remove</button>' : ''}
          </form>`
        : `<button class="assignment-extension-trigger" type="button" data-edit-extension="${escapeHtml(submission.netid)}" aria-label="${submission.extension ? 'Edit' : 'Add'} extension deadline for ${escapeHtml(submissionLabel)}">${escapeHtml(extensionLabel(submission.extension))}</button>`;
      return `<tr class="${isNonmatch ? 'filter-nonmatch ' : ''}${checked ? 'is-selected' : ''}" data-netid="${escapeHtml(submission.netid)}">
        <td class="selection-column"><input type="checkbox" aria-label="Select ${escapeHtml(submission.netid)}" data-row-select ${checked ? 'checked' : ''} /></td>
        <td class="number-column">${offset + index + 1}</td>
        <td>${escapeHtml(submission.netid)}</td>
        <td class="${isGroupAssignment ? 'group-members-column' : ''}">${isGroupAssignment ? `<strong>${escapeHtml(submission.group)}</strong><span>${escapeHtml(submission.name)}</span>` : escapeHtml(submission.name)}</td>
        <td><span class="submission-status-cell"><span class="submission-status ${submission.status}">${statusLabel(submission.status)}</span>${submission.unresolvedComments ? '<span class="submission-warning material-icons" role="img" aria-label="Unresolved comments" title="Unresolved comments">warning_amber</span>' : ''}</span></td>
        <td class="extension-column">${extensionCell}</td>
        <td class="slip-days-column">${submission.slipDaysUsed}</td>
        <td class="files-column">${submission.fileCount ? `${submission.fileCount} files` : 'No files'}</td>
        ${state.showAssignedTo ? `<td class="assigned-to-column">${escapeHtml(submission.grader ? graderNames[submission.grader] || submission.grader : 'Unassigned')}</td>` : ''}
        <td class="grade-column"><span class="submission-score">${submission.gradeDisplay || scoreValue(submission.total)}${submission.total !== null && submission.total > 100 ? '<span class="submission-warning material-icons" role="img" aria-label="Over max score" title="Over max score">warning_amber</span>' : ''}</span></td>
        <td class="actions-column">
          <div class="assignment-actions">
            <a class="assignment-row-icon grade-action" href="assignment-grading.html?${gradeQuery.toString()}" aria-label="Grade ${escapeHtml(submissionLabel)}'s submission" title="Grade submission">
              <span class="material-icons" aria-hidden="true">grading</span>
            </a>
            <button class="assignment-row-icon download-action" type="button" data-download="${escapeHtml(submission.netid)}" aria-label="Download ${escapeHtml(submissionLabel)}'s submission" title="${submission.fileCount ? 'Download submission' : 'No submission to download'}" ${submission.fileCount ? '' : 'disabled'}>
              <span class="material-icons" aria-hidden="true">download</span>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

  body.innerHTML = matches.length
    ? rowMarkup(matches, 0)
    : `<tr><td class="assignment-table-empty" colspan="${columnCount}">No submissions match the current filters.</td></tr>`;
  if (active && nonmatches.length) {
    body.insertAdjacentHTML('beforeend', `<tr class="assignment-filter-divider"><td colspan="${columnCount}"><div class="assignment-filter-divider-content"><span>Outside current filters</span><span class="assignment-filter-divider-count">${nonmatches.length} submission${nonmatches.length === 1 ? '' : 's'}</span></div></td></tr>${rowMarkup(nonmatches, matches.length, true)}`);
  }
  tableShell.scrollTop = previousScrollTop;

  updateVisibleSelection(matches, active);
  document.getElementById('filterResults').textContent = active
    ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`
    : `${matches.length} submission${matches.length === 1 ? '' : 's'}`;
  document.getElementById('clearFiltersButton').hidden = !active;
}

function renderFilteredRows() {
  tableShell.scrollTop = 0;
  renderRows();
}

assignedToToggle.addEventListener('click', () => {
  state.showAssignedTo = !state.showAssignedTo;
  if (!state.showAssignedTo && state.sortKey === 'grader') state.sortKey = null;
  assignedToHeader.hidden = !state.showAssignedTo;
  assignedToToggle.setAttribute('aria-pressed', String(state.showAssignedTo));
  assignedToToggle.textContent = state.showAssignedTo ? 'Hide assigned to' : 'Show assigned to';
  renderRows();
});

function updateVisibleSelection(matches = getFilterGroups().matches, active = hasActiveFilters()) {
  const selectedCount = matches.filter((submission) => state.selected.has(submission.netid)).length;
  selectAll.checked = matches.length > 0 && selectedCount === matches.length;
  selectAll.indeterminate = selectedCount > 0 && selectedCount < matches.length;
  selectAll.disabled = matches.length === 0;
  document.getElementById('selectFilteredStudents').disabled = !active || matches.length === 0 || selectedCount === matches.length;
  updateGroupOperations();
}

function updateGroupOperations() {
  const count = state.selected.size;
  document.getElementById('assignmentSelectionToolbar').hidden = count === 0;
  document.getElementById('assignmentSelectionCount').textContent = `${count} ${isGroupAssignment ? 'group' : 'submission'}${count === 1 ? '' : 's'} selected`;
  if (count === 0) document.getElementById('assignmentGroupMenu').open = false;

  [
    'gradeAllButton', 'gradeIndividuallyButton', 'gradingCsvButton',
    'filesButton', 'feedbackZipButton', 'emailSelectedButton',
    'assignGrader', 'bulkExtension',
  ].forEach((id) => {
    document.getElementById(id).disabled = count === 0;
  });
  updatePendingGroupActions();
}

function updatePendingGroupActions() {
  document.getElementById('applyExtensionsButton').disabled = !state.selected.size || !document.getElementById('bulkExtension').value;
  document.getElementById('assignGraderButton').disabled = !state.selected.size || !document.getElementById('assignGrader').value;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function downloadSubmission(netid) {
  const submission = submissions.find((item) => item.netid === netid);
  if (!submission || !submission.fileCount) return;
  const file = new Blob([
    `${assignmentName}\n${isGroupAssignment ? 'Group ID' : 'NetID'}: ${submission.netid}\nGroup: ${submission.group}\nMembers: ${submission.name}\nSubmission status: ${statusLabel(submission.status)}\n`,
  ], { type: 'text/plain' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${submission.netid}-${assignmentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${submission.netid}'s submission`);
}

function downloadGradingCsv() {
  const selected = submissions.filter((submission) => state.selected.has(submission.netid));
  if (!selected.length) return;
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    [isGroupAssignment ? 'Group ID' : 'NetID', 'Group', 'Submission Status', 'Score', 'Grader'],
    ...selected.map((submission) => [submission.netid, isGroupAssignment ? `${submission.group}: ${submission.name}` : submission.name, statusLabel(submission.status), submission.total ?? '', submission.grader]),
  ];
  const file = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${assignmentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-grading.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded grading CSV for ${selected.length} submission${selected.length === 1 ? '' : 's'}`);
}

document.querySelectorAll('[data-collapsible]').forEach((section) => {
  const button = section.querySelector('.assignment-tool-heading');
  const content = section.querySelector('.assignment-tool-body');
  button.addEventListener('click', () => {
    const willExpand = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willExpand));
    section.classList.toggle('is-collapsed', !willExpand);
    content.hidden = !willExpand;
  });
});

document.getElementById('studentFilter').addEventListener('input', (event) => {
  state.search = event.target.value.trim();
  renderFilteredRows();
});

document.getElementById('clearStudentSearch').addEventListener('click', () => {
  const input = document.getElementById('studentFilter');
  input.value = '';
  state.search = '';
  renderFilteredRows();
  input.focus();
});

document.getElementById('clearFiltersButton').addEventListener('click', () => {
  Object.assign(state, { search: '', problem: '', grader: '', section: '', status: '', scoreLow: 0, scoreHigh: 100 });
  ['studentFilter', 'problemFilter', 'graderFilter', 'sectionFilter', 'statusFilter'].forEach((id) => {
    const control = document.getElementById(id);
    control.value = '';
    if (control.tagName === 'SELECT') control.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.getElementById('scoreLowFilter').value = '0';
  document.getElementById('scoreHighFilter').value = '100';
  renderFilteredRows();
});

const groupMenu = document.getElementById('assignmentGroupMenu');
document.addEventListener('click', (event) => {
  if (!groupMenu.contains(event.target)) groupMenu.open = false;
});
groupMenu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    groupMenu.open = false;
    groupMenu.querySelector('summary').focus();
  }
});
groupMenu.querySelectorAll('.assignment-group-menu-item').forEach((button) => {
  button.addEventListener('click', () => { groupMenu.open = false; });
});

[
  ['problemFilter', 'problem'],
  ['graderFilter', 'grader'],
  ['sectionFilter', 'section'],
  ['statusFilter', 'status'],
].forEach(([id, stateKey]) => {
  document.getElementById(id).addEventListener('change', (event) => {
    state[stateKey] = event.target.value;
    renderFilteredRows();
  });
});

[
  ['scoreLowFilter', 'scoreLow'],
  ['scoreHighFilter', 'scoreHigh'],
].forEach(([id, stateKey]) => {
  document.getElementById(id).addEventListener('input', (event) => {
    const fallback = stateKey === 'scoreLow' ? 0 : 100;
    state[stateKey] = event.target.value === '' ? fallback : Number(event.target.value);
    renderFilteredRows();
  });
});

document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.sortKey === button.dataset.sort) state.sortDirection *= -1;
    else {
      state.sortKey = button.dataset.sort;
      state.sortDirection = 1;
    }
    renderFilteredRows();
  });
});

body.addEventListener('change', (event) => {
  if (!event.target.matches('[data-row-select]')) return;
  const row = event.target.closest('[data-netid]');
  if (event.target.checked) state.selected.add(row.dataset.netid);
  else state.selected.delete(row.dataset.netid);
  row.classList.toggle('is-selected', event.target.checked);
  updateVisibleSelection();
});

body.addEventListener('click', (event) => {
  const editExtension = event.target.closest('[data-edit-extension]');
  if (editExtension) {
    state.editingExtension = editExtension.dataset.editExtension;
    renderRows();
    body.querySelector('[data-extension-input]')?.focus();
    return;
  }
  if (event.target.closest('[data-cancel-extension]')) {
    state.editingExtension = null;
    renderRows();
    return;
  }
  if (event.target.closest('[data-clear-extension]')) {
    const submission = submissions.find((item) => item.netid === state.editingExtension);
    if (submission) submission.extension = '';
    state.editingExtension = null;
    const persisted = saveExtensions();
    renderRows();
    showToast(persisted ? 'Extension removed' : 'Extension removed for this session only');
    return;
  }
  const downloadButton = event.target.closest('[data-download]');
  if (downloadButton) {
    downloadSubmission(downloadButton.dataset.download);
    return;
  }
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.target.closest('a, button, input, select, textarea, label, form, [contenteditable]')) return;
  if (window.getSelection()?.toString()) return;
  const row = event.target.closest('tr[data-netid]');
  if (row) window.location.assign(row.querySelector('.grade-action').href);
});

body.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-extension-form]');
  if (!form) return;
  event.preventDefault();
  const submission = submissions.find((item) => item.netid === form.dataset.extensionForm);
  if (!submission) return;
  submission.extension = form.querySelector('[data-extension-input]').value;
  state.editingExtension = null;
  const persisted = saveExtensions();
  renderRows();
  showToast(persisted
    ? `Extension set for ${submission.name} until ${extensionLabel(submission.extension)}`
    : `Extension set for ${submission.name} for this session only`);
});

selectAll.addEventListener('change', () => {
  const shouldSelect = selectAll.checked;
  getFilterGroups().matches.forEach((submission) => {
    if (shouldSelect) state.selected.add(submission.netid);
    else state.selected.delete(submission.netid);
  });
  renderRows();
});

document.getElementById('selectFilteredStudents').addEventListener('click', () => {
  const { matches, active } = getFilterGroups();
  if (!active || !matches.length) return;
  matches.forEach((submission) => state.selected.add(submission.netid));
  renderRows();
  showToast(`${matches.length} filtered group${matches.length === 1 ? '' : 's'} selected`);
});

document.getElementById('gradeAllButton').addEventListener('click', () => {
  showToast(`Opened batch grading for ${state.selected.size} submissions`);
});

document.getElementById('gradeIndividuallyButton').addEventListener('click', () => {
  const first = [...state.selected][0];
  if (!first) return;
  const submission = submissions.find((item) => item.netid === first);
  const query = new URLSearchParams({ student: submission.gradingNetid, assignment: assignmentId });
  window.location.href = `assignment-grading.html?${query.toString()}`;
});

document.getElementById('gradingCsvButton').addEventListener('click', downloadGradingCsv);
document.getElementById('filesButton').addEventListener('click', () => {
  showToast('Bulk file download is not available in this prototype');
});
document.getElementById('feedbackZipButton').addEventListener('click', () => {
  showToast('Feedback ZIP export is not available in this prototype');
});

document.getElementById('bulkExtension').addEventListener('input', updatePendingGroupActions);
document.getElementById('applyExtensionsButton').addEventListener('click', () => {
  const input = document.getElementById('bulkExtension');
  if (!input.value || !state.selected.size) return;
  submissions.filter((item) => state.selected.has(item.netid)).forEach((item) => { item.extension = input.value; });
  const persisted = saveExtensions();
  input.value = '';
  groupMenu.open = false;
  renderRows();
  showToast(persisted
    ? `Extension set for ${state.selected.size} submission${state.selected.size === 1 ? '' : 's'}`
    : `Extension set for this session only`);
});

document.getElementById('assignGrader').addEventListener('change', updatePendingGroupActions);
document.getElementById('assignGraderButton').addEventListener('click', () => {
  const select = document.getElementById('assignGrader');
  if (!select.value || !state.selected.size) return;
  submissions.filter((item) => state.selected.has(item.netid)).forEach((item) => { item.grader = select.value; });
  showToast(`${select.value} assigned to ${state.selected.size} submission${state.selected.size === 1 ? '' : 's'}`);
  select.value = '';
  groupMenu.open = false;
  renderRows();
});

document.getElementById('emailSelectedButton').addEventListener('click', () => {
  showToast(`Email draft created for ${state.selected.size} groups`);
});

renderRows();
