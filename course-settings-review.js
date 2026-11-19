import { STAFF_PERMISSIONS, staffPrivileges } from './course-staff-state.mjs';
import { reviewIcons } from './course-settings-assets.js';
import { infoButton } from './course-settings-help.js';
import { textChanges, booleanChange, accessValue, compareRows } from './course-settings-diff.mjs';

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function img(src, width, height, alt = '') {
  const image = el('img'); Object.assign(image, { src, width, height, alt }); return image;
}
function check(label = '', change = 'same') {
  const icon = { added: 'checkAdded', removed: 'checkRemoved', disabled: 'checkDisabled' }[change] || 'check';
  return img(reviewIcons[icon], 42, 42, label);
}
function section(id, title, card) {
  const details = el('details', 'settings-section'); details.id = `review-${id}`; details.open = true;
  const summary = el('summary'); summary.append(el('h2', '', title), img(reviewIcons.expand, 24, 24));
  summary.lastChild.className = 'section-chevron'; details.append(summary, card); return details;
}
function appendTextChanges(root, before, after) {
  before = String(before ?? ''); after = String(after ?? '');
  if (before === after) { root.append(document.createTextNode(after || '-')); return; }
  root.dataset.changed = 'true';
  for (const part of textChanges(before, after)) {
    if (part.type === 'same') root.append(document.createTextNode(part.text));
    else {
      const change = el(part.type === 'added' ? 'ins' : 'del', `review-diff-${part.type}`);
      change.append(el('span', 'staff-sr-only', `${part.type === 'added' ? 'Added' : 'Removed'}: `), document.createTextNode(part.text));
      root.append(change);
    }
  }
  if (!after) root.append(el('span', 'staff-sr-only', 'Now empty.'));
}
function field(label, value, before = value) {
  const group = el('div', 'review-field'), content = el('dd'); appendTextChanges(content, before, value);
  group.append(el('dt', '', label), content); return group;
}
function enabledRow(label, description, change = 'same', mutedRemoval = false) {
  const row = el('div', 'review-enabled-row'); const copy = el('div', 'settings-copy');
  if (change !== 'same') {
    row.classList.add(`review-diff-${change}`);
    if (change === 'removed' && mutedRemoval) row.classList.add('review-feature-removed');
    row.dataset.change = change;
    copy.append(el('span', 'staff-sr-only', change === 'added' ? 'Enabled: ' : 'Disabled: '));
  }
  copy.append(el('p', 'settings-label', label)); if (description) copy.append(el('p', 'settings-description', description));
  row.append(check('', change === 'removed' ? 'disabled' : 'same'), copy); return row;
}
function accessGroup(settings, previous, audience, title, description, labels) {
  const enabled = settings[`${audience}Access`]; const group = el('div', `review-access-group${enabled ? '' : ' is-locked'}`);
  const header = el('div', 'review-access-heading'), copy = el('div', 'settings-copy');
  const accessChange = booleanChange(previous[`${audience}Access`], enabled);
  if (accessChange !== 'same') {
    header.classList.add(`review-diff-${accessChange}`);
    header.append(el('span', 'staff-sr-only', accessChange === 'added' ? 'Access enabled: ' : 'Access disabled: '));
  }
  copy.append(el('h3', '', title), el('p', 'settings-description', enabled ? description : audience === 'guest'
    ? "Anyone signed in without a Cornell account can't view this course." : 'Cornell users cannot view this course without enrollment.'));
  if (!enabled) header.append(img(reviewIcons.lock, 32, 32));
  header.append(copy); group.append(header);
  if (enabled || previous[`${audience}Access`]) {
    const list = el('div', 'review-access-options');
    for (const [suffix, label] of labels) {
      const before = accessValue(previous, audience, suffix), after = accessValue(settings, audience, suffix);
      if (before || after) list.append(enabledRow(label, '', booleanChange(before, after)));
    }
    if (!list.children.length) list.append(el('p', 'review-empty-note', 'No course content selected.'));
    group.append(list);
  }
  return group;
}
function markRow(row, change, label) {
  if (change === 'same') return;
  row.classList.add(`review-row-${change}`); row.dataset.change = change;
  row.setAttribute('aria-label', `${change === 'added' ? 'Added' : 'Removed'} ${label}`);
}
function permissionCell(before, after, rowChange = 'same') {
  const td = el('td', 'review-privilege');
  if (rowChange !== 'same') {
    if (rowChange === 'removed' ? before : after) td.append(check(rowChange === 'added' ? 'Allowed' : 'Previously allowed', rowChange === 'removed' ? 'disabled' : 'same'));
    else td.append(el('span', 'staff-sr-only', 'Not allowed'));
    return td;
  }
  const change = booleanChange(before, after);
  if (change !== 'same') {
    td.dataset.change = change;
    td.append(check(change === 'added' ? 'Added permission: Allowed' : 'Removed permission: Not allowed', change));
  } else td.append(after ? check('Allowed') : el('span', 'staff-sr-only', 'Not allowed'));
  return td;
}
function table(headers, className, caption) {
  const scroll = el('div', `table-scroll-wrapper${className === 'review-staff-table' ? ' staff-responsive-container' : ''}`); scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', caption);
  const table = el('table', `data-table ${className}`); table.append(el('caption', 'staff-sr-only', caption));
  const head = el('thead'), row = el('tr');
  headers.forEach((label, index) => {
    const th = el('th'); th.scope = 'col';
    const content = el(index === 0 ? 'button' : 'span', 'review-table-heading', label);
    if (index === 0) {
      content.type = 'button'; th.setAttribute('aria-sort', 'none');
      content.append(img(reviewIcons.sort, 20, 20));
      content.addEventListener('click', () => {
        const ascending = th.getAttribute('aria-sort') !== 'ascending';
        th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
        body.replaceChildren(...[...body.children].sort((a, b) => a.cells[0].textContent.localeCompare(b.cells[0].textContent) * (ascending ? 1 : -1)));
      });
    }
    if (['Groups', 'Grades', 'Assignments', 'Content', 'Allowed Extensions'].includes(label)) {
      content.append(infoButton(label));
    }
    th.append(content); row.append(th);
  });
  head.append(row); const body = el('tbody'); table.append(head, body); scroll.append(table); return { scroll, body };
}
export function renderSettingsReview(root, snapshot, baseline = snapshot) {
  const { settings, staff, filetypes } = snapshot;
  const previous = baseline.settings;
  root.replaceChildren(el('h2', 'staff-sr-only', 'Review course settings before confirming changes'));
  const general = el('div', 'settings-card settings-general review-general');
  const main = el('dl', 'settings-general-main');
  main.append(field('Course Name', settings.courseName, previous.courseName), field('Course Description', settings.courseDescription, previous.courseDescription));
  const meta = el('dl', 'settings-general-meta');
  for (const [label, key] of [['Course code', 'courseCode'], ['Displayed course code', 'displayedCourseCode'], ['Credits', 'credits'], ['Semester', 'semester']]) meta.append(field(label, settings[key], previous[key]));
  general.append(main, meta); root.append(section('general-properties', 'General Properties', general));
  const access = el('div', 'settings-card settings-columns review-access');
  const labels = [['Announcements', 'View course announcements'], ['Assignments', 'View assignments and download files'], ['Solutions', 'Download solutions once assignment is Graded']];
  access.append(accessGroup(settings, previous, 'cornell', 'Cornell Community Access', 'Anyone signed in with a Cornell NetID can access selected course content.', labels),
    accessGroup(settings, previous, 'guest', 'Guest Access', 'Visitors without a Cornell account can access selected course content.', labels.map(([key, text]) => [key, key === 'Assignments' ? 'View course assignments' : text])));
  root.append(section('access', 'Access', access));
  const staffCard = el('div', 'settings-card review-staff-card');
  const members = compareRows(baseline.staff.members, staff.members, member => member.netid);
  if (members.length) {
    const { scroll, body } = table(['Staff Member', 'Role', 'Groups', 'Grades', 'Assignments', 'Content'], 'review-staff-table', 'Review staff privileges');
    for (const entry of members) {
      const member = entry.after || entry.before;
      const row = el('tr'), person = el('td'), identity = el('span', 'staff-person');
      const name = el('span', 'staff-person-name');
      appendTextChanges(name, entry.change === 'same' ? entry.before.name || entry.before.netid : member.name || member.netid, member.name || member.netid);
      identity.append(name);
      if (member.name) identity.append(el('span', 'staff-person-netid', member.netid)); person.append(identity);
      const role = el('td'); appendTextChanges(role, entry.change === 'same' ? entry.before.role : member.role, member.role);
      row.append(person, role); markRow(row, entry.change, `staff member ${member.name || member.netid}`);
      const before = entry.before ? staffPrivileges(entry.before, baseline.staff.roles) : {};
      const after = entry.after ? staffPrivileges(entry.after, staff.roles) : {};
      for (const permission of STAFF_PERMISSIONS) row.append(permissionCell(before[permission], after[permission], entry.change));
      body.append(row);
    }
    staffCard.append(scroll);
  } else staffCard.append(el('p', 'review-empty-note', 'No course staff added.'));
  const changedRoles = compareRows(baseline.staff.roles, staff.roles, role => role.name.toLowerCase())
    .filter(entry => entry.change !== 'same' || entry.before.name !== entry.after.name || STAFF_PERMISSIONS.some(p => !!entry.before[p] !== !!entry.after[p]));
  if (changedRoles.length) {
    const roles = el('div', 'review-role-changes'); roles.append(el('h3', '', 'Role settings'));
    const { scroll, body } = table(['Role', 'Groups', 'Grades', 'Assignments', 'Content'], 'review-role-table', 'Changes to staff role settings');
    for (const entry of changedRoles) {
      const role = entry.after || entry.before, row = el('tr'), name = el('td');
      appendTextChanges(name, entry.change === 'same' ? entry.before.name : role.name, role.name); row.append(name);
      markRow(row, entry.change, `role ${role.name}`);
      for (const p of STAFF_PERMISSIONS) row.append(permissionCell(entry.before?.[p], entry.after?.[p], entry.change));
      body.append(row);
    }
    roles.append(scroll); staffCard.append(roles);
  }
  const emailChange = booleanChange(baseline.staff.notifyByEmail, staff.notifyByEmail);
  if (emailChange !== 'same') staffCard.append(enabledRow('Notify staff changes by email', '', emailChange, true));
  root.append(section('staff-privileges', 'Staff Privileges', staffCard));
  const features = el('div', 'settings-card review-features'), columns = el('div', 'settings-columns');
  for (const [title, entries] of [
    ['Course Structure', [['enableSections', 'Enable sections', 'Allow this course to support sections.'], ['enableSlipDays', 'Enable slip days', 'Track days an assignment was submitted after the deadline.']]],
    ['Student Grades', [['showTotalScores', 'Show total scores to students', 'Cumulative total score across all assignments.'], ['showAssignmentWeights', 'Show assignment weights to students', 'How each assignment is weighted toward the total score.'], ['releaseFinalGrades', 'Release final grades to students']]],
  ]) {
    const group = el('div', 'settings-group'); group.append(el('h3', '', title));
    const enabled = entries.filter(([key]) => settings[key] || previous[key]);
    for (const [key, label, description] of enabled) group.append(enabledRow(label, description, booleanChange(previous[key], settings[key]), true));
    if (!enabled.length) group.append(el('p', 'review-empty-note', 'No features enabled.')); columns.append(group);
  }
  features.append(columns);
  const fileGroup = el('div', 'settings-group review-filetypes'); fileGroup.append(el('h3', '', 'Custom Filetypes'));
  const filetypeChanges = compareRows(baseline.filetypes, filetypes, filetype => filetype.id);
  if (filetypeChanges.length) {
    const { scroll, body } = table(['Name', 'Allowed Extensions'], 'review-filetypes-table', 'Review custom filetypes');
    for (const entry of filetypeChanges) {
      const filetype = entry.after || entry.before, row = el('tr');
      for (const key of ['name', 'extensions']) {
        const cell = el('td'); appendTextChanges(cell, entry.change === 'same' ? entry.before[key] : filetype[key], filetype[key]); row.append(cell);
      }
      markRow(row, entry.change, `filetype ${filetype.name}`); body.append(row);
    }
    fileGroup.append(scroll);
  } else fileGroup.append(el('p', 'review-empty-note', 'No custom filetypes added.'));
  features.append(fileGroup); root.append(section('course-features', 'Course Features', features));
}
