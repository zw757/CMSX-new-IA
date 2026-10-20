import expandIcon from './assets/assignments/expand.svg';
import expandedIcon from './assets/assignments/expanded.svg';
import editIcon from './assets/assignments/edit.svg';
import unreadIcon from './assets/assignments/unread.svg';
import cancelIcon from './assets/assignments/cancel.svg';
import lateIcon from './assets/assignments/submitted-late.svg';
import regradeIcon from './assets/assignments/regrade.svg';
import flaggedIcon from './assets/assignments/flagged.svg';
import calendarCollapseIcon from './assets/assignments/calendar-collapse.svg';

const STORAGE_KEY = 'cmsx-assignments-list-v1';
const defaultAssignments = [
  { id: 'assignment-1', name: 'Assignment 1: Hello CMSX', type: 'Assignment', due: '2026-03-20', dueLabel: 'Mar 20, 2026 11:59 PM', points: 100, average: 90, submissions: 158, total: 160, status: 'Graded', expansion: 'statistics', progressWidth: 156 },
  { id: 'assignment-2', name: 'Assignment 2', type: 'Assignment', due: '2026-03-25', dueLabel: 'Mar 25, 2026 11:59 PM', points: 60, average: 84, submissions: 125, total: 160, status: 'Graded & Open', expansion: 'grading', unread: true, progressWidth: 124 },
  { id: 'assignment-3', name: 'Assignment 3', type: 'Assignment', due: '2026-03-30', dueLabel: 'Mar 30, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Closed' },
  { id: 'quiz-1', name: 'Quiz 1: Navigation & IA', type: 'Quiz', due: '2026-04-05', dueLabel: 'Apr 05, 2026 11:59 PM', points: 20, average: 94, submissions: 158, total: 160, status: 'Graded', expansion: 'statistics', progressWidth: 155 },
  { id: 'survey-midterm', name: 'Survey: Midterm Feedback', type: 'Survey', due: '2026-04-10', dueLabel: 'Apr 10, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Open' },
  { id: 'prelim-1', name: 'Prelim 1', type: 'Exam', due: '2026-04-15', dueLabel: 'Apr 15, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Hidden' },
  { id: 'prelim-2', name: 'Prelim 2', type: 'Exam', due: '2026-04-20', dueLabel: 'Apr 20, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Hidden' },
];
const defaultDeleted = [
  { id: 'deleted-assignment-1', name: 'Assignment 1: Hello CMSX', type: 'Assignment' },
  { id: 'deleted-prelim-3', name: 'Prelim 3', type: 'Exam' },
  { id: 'deleted-survey', name: 'End of Semester Survey', type: 'Survey' },
  { id: 'deleted-assignment-4', name: 'Assignment 4', type: 'Assignment' },
  { id: 'deleted-assignment-4-copy', name: 'Assignment 4', type: 'Assignment' },
].map(item => ({ ...item, due: '2026-04-24', dueLabel: 'Apr 24, 2026 11:59 PM', points: 100, average: 0, submissions: 0, total: 160, status: 'Closed', deletedOn: 'Oct 24, 00:00 AM', deletedBy: 'Professor' }));

