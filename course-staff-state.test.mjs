import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStaffRecord, staffPrivileges, updateStaffMember, addStaffMember, removeStaffMember,
  mergeStaffImport, parseStaffIdentity, readStaffRecord, saveStaffRecord, updateStaffRoles } from './course-staff-state.mjs';

const fixture = () => normalizeStaffRecord({ members: [
  { netid: 'ab123', name: 'Alex Brown', role: 'Head TA' },
  { netid: 'cd456', name: 'Casey Davis', role: 'Head TA' },
  { netid: 'ef789', name: 'Ellis Fox', role: 'TA' },
] });

test('an individual privilege update leaves every other staff member and role default unchanged', () => {
  const original = fixture();
  const before = structuredClone(original);
  const privileges = { groups: true, grades: true, assignments: false, content: true };
  const updated = updateStaffMember(original, 'ab123', { name: 'Alex B.', role: 'Head TA', privileges });
  assert.deepEqual(staffPrivileges(updated.members[0], updated.roles), privileges);
  assert.deepEqual(updated.members.slice(1), before.members.slice(1));
  assert.deepEqual(updated.roles, before.roles);
  assert.deepEqual(original, before);
  assert.equal(staffPrivileges(updated.members[1], updated.roles).assignments, true);
});
test('a role can change for one person without changing another person in the original role', () => {
  const original = fixture();
  const permissions = staffPrivileges({ role: 'TA' }, original.roles);
  const updated = updateStaffMember(original, 'ab123', { role: 'TA', privileges: permissions });
  assert.equal(updated.members[0].role, 'TA');
  assert.equal(updated.members[1].role, 'Head TA');
  assert.equal(staffPrivileges(updated.members[0], updated.roles).content, false);
});
test('new staff validate identity and role and cannot overwrite an existing NetID', () => {
  const record = fixture();
  const added = addStaffMember(record, { netid: 'JK123', name: 'Jordan King', role: 'TA' });
  assert.equal(added.members.length, 4);
  assert.equal(added.members[3].netid, 'jk123');
  assert.throws(() => addStaffMember(record, { netid: 'ab123', role: 'TA' }), /already course staff/);
  assert.throws(() => addStaffMember(record, { netid: 'jk123', role: '' }), /Select a role/);
  assert.throws(() => updateStaffMember(record, 'ab123', { netid: 'jk123' }), /cannot be changed/);
});
test('identities support NetID, Name (NetID), and renaming an existing member', () => {
  assert.deepEqual(parseStaffIdentity('Jordan King (JK123)'), { name: 'Jordan King', netid: 'jk123' });
  assert.deepEqual(parseStaffIdentity('JK123'), { name: '', netid: 'jk123' });
  assert.deepEqual(parseStaffIdentity('Jordan K.', 'jk123'), { name: 'Jordan K.', netid: 'jk123' });
  assert.throws(() => parseStaffIdentity('Jordan King'), /Cornell NetID/);
  assert.throws(() => parseStaffIdentity('Jordan (jk123)', 'ab123'), /add a new/);
});
test('imports merge new staff while preserving people and individual overrides already saved', () => {
  const current = updateStaffMember(fixture(), 'ab123', { privileges: { groups: false, grades: true, assignments: false, content: false } });
  const incoming = normalizeStaffRecord({ members: [{ netid: 'ab123', name: 'Replacement', role: 'TA' }, { netid: 'jk123', name: 'Jordan', role: 'TA' }] });
  incoming.roles.find(role => role.name === 'Head TA').content = false;
  const merged = mergeStaffImport(current, incoming);
  assert.equal(merged.members.length, 4);
  assert.deepEqual(merged.members[0], current.members[0]);
  assert.equal(merged.members[0].name, 'Alex Brown');
  assert.equal(staffPrivileges(merged.members[1], merged.roles).content, true);
});
test('removing one member keeps all other members and preferences', () => {
  const current = { ...fixture(), notifyByEmail: false };
  const changed = removeStaffMember(current, 'cd456');
  assert.deepEqual(changed.members.map(member => member.netid), ['ab123', 'ef789']);
  assert.equal(changed.notifyByEmail, false);
  assert.equal(current.members.length, 3);
});
test('legacy imports load and individual grants round-trip through local storage', () => {
  let value = null;
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  assert.equal(readStaffRecord(storage).members.length, 0);
  const changed = updateStaffMember(fixture(), 'ab123', { privileges: { groups: false, grades: true, assignments: true, content: false } });
  saveStaffRecord(changed, storage);
  assert.deepEqual(readStaffRecord(storage), changed);
});

test('a global role change updates every assigned member while preserving other roles and the input record', () => {
  const original = updateStaffMember(fixture(), 'cd456', { privileges: { groups: false, grades: true, assignments: true, content: false } });
  const before = structuredClone(original);
  const roles = original.roles.map(role => ({ ...role, ...(role.name === 'Head TA' ? { assignments: false } : {}) }));
  const changed = updateStaffRoles(original, roles);
  for (const member of changed.members.filter(member => member.role === 'Head TA')) {
    assert.deepEqual(staffPrivileges(member, changed.roles), { groups: true, grades: true, assignments: false, content: true });
  }
  assert.deepEqual(changed.members[2], original.members[2]);
  assert.deepEqual(original, before);
});

test('saving unchanged role settings preserves individual overrides', () => {
  const original = updateStaffMember(fixture(), 'ab123', { privileges: { groups: false, grades: true, assignments: false, content: false } });
  assert.deepEqual(updateStaffRoles(original, original.roles), original);
});

test('renaming a custom role keeps its staff assignments and individual overrides', () => {
  const original = normalizeStaffRecord({ roles: [...fixture().roles, { name: 'Grader', groups: false, grades: true, assignments: false, content: false }],
    members: [{ netid: 'ab123', name: 'Alex Brown', role: 'Grader', privileges: { groups: false, grades: true, assignments: true, content: false } }] });
  const changed = updateStaffRoles(original, original.roles.map(role => ({ ...role, originalName: role.name, name: role.name === 'Grader' ? 'Reader' : role.name })));
  assert.equal(changed.members[0].role, 'Reader');
  assert.deepEqual(changed.members[0].privileges, original.members[0].privileges);
});

test('role editing supports new roles and rejects collisions and removing an assigned role', () => {
  const record = fixture();
  const changed = updateStaffRoles(record, [...record.roles, { name: 'Grader', grades: true }]);
  assert.equal(changed.roles.at(-1).name, 'Grader');
  assert.deepEqual(changed.members, record.members);
  assert.throws(() => updateStaffRoles(record, [...record.roles, { name: 'head ta' }]), /unique name/);
  assert.throws(() => updateStaffRoles(record, record.roles.filter(role => role.name !== 'Head TA')), /Keep a role/);
});
