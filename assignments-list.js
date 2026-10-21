import expandIcon from './assets/assignments/expand.svg';
import expandedIcon from './assets/assignments/expanded.svg';
import editIcon from './assets/assignments/edit.svg';
import unreadIcon from './assets/assignments/unread.svg';
import lateIcon from './assets/assignments/submitted-late.svg';
import regradeIcon from './assets/assignments/regrade.svg';
import flaggedIcon from './assets/assignments/flagged.svg';
import calendarCollapseIcon from './assets/assignments/calendar-collapse.svg';

const STORAGE_KEY = 'cmsx-assignments-list-v1';
const ASSIGNMENT_STATUSES = ['Hidden', 'Open', 'Closed', 'Graded & Open', 'Graded'];
const defaultAssignments = [
  { id: 'assignment-1', name: 'Assignment 1: Hello CMSX', type: 'Assignment', due: '2026-03-20', dueLabel: 'Mar 20, 2026 11:59 PM', points: 100, average: 90, submissions: 158, total: 160, status: 'Graded', expansion: 'statistics', progressWidth: 156 },
  { id: 'assignment-2', name: 'Assignment 2', type: 'Assignment', due: '2026-03-25', dueLabel: 'Mar 25, 2026 11:59 PM', points: 60, average: 84, submissions: 125, total: 160, status: 'Graded & Open', expansion: 'grading', unread: true, progressWidth: 124 },
  { id: 'assignment-3', name: 'Assignment 3', type: 'Assignment', due: '2026-03-30', dueLabel: 'Mar 30, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Closed' },
  { id: 'quiz-1', name: 'Quiz 1: Navigation & IA', type: 'Quiz', due: '2026-04-05', dueLabel: 'Apr 05, 2026 11:59 PM', points: 20, average: 94, submissions: 158, total: 160, status: 'Graded', expansion: 'statistics', progressWidth: 155 },
  { id: 'survey-midterm', name: 'Survey: Midterm Feedback', type: 'Survey', due: '2026-04-10', dueLabel: 'Apr 10, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Open' },
  { id: 'prelim-1', name: 'Prelim 1', type: 'Exam', due: '2026-04-15', dueLabel: 'Apr 15, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Hidden' },
  { id: 'prelim-2', name: 'Prelim 2', type: 'Exam', due: '2026-04-20', dueLabel: 'Apr 20, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Hidden' },
  { id: 'assignment-4', name: 'Assignment 4: Design Systems', type: 'Assignment', calendarStart: '2026-04-22', due: '2026-04-25', dueLabel: 'Apr 25, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Open' },
  { id: 'quiz-2', name: 'Quiz 2: Interaction Design', type: 'Quiz', due: '2026-04-30', dueLabel: 'Apr 30, 2026 11:59 PM', points: 20, average: 0, submissions: 0, total: 160, status: 'Hidden' },
  { id: 'survey-final', name: 'Survey: End-of-Course Feedback', type: 'Survey', due: '2026-05-05', dueLabel: 'May 05, 2026 11:59 PM', points: 0, average: 0, submissions: 0, total: 160, status: 'Hidden' },
];
const defaultDeleted = [
  { id: 'deleted-assignment-1', name: 'Assignment 1: Hello CMSX', type: 'Assignment' },
  { id: 'deleted-prelim-3', name: 'Prelim 3', type: 'Exam' },
  { id: 'deleted-survey', name: 'End of Semester Survey', type: 'Survey' },
  { id: 'deleted-assignment-4', name: 'Assignment 4', type: 'Assignment' },
  { id: 'deleted-assignment-4-copy', name: 'Assignment 4', type: 'Assignment' },
].map(item => ({ ...item, due: '2026-04-24', dueLabel: 'Apr 24, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Closed', deletedOn: 'Oct 24, 00:00 AM', deletedBy: 'Professor' }));
console.assert(defaultAssignments.every(item => ASSIGNMENT_STATUSES.includes(item.status)), 'Every assignment status needs a dropdown option.');