function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (value && Array.isArray(value.assignments) && Array.isArray(value.deleted)) return value;
  } catch { /* Use the prototype's Figma fixtures when storage is unavailable. */ }
  return { assignments: structuredClone(defaultAssignments), deleted: structuredClone(defaultDeleted) };
}
let state = loadState();
let activeType = 'All';
let query = '';
let sortKey = '';
let sortDirection = 1;
let activeView = 'table';
let monthOffset = 0;
const expandedRows = new Set();
const collapsedCards = new Set();
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
  return state.assignments.filter(item => (activeType === 'All' || item.type === activeType) && item.name.toLowerCase().includes(query)).sort((a,b) => {
    if (!sortKey) return 0;
    return String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }) * sortDirection;
  });
}
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
function renderFilters() {
  const types = [['All','All'],['Assignment','Assignments'],['Exam','Exams'],['Quiz','Quizzes'],['Survey','Surveys']];
  const container = document.getElementById('assignmentTypeFilters');
  container.innerHTML = types.map(([type,label]) => `<button type="button" class="assignment-type-filter ${activeType === type ? 'is-active' : ''}" data-filter-type="${type}" aria-pressed="${activeType === type}">
    <span>${label}</span>${activeType === type ? icon(cancelIcon) : type === 'All' ? '' : `<span class="assignment-filter-count">${state.assignments.filter(a => a.type === type).length}</span>`}
  </button>`).join('');
  container.querySelectorAll('[data-filter-type]').forEach(button => button.addEventListener('click', () => {
    activeType = activeType === button.dataset.filterType ? 'All' : button.dataset.filterType;
    renderFilters();
    renderViews();
    container.querySelector(`[data-filter-type="${button.dataset.filterType}"]`)?.focus();
  }));
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
  const items = visibleAssignments();
  document.getElementById('assignmentTableEmpty').hidden = items.length > 0;
  const body = document.getElementById('assignmentTableBody');
  body.innerHTML = items.map(item => {
    const isExpanded = expandedRows.has(item.id);
    const muted = item.status === 'Hidden' || item.status === 'Closed' || (item.status === 'Open' && item.submissions === 0);
    const statusClass = item.status === 'Graded' ? 'is-graded' : item.status === 'Graded & Open' ? 'is-grading' : item.status === 'Open' ? 'is-open' : 'is-muted';
    const progress = item.progressWidth || Math.round(item.submissions / item.total * 160);
    return `<tr class="assignment-data-row ${isExpanded ? 'is-expanded' : ''}" data-assignment-id="${item.id}">
      <td class="assignment-expand-cell">${item.expansion ? `<button type="button" class="assignment-expand-button" data-expand-id="${item.id}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} ${escape(item.name)}" aria-expanded="${isExpanded}" aria-controls="assignment-details-${item.id}">${icon(isExpanded ? expandedIcon : expandIcon)}</button>` : ''}</td>
      <td><a class="assignment-name-link" href="assignment-detail.html?assignment=${item.id}">${item.unread ? icon(unreadIcon) : ''}<span>${escape(item.name)}</span></a></td>
      <td>${chip(item)}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.dueLabel}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.points}</td>
      <td class="${muted ? 'is-muted' : ''}">${item.average}%</td>
      <td><div class="assignment-submissions"><span>${item.submissions}/${item.total} (${Math.round(item.submissions / item.total * 100)}%)</span><div class="assignments-progress" role="progressbar" aria-label="Submissions for ${escape(item.name)}" aria-valuemin="0" aria-valuemax="${item.total}" aria-valuenow="${item.submissions}"><span style="width:${progress}px"></span></div></div></td>
      <td class="assignment-status ${statusClass}">${item.status}</td>
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
function calendarCard(item, slot, placement, compact = false) {
  const expanded = !collapsedCards.has(slot);
  const isSurvey = item.type === 'Survey';
  const name = isSurvey ? 'Survey: Midt...' : item.name;
  const due = isSurvey ? 'Apr 10, 11:59 PM' : compact ? 'Apr 17, 2026 11:59 PM' : 'Apr 17, 11:59 PM';
  return `<article class="assignment-calendar-card ${isSurvey ? 'is-survey' : ''} ${compact ? 'is-compact' : ''} ${expanded ? 'is-expanded' : ''}" style="${placement}">
    <div class="assignment-calendar-card-top"><div class="assignment-calendar-card-info"><div class="assignment-calendar-card-title"><a href="assignment-detail.html?assignment=${item.id}">${escape(name)}</a><span class="assignment-calendar-upcoming">Upcoming</span></div><p>DUE ${due}</p>${chip(item)}</div>
      ${compact ? '' : `<button type="button" class="assignment-calendar-card-toggle" data-calendar-card="${slot}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${escape(item.name)} calendar card" aria-expanded="${expanded}">${icon(calendarCollapseIcon)}</button>`}
    </div>
    ${!compact && expanded ? actions(item,true) : ''}
  </article>`;
}
function renderCalendar() {
  const date = new Date(Date.UTC(2026, 3 + monthOffset, 1));
  const monthName = date.toLocaleString('en-US', {month:'long',timeZone:'UTC'});
  document.getElementById('assignmentCalendarHeading').innerHTML = `<span>${monthName}</span> <span>${date.getUTCFullYear()}</span>`;
  const weekdays = ['Sun','Mon','Tues','Wed','Thurs','Fri','Sat'];
  let content = `<div class="assignment-calendar-weekdays">${weekdays.map(day=>`<div>${day}</div>`).join('')}</div>`;
  for (let week=0;week<2;week++) {
    content += `<div class="assignment-calendar-week assignment-calendar-week-${week}">${weekdays.map((day,index)=>{
      const number = monthOffset === 0 ? 12 : new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1 - date.getUTCDay() + week*7+index)).getUTCDate();
      return `<div class="assignment-calendar-day ${index===0||index===6?'is-weekend':''}"><span>${number}</span></div>`;
    }).join('')}`;
    if (monthOffset === 0) {
      const survey = visibleAssignments().find(item=>item.id==='survey-midterm');
      const assignment = visibleAssignments().find(item=>item.id==='assignment-3');
      if (week===0 && survey) content += calendarCard(survey,'survey','left:calc(100% / 7 + 10px);top:58px;width:196px;');
      if (week===0 && assignment) content += calendarCard(assignment,'assignment','left:calc(100% / 7 + 12px);right:31px;top:286px;');
      if (week===1 && assignment) content += calendarCard(assignment,'assignment-compact','left:29px;top:88px;width:392px;',true);
    } else {
      const monthAssignments = visibleAssignments().filter(item=>item.due.startsWith(date.toISOString().slice(0,7))).slice(week*7,week*7+7);
      content += monthAssignments.map((item,index)=>`<article class="assignment-calendar-card is-compact" style="left:calc(100% / 7 * ${index} + 10px);top:58px;width:196px;"><a href="assignment-detail.html?assignment=${item.id}">${escape(item.name)}</a><p>DUE ${item.dueLabel}</p>${chip(item)}</article>`).join('');
    }
    content += '</div>';
  }
  const calendar = document.getElementById('assignmentCalendar');
  calendar.innerHTML = content;
  calendar.querySelectorAll('[data-calendar-card]').forEach(button=>button.addEventListener('click',()=>{
    const slot=button.dataset.calendarCard;
    if(collapsedCards.has(slot))collapsedCards.delete(slot);else collapsedCards.add(slot);
    renderCalendar();
    calendar.querySelector(`[data-calendar-card="${slot}"]`)?.focus({preventScroll:true});
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
    if(saveState(next)){renderSummary();renderFilters();renderViews();renderDeleted();syncDeletedScrollbar();toast('Assignment restored.');list.querySelector('[data-restore-assignment]')?.focus();}
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
renderFilters();
renderViews();
setView(activeView);
