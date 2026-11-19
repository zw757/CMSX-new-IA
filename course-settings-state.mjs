import { normalizeStaffRecord, readStaffRecord } from './course-staff-state.mjs';

export const SETTINGS_STORAGE_KEY = 'cmsx.course-settings.CS4998.v2';
export const LEGACY_SETTINGS_KEY = 'cmsx.course-settings.CS4998.v1';
const copy = value => structuredClone(value);
export const DEFAULT_SETTINGS = {
  courseName: 'Intro to Python',
  courseDescription: 'An introduction to the Cornell Management System (CMSX), covering assignment creation, grading workflows, and enrollment management.',
  courseCode: 'CS 1110', displayedCourseCode: 'CS 1110', credits: '3', semester: 'Spring 2026',
  cornellAccess: false, cornellAnnouncements: false, cornellAssignments: false, cornellSolutions: false,
  guestAccess: false, guestAnnouncements: false, guestAssignments: false, guestSolutions: false,
  enableSections: false, enableSlipDays: false, showTotalScores: false, showAssignmentWeights: false, releaseFinalGrades: false,
};

export function cleanSettings(value) {
  return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [key,
    typeof value?.[key] === typeof fallback ? value[key] : fallback]));
}
export function validateFiletype(value, others = []) {
  const name = String(value.name || '').trim();
  const extensions = [...new Set(String(value.extensions || '').toLowerCase().split(/[\s,]+/).map(s => s.replace(/^\./, '')).filter(Boolean))];
  if (!name || name.length > 80) throw new Error('Enter a filetype name of 80 characters or fewer.');
  if (others.some(item => item.name.toLowerCase() === name.toLowerCase())) throw new Error('Each filetype must have a unique name.');
  if (!extensions.length || extensions.length > 40 || extensions.some(s => !/^[a-z0-9][a-z0-9.+#-]{0,29}$/.test(s))) {
    throw new Error('Enter valid file extensions separated by commas, such as jpg, png, webp.');
  }
  return { id: String(value.id), name, extensions: extensions.join(', ') };
}
function normalizeSnapshot(value) {
  const filetypes = [];
  for (const row of Array.isArray(value?.filetypes) ? value.filetypes : []) {
    try { filetypes.push(validateFiletype(row, filetypes)); } catch { /* Ignore malformed stored rows. */ }
  }
  return { settings: cleanSettings(value?.settings), staff: normalizeStaffRecord(value?.staff), filetypes };
}
export function filledExample() {
  return normalizeSnapshot({
    settings: { ...DEFAULT_SETTINGS, cornellAccess: true, cornellAnnouncements: true, cornellAssignments: true,
      cornellSolutions: true, enableSlipDays: true, showTotalScores: true, showAssignmentWeights: true },
    staff: { members: [
      { name: 'Andrew Myers', netid: 'acm22', role: 'Admin' },
      { name: 'Noah Stern', netid: 'ncs51', role: 'Head TA', privileges: { groups: true, grades: false, assignments: true, content: true } },
      { name: 'Taylor Reed', netid: 'tjr42', role: 'TA', privileges: { groups: true, grades: true, assignments: true, content: true } },
    ] },
    filetypes: [ { id: 'images', name: 'Images', extensions: 'jpg, jpeg, png, gif, webp' },
      { id: 'documents', name: 'Documents', extensions: 'doc, docx, pdf, txt, rtf' },
      { id: 'spreadsheets', name: 'Spreadsheets', extensions: 'xls, xlsx, csv, ods' } ],
  });
}

// All edits stay in memory. Confirm writes a single snapshot, so a failed write
// cannot apply only part of the course configuration. Legacy records are read only.
export function createSettingsSession(storage, { example = false } = {}) {
  const key = SETTINGS_STORAGE_KEY + (example ? '.example' : '');
  let initial;
  try {
    initial = JSON.parse(storage.getItem(key) || 'null');
    if (!initial && !example) initial = { settings: JSON.parse(storage.getItem(LEGACY_SETTINGS_KEY) || 'null'), staff: readStaffRecord(storage) };
  } catch { /* Storage may be unavailable. Editing and review still work. */ }
  let draft = normalizeSnapshot(initial || (example ? filledExample() : null));
  let baseline = copy(draft);
  return {
    storageKey: key,
    current: () => copy(draft),
    baseline: () => copy(baseline),
    stageStaff(value) { draft.staff = normalizeStaffRecord(value); return copy(draft.staff); },
    stageFiletypes(rows) { draft.filetypes = normalizeSnapshot({ filetypes: rows }).filetypes; return copy(draft.filetypes); },
    review(settings) { draft.settings = cleanSettings(settings); return copy(draft); },
    confirm(reviewed) {
      const next = normalizeSnapshot(reviewed);
      storage.setItem(key, JSON.stringify(next));
      draft = next;
      baseline = copy(next);
      return copy(draft);
    },
  };
}
