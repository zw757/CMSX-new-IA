import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsSession, filledExample, SETTINGS_STORAGE_KEY, LEGACY_SETTINGS_KEY, validateFiletype } from './course-settings-state.mjs';
import { STAFF_STORAGE_KEY, staffPrivileges, updateStaffMember } from './course-staff-state.mjs';

function memoryStorage(entries = []) {
  const data = new Map(entries), writes = [];
  return { data, writes, getItem: key => data.get(key) || null, setItem(key, value) { writes.push(key); data.set(key, value); } };
}
test('review stages all sections without saving; Confirm persists exactly the reviewed snapshot', () => {
  const storage = memoryStorage(), session = createSettingsSession(storage);
  const example = filledExample(); session.stageStaff(example.staff); session.stageFiletypes(example.filetypes);
  const reviewed = session.review({ ...example.settings, courseName: 'Reviewed course' });
  assert.equal(storage.writes.length, 0);
  session.stageStaff({ ...example.staff, members: [] });
  session.confirm(reviewed);
  assert.deepEqual(storage.writes, [SETTINGS_STORAGE_KEY]);
  const restored = createSettingsSession(storage).current();
  assert.equal(restored.settings.courseName, 'Reviewed course');
  assert.equal(restored.staff.members.length, 3);
  assert.equal(restored.filetypes.length, 3);
});
test('returning to editing preserves the draft and gives review an independent snapshot', () => {
  const session = createSettingsSession(memoryStorage(), { example: true });
  const first = session.review({ ...session.current().settings, courseName: 'First' });
  const second = session.review({ ...session.current().settings, courseName: 'Second' });
  assert.equal(first.settings.courseName, 'First');
  assert.equal(second.settings.courseName, 'Second');
  first.filetypes[0].name = 'Changed outside session';
  assert.equal(session.current().filetypes[0].name, 'Images');
});
test('abandoning review leaves stored settings, staff and filetypes unchanged', () => {
  const storage = memoryStorage(), initial = createSettingsSession(storage, { example: true });
  initial.confirm(initial.current()); const before = storage.data.get(initial.storageKey);
  const edit = createSettingsSession(storage, { example: true });
  edit.stageStaff({ ...edit.current().staff, members: [] }); edit.stageFiletypes([]);
  edit.review({ ...edit.current().settings, credits: '4' });
  assert.equal(storage.data.get(initial.storageKey), before);
  assert.equal(createSettingsSession(storage, { example: true }).current().staff.members.length, 3);
});
test('a failed Confirm keeps the draft available for retry', () => {
  const storage = memoryStorage(), session = createSettingsSession(storage);
  const reviewed = session.review({ ...session.current().settings, courseName: 'Pending' });
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => session.confirm(reviewed), /Quota/);
  assert.equal(session.current().settings.courseName, 'Pending');
  assert.equal(storage.data.size, 0);
});
test('legacy course and staff settings migrate on confirmation without overwriting legacy keys', () => {
  const example = filledExample(), legacy = JSON.stringify({ courseName: 'Existing course', cornellAccess: true });
  const storage = memoryStorage([[LEGACY_SETTINGS_KEY, legacy], [STAFF_STORAGE_KEY, JSON.stringify(example.staff)]]);
  const session = createSettingsSession(storage);
  assert.equal(session.current().settings.courseName, 'Existing course');
  assert.equal(session.current().staff.members[1].netid, 'ncs51');
  assert.equal(storage.writes.length, 0);
  session.confirm(session.current());
  assert.equal(storage.data.get(LEGACY_SETTINGS_KEY), legacy);
  assert.equal(createSettingsSession(storage).current().staff.members.length, 3);
});
test('filled example storage is separate from the first-visit course', () => {
  const storage = memoryStorage(), demo = createSettingsSession(storage, { example: true });
  demo.confirm(demo.current());
  assert.equal(createSettingsSession(storage).current().staff.members.length, 0);
  assert.equal(createSettingsSession(storage).current().filetypes.length, 0);
  assert.equal(createSettingsSession(storage).current().settings.cornellAccess, false);
});
test('individual staged staff changes retain other members and role presets through confirmation', () => {
  const storage = memoryStorage(), session = createSettingsSession(storage, { example: true });
  const before = session.current().staff;
  session.stageStaff(updateStaffMember(before, 'acm22', { privileges: { groups: false, grades: true, assignments: true, content: true } }));
  session.confirm(session.review(session.current().settings));
  const after = createSettingsSession(storage, { example: true }).current().staff;
  assert.equal(staffPrivileges(after.members[0], after.roles).groups, false);
  assert.deepEqual(after.members.slice(1), before.members.slice(1));
  assert.deepEqual(after.roles, before.roles);
});
test('filetype entries normalize extensions and reject invalid and duplicate names', () => {
  assert.deepEqual(validateFiletype({ id: 'img', name: ' Images ', extensions: '.JPG, png, jpg, .webp' }), { id: 'img', name: 'Images', extensions: 'jpg, png, webp' });
  assert.throws(() => validateFiletype({ name: 'Images', extensions: 'jpg' }, [{ name: 'images' }]), /unique/);
  assert.throws(() => validateFiletype({ name: 'Images', extensions: '../file' }), /valid/);
  assert.throws(() => validateFiletype({ name: '', extensions: 'jpg' }), /name/);
});

test('diff baseline stays at saved values through staging and repeated review, then advances on Confirm', () => {
  const session = createSettingsSession(memoryStorage(), { example: true });
  const original = session.baseline(), initialCopy = session.baseline();
  initialCopy.settings.credits = '99'; initialCopy.staff.members.length = 0;
  session.stageStaff({ ...session.current().staff, members: [] }); session.stageFiletypes([]);
  session.review({ ...session.current().settings, credits: '2' });
  const reviewed = session.review({ ...session.current().settings, credits: '4' });
  assert.deepEqual(session.baseline(), original);
  assert.equal(session.baseline().staff.members.length, 3);
  session.confirm(reviewed);
  assert.deepEqual(session.baseline(), reviewed);
  assert.equal(session.baseline().settings.credits, '4');
  assert.equal(session.baseline().filetypes.length, 0);
});

test('a failed Confirm preserves the diff baseline and a new session starts from the confirmed values', () => {
  const storage = memoryStorage(), session = createSettingsSession(storage, { example: true });
  session.confirm(session.review({ ...session.current().settings, credits: '2' }));
  assert.equal(createSettingsSession(storage, { example: true }).baseline().settings.credits, '2');
  const baseline = session.baseline(), reviewed = session.review({ ...session.current().settings, credits: '4' });
  storage.setItem = () => { throw new Error('Unavailable'); };
  assert.throws(() => session.confirm(reviewed), /Unavailable/);
  assert.deepEqual(session.baseline(), baseline);
});
