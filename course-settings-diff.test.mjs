import test from 'node:test';
import assert from 'node:assert/strict';
import { textChanges, booleanChange, compareRows, accessValue } from './course-settings-diff.mjs';
import { filledExample } from './course-settings-state.mjs';
import { staffPrivileges } from './course-staff-state.mjs';

test('an appended description highlights only the new sentence', () => {
  const before = 'An introduction to CMSX.', after = `${before} Students will practice Git.`;
  assert.deepEqual(textChanges(before, after), [
    { type: 'same', text: before }, { type: 'added', text: ' Students will practice Git.' },
  ]);
  assert.deepEqual(textChanges('3', '2'), [{ type: 'removed', text: '3' }, { type: 'added', text: '2' }]);
});

test('word diffs preserve unchanged context, Unicode, whitespace and literal markup', () => {
  assert.deepEqual(textChanges('Intro to Java and grading', 'Intro to Python and grading'), [
    { type: 'same', text: 'Intro to ' }, { type: 'removed', text: 'Java' },
    { type: 'added', text: 'Python' }, { type: 'same', text: ' and grading' },
  ]);
  for (const [before, after] of [
    ['', 'New course'], ['Old course', ''], ['unchanged', 'unchanged'], ['α β\n🙂', 'α γ\n🙂'],
    ['a a a b', 'a b a'], ['<script>alert(1)</script>', '<b>CMSX</b>'], ['First\n\nlast.', 'First last.'],
  ]) {
    const diff = textChanges(before, after);
    assert.equal(diff.filter(part => part.type !== 'added').map(part => part.text).join(''), before);
    assert.equal(diff.filter(part => part.type !== 'removed').map(part => part.text).join(''), after);
  }
});

test('large descriptions retain both versions without an unbounded comparison matrix', () => {
  const before = 'Old '.repeat(1500), after = 'New '.repeat(1500), diff = textChanges(before, after);
  assert.equal(diff.filter(part => part.type !== 'added').map(part => part.text).join(''), before);
  assert.equal(diff.filter(part => part.type !== 'removed').map(part => part.text).join(''), after);
});

test('row identities survive sorting, additions and removals', () => {
  const before = [{ id: 'a', name: 'Andrew' }, { id: 'b', name: 'Noah' }];
  const after = [{ id: 'b', name: 'Noah renamed' }, { id: 'c', name: 'Taylor' }];
  const rows = compareRows(before, after, row => row.id);
  assert.deepEqual(rows.map(row => [row.before?.id, row.after?.id, row.change]), [
    ['b', 'b', 'same'], [undefined, 'c', 'added'], ['a', undefined, 'removed'],
  ]);
  assert.equal(rows[0].before.name, 'Noah');
  assert.deepEqual(compareRows(before, [...before].reverse(), row => row.id).map(row => row.change), ['same', 'same']);
});

test('access changes use effective permissions, including parent access removal', () => {
  const before = { cornellAccess: true, cornellAnnouncements: true }, after = { ...before, cornellAccess: false };
  assert.equal(booleanChange(accessValue(before, 'cornell', 'Announcements'), accessValue(after, 'cornell', 'Announcements')), 'removed');
  assert.equal(booleanChange(accessValue(after, 'cornell', 'Announcements'), accessValue({ ...after, cornellAnnouncements: false }, 'cornell', 'Announcements')), 'same');
  assert.equal(booleanChange(false, true), 'added');
});

test('role preset diffs reflect effective grants and preserve individual overrides', () => {
  const before = filledExample().staff, after = structuredClone(before);
  after.roles.find(role => role.name === 'Admin').grades = false;
  after.roles.find(role => role.name === 'Head TA').content = false;
  const changes = compareRows(before.members, after.members, member => member.netid).map(row => {
    const old = staffPrivileges(row.before, before.roles), next = staffPrivileges(row.after, after.roles);
    return Object.fromEntries(Object.keys(old).map(key => [key, booleanChange(old[key], next[key])]));
  });
  assert.equal(changes[0].grades, 'removed'); assert.equal(changes[1].content, 'same');
  assert.deepEqual(changes[2], { groups: 'same', grades: 'same', assignments: 'same', content: 'same' });
});
