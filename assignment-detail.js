const params = new URLSearchParams(window.location.search);
const assignmentName = params.get('assignment')?.trim() || 'Assignment 3: Grading Systems';
const pageSize = 10;

const submissions = [
  { netid: 'zw757', group: 'May', due: '2026-03-09', status: 'complete', grader: 'May', section: '001', partA: 78.5, partB: 92, total: 81.5 },
  { netid: 'ab123', group: 'Group Alpha', due: '2026-03-09', status: 'complete', grader: 'Sylvia', section: '001', partA: 88, partB: 91, total: 89.5 },
  { netid: 'cd456', group: 'Group Beta', due: '2026-03-10', status: 'partial', grader: 'Erica', section: '002', partA: 72, partB: null, total: 72 },
  { netid: 'ef789', group: 'Group Gamma', due: '2026-03-09', status: 'regrade', grader: 'May', section: '001', partA: 84, partB: 86, total: 85 },
  { netid: 'gh012', group: 'Group Alpha', due: '2026-03-09', status: 'complete', grader: 'Sylvia', section: '001', partA: 97, partB: 95, total: 96 },
  { netid: 'ij345', group: 'Group Delta', due: '2026-03-08', status: 'complete', grader: 'Erica', section: '002', partA: 80, partB: 82, total: 81 },
  { netid: 'kl678', group: 'Group Epsilon', due: '2026-03-09', status: 'complete', grader: 'May', section: '001', partA: 90, partB: 94, total: 92 },
  { netid: 'mn901', group: 'Ungrouped', due: '2026-03-09', status: 'ungraded', grader: '', section: '002', partA: null, partB: null, total: null },
  { netid: 'op234', group: 'Group Beta', due: '2026-03-10', status: 'partial', grader: 'Erica', section: '002', partA: 70, partB: null, total: 70 },
  { netid: 'qr567', group: 'Ungrouped', due: '2026-03-09', status: 'ungraded', grader: '', section: '001', partA: null, partB: null, total: null },
  { netid: 'st890', group: 'Group Gamma', due: '2026-03-09', status: 'complete', grader: 'Sylvia', section: '001', partA: 92, partB: 94, total: 93 },
  { netid: 'uv123', group: 'Group Delta', due: '2026-03-09', status: 'complete', grader: 'May', section: '002', partA: 83, partB: 87, total: 85 },
  { netid: 'wx456', group: 'Group Epsilon', due: '2026-03-09', status: 'regrade', grader: 'Erica', section: '002', partA: 70, partB: 76, total: 73 },
  { netid: 'yz789', group: 'Group Alpha', due: '2026-03-07', status: 'complete', grader: 'Sylvia', section: '001', partA: 97, partB: 99, total: 98 },
  { netid: 'ff666', group: 'Group Gamma', due: '2026-03-09', status: 'complete', grader: 'May', section: '002', partA: 96, partB: 98, total: 97 },
];

const state = {
  chip: 'all',
  search: '',
  grader: '',
  section: '',
  status: '',
  due: '',
  scoreLow: 0,
  scoreHigh: 100,
  sortKey: null,
  sortDirection: 1,
  page: 1,
  selected: new Set(),
};

const title = document.getElementById('assignmentTitle');
const body = document.getElementById('submissionsBody');
const statusChips = document.getElementById('statusChips');
const selectAll = document.getElementById('selectAllRows');
const toast = document.getElementById('assignmentToast');
let toastTimer;

