export const STAFF_STORAGE_KEY = 'cmsx.course-staff.CS4998.v1';
export const STAFF_PERMISSIONS = ['groups', 'grades', 'assignments', 'content'];
export const DEFAULT_STAFF_ROLES = [
  { name: 'Admin', groups: true, grades: true, assignments: true, content: true },
  { name: 'Head TA', groups: true, grades: true, assignments: true, content: true },
  { name: 'TA', groups: true, grades: true, assignments: true, content: false },
];
export const roleKey = value => String(value).trim().toLowerCase();
const validNetid = value => /^[a-z]{1,8}\d{1,8}$/.test(value);

export function staffPrivileges(member, roles) {
  const role = roles.find(item => roleKey(item.name) === roleKey(member.role));
  return Object.fromEntries(STAFF_PERMISSIONS.map(permission => [permission,
    typeof member.privileges?.[permission] === 'boolean' ? member.privileges[permission] : !!role?.[permission]]));
}

export function normalizeStaffRecord(value) {
  const roles = Array.isArray(value?.roles) && value.roles.length ? value.roles : DEFAULT_STAFF_ROLES;
  const cleanRoles = roles.filter(role => typeof role.name === 'string' && role.name.trim())
    .map(role => Object.fromEntries([['name', role.name.trim()], ...STAFF_PERMISSIONS.map(p => [p, !!role[p]])]));
  const members = [], seen = new Set();
  for (const member of Array.isArray(value?.members) ? value.members : []) {
    const netid = String(member.netid || '').trim().toLowerCase();
    if (!validNetid(netid) || seen.has(netid)) continue;
    seen.add(netid);
    const role = cleanRoles.find(role => roleKey(role.name) === roleKey(member.role));
    members.push({ netid, name: String(member.name || '').trim(), role: role?.name || String(member.role || 'TA'),
      ...(member.privileges ? { privileges: staffPrivileges(member, cleanRoles) } : {}) });
  }
  return { version: 1, roles: cleanRoles, members, notifyByEmail: value?.notifyByEmail !== false,
    ...(value?.sourceFile ? { sourceFile: value.sourceFile } : {}) };
}

export function readStaffRecord(storage = globalThis.localStorage) {
  try { return normalizeStaffRecord(JSON.parse(storage.getItem(STAFF_STORAGE_KEY) || 'null')); }
  catch { return normalizeStaffRecord(null); }
}
export function saveStaffRecord(record, storage = globalThis.localStorage) {
  const clean = normalizeStaffRecord(record);
  storage.setItem(STAFF_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function parseStaffIdentity(text, originalNetid = '') {
  const value = text.trim();
  if (!value) throw new Error('Enter a staff member’s NetID or Name (NetID).');
  const named = value.match(/^(.*?)\s*\(([a-z]{1,8}\d{1,8})\)$/i);
  const netid = named ? named[2].toLowerCase() : validNetid(value.toLowerCase()) ? value.toLowerCase() : originalNetid;
  const name = named ? named[1].trim() : netid === value.toLowerCase() ? '' : value;
  if (!validNetid(netid)) throw new Error('Use a Cornell NetID, or enter Name (NetID).');
  if (originalNetid && originalNetid !== netid) throw new Error('To change the NetID, add a new staff member instead.');
  if (name.length > 200) throw new Error('Staff names must be 200 characters or fewer.');
  return { name, netid };
}

function checkedMember(record, member) {
  const role = record.roles.find(role => roleKey(role.name) === roleKey(member.role));
  if (!role) throw new Error('Select a role for this staff member.');
  return { ...member, role: role.name, privileges: staffPrivileges(member, record.roles) };
}
export function updateStaffMember(record, netid, changes) {
  const original = record.members.find(member => member.netid === netid);
  if (!original) throw new Error('This staff member is no longer in the course.');
  if (changes.netid && changes.netid !== netid) throw new Error('A staff member’s NetID cannot be changed.');
  const updated = checkedMember(record, { ...original, ...changes, netid });
  return { ...record, members: record.members.map(member => member.netid === netid ? updated : member) };
}
export function addStaffMember(record, member) {
  const identity = parseStaffIdentity(member.netid);
  if (record.members.some(person => person.netid === identity.netid)) throw new Error(`${identity.netid} is already course staff.`);
  return { ...record, members: [...record.members, checkedMember(record, { ...member, netid: identity.netid })] };
}
export function removeStaffMember(record, netid) {
  return { ...record, members: record.members.filter(member => member.netid !== netid) };
}

// Editing a role applies its complete privilege preset to everyone in that role.
// Unchanged roles retain any person-specific overrides.
export function updateStaffRoles(record, drafts) {
  if (!Array.isArray(drafts) || !drafts.length) throw new Error('Keep at least one staff role.');
  const names = new Set(), previousNames = new Set();
  const changes = drafts.map(draft => {
    const name = String(draft.name || '').trim();
    if (!name || name.length > 80) throw new Error('Enter a role name of 80 characters or fewer.');
    if (names.has(roleKey(name))) throw new Error('Each role must have a unique name.');
    names.add(roleKey(name));
    const previousName = draft.originalName || name;
    if (previousNames.has(roleKey(previousName))) throw new Error('Each role must have a unique name.');
    previousNames.add(roleKey(previousName));
    const previous = record.roles.find(role => roleKey(role.name) === roleKey(previousName));
    const role = Object.fromEntries([['name', name], ...STAFF_PERMISSIONS.map(p => [p, !!draft[p]])]);
    const permissionsChanged = !!previous && STAFF_PERMISSIONS.some(p => !!previous[p] !== role[p]);
    return { previousName, role, permissionsChanged };
  });
  const members = record.members.map(member => {
    const change = changes.find(item => roleKey(item.previousName) === roleKey(member.role));
    if (!change) throw new Error(`Keep a role for staff currently assigned to ${member.role}.`);
    return { ...member, role: change.role.name,
      ...(change.permissionsChanged ? { privileges: staffPrivileges({ role: change.role.name }, [change.role]) } : {}) };
  });
  return normalizeStaffRecord({ ...record, roles: changes.map(change => change.role), members });
}

// Import adds staff without replacing existing people or their individual grants.
export function mergeStaffImport(current, imported) {
  const existing = current.members.map(member => ({ ...member, privileges: staffPrivileges(member, current.roles) }));
  const ids = new Set(existing.map(member => member.netid));
  const roles = [...current.roles];
  for (const role of imported.roles) {
    const index = roles.findIndex(saved => roleKey(saved.name) === roleKey(role.name));
    if (index >= 0) roles[index] = role; else roles.push(role);
  }
  return normalizeStaffRecord({ ...current, ...imported, roles, notifyByEmail: current.notifyByEmail,
    members: [...existing, ...imported.members.filter(member => !ids.has(member.netid))] });
}