function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (value && Array.isArray(value.assignments) && Array.isArray(value.deleted)) {
      const knownIds = new Set([...value.assignments, ...value.deleted].map(item => item.id));
      const newAssignments = defaultAssignments.filter(item => !knownIds.has(item.id));
      const fixtureStartDates = new Map(defaultAssignments.filter(item => item.calendarStart).map(item => [item.id, item.calendarStart]));
      const assignments = value.assignments.map(item => item.calendarStart || !fixtureStartDates.has(item.id)
        ? item : { ...item, calendarStart: fixtureStartDates.get(item.id) });
      return { ...value, assignments: [...assignments, ...structuredClone(newAssignments)] };
    }
  } catch { /* Use the prototype's Figma fixtures when storage is unavailable. */ }
  return { assignments: structuredClone(defaultAssignments), deleted: structuredClone(defaultDeleted) };
}
let state = loadState();
let query = '';
let sortKey = '';
let sortDirection = 1;
let activeView = 'table';
let monthOffset = 0;
const expandedRows = new Set();
const collapsedCards = new Set();
const statusMenu = document.createElement('div');
statusMenu.className = 'assignment-status-menu cmsx-dropdown-menu';
statusMenu.id = 'assignmentStatusMenu';
statusMenu.setAttribute('role', 'listbox');
statusMenu.hidden = true;
document.body.append(statusMenu);
let statusMenuTrigger = null;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const icon = src => `<img src="${src}" alt="" aria-hidden="true" />`;
const chip = item => `<span class="assignment-type-pill assignment-type-${item.type.toLowerCase()}">${escape(item.type)}</span>`;
let toastTimeout;
function toast(message) {
  const element = document.getElementById('assignmentsToast');
  element.textContent = message;
  element.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove('is-visible'), 2600);
}
function saveState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    toast('Could not save the change in this browser.');
    return false;
  }
}
function visibleAssignments() {
  return state.assignments.filter(item => item.name.toLowerCase().includes(query)).sort((a,b) => {
    if (!sortKey) return 0;
    return String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }) * sortDirection;
  });
}
const isMutedStatus = item => item.status === 'Hidden' || item.status === 'Closed' || (item.status === 'Open' && item.submissions === 0);
const statusClass = status => status === 'Graded' ? 'is-graded' : status === 'Graded & Open' ? 'is-grading' : status === 'Open' ? 'is-open' : 'is-muted';
function actions(item, calendar = false) {
  const params = new URLSearchParams({ assignment: item.id });
  return `<div class="assignment-row-actions ${calendar ? 'is-calendar' : ''}">
    <a class="btn btn-outlined assignment-grade-link" href="assignment-grading.html?${params}" aria-label="Grade ${escape(item.name)}">Grade</a>
    <a class="assignment-edit-link" href="assignment-create.html?${params}&type=${item.type.toLowerCase()}" aria-label="Edit ${escape(item.name)}"><span>${icon(editIcon)}</span></a>
  </div>`;
}
function renderSummary() {
  document.getElementById('assignmentTotal').textContent = state.assignments.length;
  const counts = [
    ['Graded', state.assignments.filter(a => a.status === 'Graded').length],
    ['Upcoming', state.assignments.filter(a => a.status === 'Hidden').length],
    ['Open', state.assignments.filter(a => a.status.includes('Open')).length],
  ];
  document.getElementById('assignmentStatusCounts').innerHTML = counts.map(([label,count]) => `<div><dt>${label}</dt><dd>${count}</dd></div>`).join('');
}
function statistics(item) {
  const rows = [['90 - 100',42,''],['80-89',31,'167px'],['70-79',35,'153px'],['70-79',35,'115px']];
  return `<div class="assignment-expansion is-statistics" data-node-id="1979:24302">
    <section class="assignment-distribution" aria-label="Grade distribution for ${escape(item.name)}">
      <h3>Grade Distribution</h3>
      <div class="assignment-distribution-bars">${rows.map(([range,count,width]) => `<div class="assignment-distribution-row"><span>${range}</span><span class="assignment-distribution-bar" ${width ? `style="width:${width}"` : ''}></span><span>${count}</span></div>`).join('')}</div>
    </section>
    <section class="assignment-statistics" aria-label="Statistics for ${escape(item.name)}"><h3>Statistics</h3>
      <dl>${['Mean','Median','Std. Dev','Highest','Lowest','Passing (≥ 60%)'].map(label => `<div><dt>${label}</dt><dd>79.2</dd></div>`).join('')}</dl>
    </section>
  </div>`;
}
function grading(item) {
  const updates = [[lateIcon,'Submitted late'],[regradeIcon,'Regrade request'],[flaggedIcon,'Flagged by TA'],[flaggedIcon,'Flagged by TA']];
  return `<div class="assignment-expansion is-grading" data-node-id="1979:24433">
    <section class="assignment-grading-progress" aria-label="Grading progress for ${escape(item.name)}">
      <div class="assignment-grading-meter"><h3>Grading Progress <span>99%</span></h3>
        <div class="assignments-progress" role="progressbar" aria-label="Graded submissions" aria-valuemin="0" aria-valuemax="160" aria-valuenow="158"><span></span></div>
        <p>158/160 graded</p>
      </div>
      <button class="btn btn-primary assignment-release-grades" type="button" data-release-id="${item.id}">Release Grades</button>
    </section>
    <section class="assignment-updates" aria-label="Recent grading updates"><h3>Updates</h3>
      <div class="assignment-update-list">${updates.map(([src,label],index) => `<div class="assignment-update">
        <div class="assignment-update-top"><div class="assignment-update-user">${icon(src)}<div><a href="assignment-grading.html?assignment=${item.id}&student=jd123">John Doe</a><p>${label}</p></div></div><time>2 hrs ago</time></div>
        ${index > 1 ? '<p class="assignment-update-note">“Submission similar to another student.”</p>' : ''}
      </div>`).join('')}</div>
    </section>
  </div>`;
}
function renderTable() {
  closeStatusMenu();
  const items = visibleAssignments();
  document.getElementById('assignmentTableEmpty').hidden = items.length > 0;
  const body = document.getElementById('assignmentTableBody');
  body.innerHTML = items.map(item => {
    const isExpanded = expandedRows.has(item.id);
    const muted = isMutedStatus(item);
    const progress = item.progressWidth || Math.round(item.submissions / item.total * 160);
    return `<tr class="assignment-data-row ${isExpanded ? 'is-expanded' : ''}" data-assignment-id="${item.id}">
      <td class="assignment-expand-cell">${item.expansion ? `<button type="button" class="assignment-expand-button" data-expand-id="${item.id}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} ${escape(item.name)}" aria-expanded="${isExpanded}" aria-controls="assignment-details-${item.id}">${icon(isExpanded ? expandedIcon : expandIcon)}</button>` : ''}</td>
      <td><a class="assignment-name-link" href="assignment-detail.html?assignment=${item.id}">${item.unread ? icon(unreadIcon) : ''}<span>${escape(item.name)}</span></a></td>
      <td>${chip(item)}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.dueLabel}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.points}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.average}%</td>
      <td><div class="assignment-submissions"><span>${item.submissions}/${item.total} (${Math.round(item.submissions / item.total * 100)}%)</span><div class="assignments-progress" role="progressbar" aria-label="Submissions for ${escape(item.name)}" aria-valuemin="0" aria-valuemax="${item.total}" aria-valuenow="${item.submissions}"><span style="width:${progress}px"></span></div></div></td>
      <td class="assignment-status ${statusClass(item.status)}"><button class="assignment-status-trigger" type="button" data-status-id="${escape(item.id)}" aria-label="Status for ${escape(item.name)}: ${escape(item.status)}" aria-haspopup="listbox" aria-expanded="false" aria-controls="assignmentStatusMenu"><span class="assignment-status-value"><span class="assignment-status-label">${escape(item.status)}</span></span><span class="assignment-status-chevron" aria-hidden="true"></span></button></td>
      <td class="assignment-action-cell">${actions(item)}</td>
    </tr>${isExpanded ? `<tr class="assignment-detail-row" id="assignment-details-${item.id}"><td colspan="9">${item.expansion === 'statistics' ? statistics(item) : grading(item)}</td></tr>` : ''}`;
  }).join('');
  body.querySelectorAll('[data-expand-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.expandId;
    if (expandedRows.has(id)) expandedRows.delete(id); else expandedRows.add(id);
    renderTable();
    body.querySelector(`[data-expand-id="${id}"]`)?.focus({preventScroll:true});
  }));
  body.querySelectorAll('[data-release-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.releaseId;
    const next = { ...state, assignments: state.assignments.map(item => item.id === id ? { ...item, status: 'Graded', expansion: 'statistics', unread: false } : item) };
    if (saveState(next)) { renderSummary(); renderTable(); toast('Grades released.'); }
  }));
}
function closeStatusMenu(returnFocus = false) {
  if (!statusMenuTrigger) return;
  const trigger = statusMenuTrigger;
  trigger.setAttribute('aria-expanded', 'false');
  statusMenu.hidden = true;
  statusMenuTrigger = null;
  if (returnFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
}
function openStatusMenu(trigger) {
  closeStatusMenu();
  const item = state.assignments.find(assignment => assignment.id === trigger.dataset.statusId);
  if (!item) return;
  statusMenuTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  statusMenu.setAttribute('aria-label', `Status for ${item.name}`);
  statusMenu.innerHTML = ASSIGNMENT_STATUSES.map(status => `<div class="cmsx-dropdown-option" role="option" tabindex="-1" data-status-value="${escape(status)}" aria-selected="${item.status === status}">${escape(status)}</div>`).join('');
  statusMenu.hidden = false;
  const rect = trigger.getBoundingClientRect();
  const menuRect = statusMenu.getBoundingClientRect();
  statusMenu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menuRect.width - 8))}px`;
  statusMenu.style.top = `${rect.bottom + menuRect.height + 4 <= window.innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - menuRect.height - 4)}px`;
  statusMenu.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
}
function changeStatus(status) {
  const trigger = statusMenuTrigger;
  if (!trigger || !ASSIGNMENT_STATUSES.includes(status)) return;
  const item = state.assignments.find(assignment => assignment.id === trigger.dataset.statusId);
  if (!item) { closeStatusMenu(); return; }
  if (item.status === status) { closeStatusMenu(true); return; }
  const next = { ...state, assignments: state.assignments.map(assignment => assignment.id === item.id ? { ...assignment, status } : assignment) };
  if (!saveState(next)) { closeStatusMenu(true); return; }
  const row = trigger.closest('tr');
  trigger.closest('td').className = `assignment-status ${statusClass(status)}`;
  trigger.querySelector('.assignment-status-label').textContent = status;
  trigger.setAttribute('aria-label', `Status for ${item.name}: ${status}`);
  const muted = isMutedStatus({ ...item, status });
  for (const index of [3, 4, 5]) row.children[index].classList.toggle('is-muted', muted);
  renderSummary();
  closeStatusMenu(true);
  toast(`${item.name} set to ${status}.`);
}
document.getElementById('assignmentTableBody').addEventListener('click', event => {
  const trigger = event.target.closest('[data-status-id]');
  if (!trigger) return;
  if (statusMenuTrigger === trigger) closeStatusMenu(true);
  else openStatusMenu(trigger);
});
document.getElementById('assignmentTableBody').addEventListener('keydown', event => {
  const trigger = event.target.closest('[data-status-id]');
  if (!trigger || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  openStatusMenu(trigger);
});
statusMenu.addEventListener('click', event => {
  const option = event.target.closest('[data-status-value]');
  if (option) changeStatus(option.dataset.statusValue);
});
statusMenu.addEventListener('keydown', event => {
  const options = [...statusMenu.querySelectorAll('[role="option"]')];
  const index = options.indexOf(document.activeElement);
  if (event.key === 'Escape') { event.preventDefault(); closeStatusMenu(true); }
  else if (event.key === 'Tab') closeStatusMenu();
  else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); changeStatus(document.activeElement.dataset.statusValue); }
  else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next].focus({ preventScroll: true });
  }
});
document.addEventListener('click', event => {
  if (statusMenuTrigger && !statusMenu.contains(event.target) && !event.target.closest('[data-status-id]')) closeStatusMenu();
});
document.querySelector('.assignments-table-scroll').addEventListener('scroll', () => closeStatusMenu());
window.addEventListener('scroll', () => closeStatusMenu());
window.addEventListener('resize', () => closeStatusMenu());
function calendarCard(item, segment) {
  const expanded = !collapsedCards.has(item.id);
  const spansDays = segment.span > 1;
  return `<article class="assignment-calendar-card ${item.type === 'Survey' ? 'is-survey' : ''} ${spansDays ? 'is-span' : ''} ${segment.continuesBefore ? 'continues-before' : ''} ${segment.continuesAfter ? 'continues-after' : ''} ${expanded ? 'is-expanded' : ''}" style="grid-column:${segment.startColumn} / span ${segment.span};grid-row:${segment.lane + 2}">
    <div class="assignment-calendar-card-top"><div class="assignment-calendar-card-info"><div class="assignment-calendar-card-title"><a href="assignment-detail.html?assignment=${encodeURIComponent(item.id)}" title="${escape(item.name)}">${escape(item.name)}</a></div><span class="assignment-calendar-upcoming">${escape(item.status)}</span><p>DUE ${escape(item.dueLabel)}</p>${chip(item)}</div>
      <button type="button" class="assignment-calendar-card-toggle" data-calendar-card="${escape(item.id)}" data-calendar-segment="${escape(segment.weekStart)}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${escape(item.name)} calendar card" aria-expanded="${expanded}">${icon(calendarCollapseIcon)}</button>
    </div>
    ${expanded ? actions(item,true) : ''}
  </article>`;
}
function renderCalendar() {
  const date = new Date(Date.UTC(2026, 3 + monthOffset, 1));
  const monthName = date.toLocaleString('en-US', {month:'long',timeZone:'UTC'});
  document.getElementById('assignmentCalendarHeading').innerHTML = `<span>${monthName}</span> <span>${date.getUTCFullYear()}</span>`;
  const weekdays = ['Sun','Mon','Tues','Wed','Thurs','Fri','Sat'];
  const dateKey = value => {
    const key = String(value ?? '').slice(0, 10);
    const parsed = new Date(`${key}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === key ? key : null;
  };
  const assignments = visibleAssignments().flatMap(item => {
    const end = dateKey(item.due);
    if (!end) return [];
    const proposedStart = dateKey(item.calendarStart);
    return [{ item, start: proposedStart && proposedStart <= end ? proposedStart : end, end }];
  });
  const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const weekCount = Math.ceil((date.getUTCDay() + daysInMonth) / 7);
  const firstGridDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1 - date.getUTCDay()));
  let content = `<div class="assignment-calendar-weekdays">${weekdays.map(day=>`<div>${day}</div>`).join('')}</div>`;
  for (let week = 0; week < weekCount; week++) {
    const weekStart = new Date(firstGridDay);
    weekStart.setUTCDate(firstGridDay.getUTCDate() + week * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const weekStartKey = weekStart.toISOString().slice(0, 10);
    const weekEndKey = weekEnd.toISOString().slice(0, 10);
    const segments = assignments.filter(({ start, end }) => start <= weekEndKey && end >= weekStartKey).map(({ item, start, end }) => {
      const startColumn = Math.max(0, Math.round((Date.parse(`${start}T00:00:00Z`) - weekStart.getTime()) / 86400000)) + 1;
      const endColumn = Math.min(6, Math.round((Date.parse(`${end}T00:00:00Z`) - weekStart.getTime()) / 86400000)) + 1;
      return { item, weekStart: weekStartKey, startColumn, span: endColumn - startColumn + 1, endColumn, continuesBefore: start < weekStartKey, continuesAfter: end > weekEndKey };
    }).sort((a, b) => a.startColumn - b.startColumn || b.span - a.span);
    const laneEnds = [];
    segments.forEach(segment => {
      let lane = laneEnds.findIndex(endColumn => endColumn < segment.startColumn);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = segment.endColumn;
      segment.lane = lane;
    });
    const rowCount = Math.max(1, laneEnds.length);
    content += `<div class="assignment-calendar-week">${weekdays.map((day, index) => {
      const current = new Date(firstGridDay);
      current.setUTCDate(firstGridDay.getUTCDate() + week * 7 + index);
      const key = current.toISOString().slice(0, 10);
      const outside = current.getUTCMonth() !== date.getUTCMonth();
      return `<div class="assignment-calendar-day ${index === 0 || index === 6 ? 'is-weekend' : ''} ${outside ? 'is-outside-month' : ''}" style="grid-column:${index + 1};grid-row:1 / span ${rowCount + 1}" data-calendar-date="${key}"><span class="assignment-calendar-date">${current.getUTCDate()}</span></div>`;
    }).join('')}${segments.map(segment => calendarCard(segment.item, segment)).join('')}</div>`;
  }
  const calendar = document.getElementById('assignmentCalendar');
  calendar.innerHTML = content;
  calendar.querySelectorAll('[data-calendar-card]').forEach(button=>button.addEventListener('click',()=>{
    const slot=button.dataset.calendarCard;
    const segment=button.dataset.calendarSegment;
    if(collapsedCards.has(slot))collapsedCards.delete(slot);else collapsedCards.add(slot);
    renderCalendar();
    [...calendar.querySelectorAll('[data-calendar-card]')].find(candidate => candidate.dataset.calendarCard === slot && candidate.dataset.calendarSegment === segment)?.focus({preventScroll:true});
  }));
}
function renderViews() { renderTable(); renderCalendar(); }
function setView(view) {
  activeView = view;
  document.getElementById('assignmentTablePanel').hidden=view!=='table';
  document.getElementById('assignmentCalendarPanel').hidden=view!=='calendar';
  document.getElementById('assignmentTableToggle').setAttribute('aria-pressed',String(view==='table'));
  document.getElementById('assignmentCalendarToggle').setAttribute('aria-pressed',String(view==='calendar'));
}
const dialog=document.getElementById('deletedAssignmentsDialog');
const deletedList = document.getElementById('deletedAssignmentsList');
const deletedScrollbar = document.getElementById('deletedAssignmentsScrollbar');
function syncDeletedScrollbar() {
  const range = Math.max(0, deletedList.scrollHeight - deletedList.clientHeight);
  const ratio = range ? deletedList.scrollTop / range : 0;
  const travel = Math.max(0, deletedScrollbar.clientHeight - 52);
  deletedScrollbar.firstElementChild.style.transform = `translateY(${ratio * travel}px)`;
  deletedScrollbar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  deletedScrollbar.setAttribute('aria-disabled', String(range === 0));
}
deletedList.addEventListener('scroll', syncDeletedScrollbar);
let scrollbarDrag;
deletedScrollbar.addEventListener('pointerdown', event => {
  event.preventDefault();
  deletedScrollbar.focus();
  deletedScrollbar.setPointerCapture(event.pointerId);
  const range = Math.max(0, deletedList.scrollHeight - deletedList.clientHeight);
  const travel = Math.max(1, deletedScrollbar.clientHeight - 52);
  if (event.target === deletedScrollbar) {
    deletedList.scrollTop = (event.clientY - deletedScrollbar.getBoundingClientRect().top - 26) / travel * range;
  }
  scrollbarDrag = { y: event.clientY, scrollTop: deletedList.scrollTop };
  syncDeletedScrollbar();
});
deletedScrollbar.addEventListener('pointermove', event => {
  if (!scrollbarDrag) return;
  const range = Math.max(0, deletedList.scrollHeight - deletedList.clientHeight);
  const travel = Math.max(1, deletedScrollbar.clientHeight - 52);
  deletedList.scrollTop = scrollbarDrag.scrollTop + (event.clientY - scrollbarDrag.y) / travel * range;
});
deletedScrollbar.addEventListener('pointerup', () => { scrollbarDrag = null; });
deletedScrollbar.addEventListener('pointercancel', () => { scrollbarDrag = null; });
deletedScrollbar.addEventListener('keydown', event => {
  const steps = { ArrowDown: 40, ArrowUp: -40, PageDown: deletedList.clientHeight, PageUp: -deletedList.clientHeight };
  if (event.key in steps) { event.preventDefault(); deletedList.scrollTop += steps[event.key]; }
  if (event.key === 'Home') { event.preventDefault(); deletedList.scrollTop = 0; }
  if (event.key === 'End') { event.preventDefault(); deletedList.scrollTop = deletedList.scrollHeight; }
});
function renderDeleted() {
  const list=document.getElementById('deletedAssignmentsList');
  list.innerHTML=state.deleted.map(item=>`<article class="deleted-assignment">
    <div class="deleted-assignment-info">${chip(item)}<div><a href="assignment-detail.html?assignment=${item.id}">${escape(item.name)}</a><p><strong>Deleted on</strong> ${escape(item.deletedOn)} by ${escape(item.deletedBy)}</p></div></div>
    <button type="button" data-restore-assignment="${item.id}" aria-label="Restore ${escape(item.name)}">Restore</button>
  </article>`).join('')||'<p class="assignments-empty">No deleted assignments.</p>';
  list.querySelectorAll('[data-restore-assignment]').forEach(button=>button.addEventListener('click',()=>{
    const item=state.deleted.find(entry=>entry.id===button.dataset.restoreAssignment);
    const next={assignments:[...state.assignments,item],deleted:state.deleted.filter(entry=>entry.id!==item.id)};
    if(saveState(next)){renderSummary();renderViews();renderDeleted();syncDeletedScrollbar();toast('Assignment restored.');list.querySelector('[data-restore-assignment]')?.focus();}
  }));
}
document.getElementById('deletedAssignmentsButton').addEventListener('click',()=>{renderDeleted();dialog.showModal();syncDeletedScrollbar();});
document.getElementById('closeDeletedAssignments').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('close',()=>document.getElementById('deletedAssignmentsButton').focus());
document.getElementById('assignmentTableToggle').addEventListener('click',()=>setView('table'));
document.getElementById('assignmentCalendarToggle').addEventListener('click',()=>setView('calendar'));
document.getElementById('assignmentPreviousMonth').addEventListener('click',()=>{monthOffset--;renderCalendar();});
document.getElementById('assignmentNextMonth').addEventListener('click',()=>{monthOffset++;renderCalendar();});
document.getElementById('assignmentSearch').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();renderViews();});
document.getElementById('clearAssignmentSearch').addEventListener('click',()=>{document.getElementById('assignmentSearch').value='';query='';renderViews();document.getElementById('assignmentSearch').focus();});
document.querySelectorAll('[data-sort-key]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.sortKey;
  sortDirection=sortKey===key?-sortDirection:1;
  sortKey=key;
  document.querySelectorAll('[data-sort-column]').forEach(header=>header.setAttribute('aria-sort',header.dataset.sortColumn===key?(sortDirection===1?'ascending':'descending'):'none'));
  renderTable();
}));
renderSummary();
renderViews();
setView(activeView);