title.textContent = assignmentName;
document.title = `CMSX – ${assignmentName}`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function displayDate(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

function statusLabel(status) {
  return {
    complete: 'Complete',
    partial: 'Partially Submitted',
    ungraded: 'Ungraded',
    regrade: 'Regrade Pending',
  }[status] || status;
}

function scoreValue(value) {
  return value === null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function matchesChip(submission) {
  return state.chip === 'all' || submission.status === state.chip;
}

function filteredSubmissions() {
  const search = state.search.toLowerCase();
  const filtered = submissions.filter((submission) => {
    const matchesSearch = !search
      || submission.netid.toLowerCase().includes(search)
      || submission.group.toLowerCase().includes(search);
    const matchesGrader = !state.grader || submission.grader === state.grader;
    const matchesSection = !state.section || submission.section === state.section;
    const matchesStatus = !state.status || submission.status === state.status;
    const matchesDue = !state.due || submission.due === state.due;
    const score = submission.total;
    const matchesScore = score === null
      ? state.scoreLow === 0 && state.scoreHigh === 100
      : score >= state.scoreLow && score <= state.scoreHigh;
    return matchesSearch && matchesGrader && matchesSection && matchesStatus && matchesDue && matchesScore && matchesChip(submission);
  });

  if (!state.sortKey) return filtered;

  return filtered.sort((left, right) => {
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

function renderChips() {
  const definitions = [
    ['all', 'All'],
    ['ungraded', 'Ungraded'],
    ['regrade', 'Regrade Pending'],
    ['partial', 'Partially Submitted'],
    ['complete', 'Complete'],
  ];

  statusChips.innerHTML = definitions.map(([key, label]) => {
    const count = key === 'all' ? submissions.length : submissions.filter((submission) => submission.status === key).length;
    return `<button class="submission-chip${state.chip === key ? ' active' : ''}" type="button" data-chip="${key}" aria-pressed="${state.chip === key}">
      <span>${label}</span><span class="submission-chip-count">${count}</span>
    </button>`;
  }).join('');
}

function renderRows() {
  const filtered = filteredSubmissions();
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  if (!visible.length) {
    body.innerHTML = '<tr><td class="assignment-table-empty" colspan="10">No submissions match these filters.</td></tr>';
  } else {
    body.innerHTML = visible.map((submission, index) => {
      const checked = state.selected.has(submission.netid);
      const gradeQuery = new URLSearchParams({ student: submission.netid, assignment: assignmentName });
      return `<tr class="${checked ? 'is-selected' : ''}" data-netid="${escapeHtml(submission.netid)}">
        <td class="selection-column"><input type="checkbox" aria-label="Select ${escapeHtml(submission.netid)}" data-row-select ${checked ? 'checked' : ''} /></td>
        <td class="number-column">${start + index + 1}</td>
        <td>${escapeHtml(submission.netid)}</td>
        <td>${escapeHtml(submission.group)}</td>
        <td>${displayDate(submission.due)}</td>
        <td><span class="submission-status ${submission.status}">${statusLabel(submission.status)}</span></td>
        <td class="grade-column">${scoreValue(submission.partA)}</td>
        <td>${scoreValue(submission.partB)}</td>
        <td>${scoreValue(submission.total)}</td>
        <td class="actions-column">
          <div class="assignment-actions">
            <a class="assignment-row-button" href="assignment-grading.html?${gradeQuery.toString()}">Grade</a>
            <button class="assignment-row-button" type="button" data-download="${escapeHtml(submission.netid)}">Download</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  const visibleIds = visible.map((submission) => submission.netid);
  const visibleSelected = visibleIds.filter((netid) => state.selected.has(netid)).length;
  selectAll.checked = visibleIds.length > 0 && visibleSelected === visibleIds.length;
  selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visibleIds.length;
  document.getElementById('resultCount').textContent = `${filtered.length} submission${filtered.length === 1 ? '' : 's'}`;
  document.getElementById('pageLabel').textContent = `Page ${state.page} of ${pageCount}`;
  document.getElementById('previousPageButton').disabled = state.page === 1;
  document.getElementById('nextPageButton').disabled = state.page === pageCount;
  updateGroupOperations();
}

function resetToFirstPageAndRender() {
  state.page = 1;
  renderRows();
}

function updateGroupOperations() {
  const count = state.selected.size;
  document.getElementById('selectionHelp').textContent = count
    ? `${count} submission${count === 1 ? '' : 's'} selected`
    : 'Please select rows to begin group operations';

  [
    'gradeAllButton', 'gradeIndividuallyButton', 'groupStudentsButton',
    'assignGrader', 'assignPart', 'bulkDueDate', 'emailSelectedButton',
  ].forEach((id) => {
    document.getElementById(id).disabled = count === 0;
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function downloadSubmission(netid) {
  const submission = submissions.find((item) => item.netid === netid);
  if (!submission) return;
  const file = new Blob([
    `${assignmentName}\nStudent: ${submission.netid}\nGroup: ${submission.group}\nSubmission status: ${statusLabel(submission.status)}\n`,
  ], { type: 'text/plain' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${submission.netid}-${assignmentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${submission.netid}'s submission`);
}

document.querySelectorAll('[data-collapsible]').forEach((section) => {
  const button = section.querySelector('.assignment-tool-heading');
  const content = section.querySelector('.assignment-information, .assignment-tool-body');
  button.addEventListener('click', () => {
    const willExpand = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willExpand));
    section.classList.toggle('is-collapsed', !willExpand);
    content.hidden = !willExpand;
  });
});

document.getElementById('progressDetailsButton').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const popover = document.getElementById('progressPopover');
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  popover.hidden = expanded;
});

statusChips.addEventListener('click', (event) => {
  const button = event.target.closest('[data-chip]');
  if (!button) return;
  state.chip = button.dataset.chip;
  renderChips();
  resetToFirstPageAndRender();
});

document.getElementById('studentFilter').addEventListener('input', (event) => {
  state.search = event.target.value.trim();
  resetToFirstPageAndRender();
});

[
  ['graderFilter', 'grader'],
  ['sectionFilter', 'section'],
  ['statusFilter', 'status'],
  ['dueDateFilter', 'due'],
].forEach(([id, stateKey]) => {
  document.getElementById(id).addEventListener('change', (event) => {
    state[stateKey] = event.target.value;
    resetToFirstPageAndRender();
  });
});

[
  ['scoreLowFilter', 'scoreLow'],
  ['scoreHighFilter', 'scoreHigh'],
].forEach(([id, stateKey]) => {
  document.getElementById(id).addEventListener('input', (event) => {
    const fallback = stateKey === 'scoreLow' ? 0 : 100;
    state[stateKey] = event.target.value === '' ? fallback : Number(event.target.value);
    resetToFirstPageAndRender();
  });
});

document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.sortKey === button.dataset.sort) state.sortDirection *= -1;
    else {
      state.sortKey = button.dataset.sort;
      state.sortDirection = 1;
    }
    renderRows();
  });
});

body.addEventListener('change', (event) => {
  if (!event.target.matches('[data-row-select]')) return;
  const row = event.target.closest('[data-netid]');
  if (event.target.checked) state.selected.add(row.dataset.netid);
  else state.selected.delete(row.dataset.netid);
  renderRows();
});

body.addEventListener('click', (event) => {
  const downloadButton = event.target.closest('[data-download]');
  if (downloadButton) downloadSubmission(downloadButton.dataset.download);
});

selectAll.addEventListener('change', () => {
  const visible = filteredSubmissions().slice((state.page - 1) * pageSize, state.page * pageSize);
  visible.forEach((submission) => {
    if (selectAll.checked) state.selected.add(submission.netid);
    else state.selected.delete(submission.netid);
  });
  renderRows();
});

document.getElementById('previousPageButton').addEventListener('click', () => {
  state.page = Math.max(1, state.page - 1);
  renderRows();
});

document.getElementById('nextPageButton').addEventListener('click', () => {
  state.page += 1;
  renderRows();
});

document.getElementById('gradeAllButton').addEventListener('click', () => {
  showToast(`Opened batch grading for ${state.selected.size} submissions`);
});

document.getElementById('gradeIndividuallyButton').addEventListener('click', () => {
  const first = [...state.selected][0];
  if (!first) return;
  const query = new URLSearchParams({ student: first, assignment: assignmentName });
  window.location.href = `assignment-grading.html?${query.toString()}`;
});

document.getElementById('groupStudentsButton').addEventListener('click', () => {
  const groupName = `Group ${String.fromCharCode(65 + Math.min(25, state.selected.size))}`;
  submissions.filter((item) => state.selected.has(item.netid)).forEach((item) => { item.group = groupName; });
  showToast(`${state.selected.size} students added to ${groupName}`);
  renderRows();
});

document.getElementById('assignGrader').addEventListener('change', (event) => {
  if (!event.target.value) return;
  submissions.filter((item) => state.selected.has(item.netid)).forEach((item) => { item.grader = event.target.value; });
  showToast(`${event.target.value} assigned to ${state.selected.size} submissions`);
  event.target.value = '';
  renderRows();
});

document.getElementById('assignPart').addEventListener('change', (event) => {
  if (!event.target.value) return;
  showToast(`${event.target.value} assigned for ${state.selected.size} submissions`);
  event.target.value = '';
});

document.getElementById('bulkDueDate').addEventListener('change', (event) => {
  if (!event.target.value) return;
  submissions.filter((item) => state.selected.has(item.netid)).forEach((item) => { item.due = event.target.value; });
  showToast(`Due date updated for ${state.selected.size} submissions`);
  event.target.value = '';
  renderRows();
});

document.getElementById('emailSelectedButton').addEventListener('click', () => {
  showToast(`Email draft created for ${state.selected.size} students`);
});

renderChips();
renderRows();
