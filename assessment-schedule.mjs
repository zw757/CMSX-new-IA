export const ASSESSMENTS_KEY = 'cmsx-created-assessments-v1';
export const STATUS_LABELS = {
  hidden: 'Hidden', open: 'Open', closed: 'Closed', graded: 'Graded',
  'graded-open': 'Graded & Open', draft: 'Draft', upcoming: 'Upcoming',
};

export function periodEnd(period) {
  return period.allowLate ? period.lateUntil : period.due;
}

export function validateSchedule(schedule) {
  const errors = {};
  const validDate = (value) => Boolean(value) && Number.isFinite(Date.parse(value));
  for (const key of ['initial', 'resubmission']) {
    if (key === 'resubmission' && !schedule.resubmissions) continue;
    const period = schedule[key];
    if (!validDate(period.due)) errors[`${key}-due`] = 'Choose a submission deadline.';
    if (period.allowLate) {
      if (!validDate(period.lateUntil)) {
        errors[`${key}-late-until`] = 'Choose when the late submission period ends.';
      } else if (validDate(period.due) && Date.parse(period.lateUntil) <= Date.parse(period.due)) {
        errors[`${key}-late-until`] = 'The late period must end after its submission deadline.';
      }
      if (!Number.isInteger(period.slipDays) || period.slipDays < 0) {
        errors[`${key}-slip-days`] = 'Enter a whole number of slip days, 0 or greater.';
      }
    }
  }
  if (schedule.resubmissions) {
    if (validDate(schedule.initial.due) && validDate(schedule.resubmission.due)
      && Date.parse(schedule.resubmission.due) <= Date.parse(schedule.initial.due)) {
      errors['resubmission-due'] = 'The resubmission deadline must be after the initial deadline.';
    }
    if (validDate(periodEnd(schedule.initial)) && validDate(periodEnd(schedule.resubmission))
      && Date.parse(periodEnd(schedule.initial)) > Date.parse(periodEnd(schedule.resubmission))) {
      errors[schedule.resubmission.allowLate ? 'resubmission-late-until' : 'resubmission-due'] =
        'Resubmissions must stay open at least until the initial late period ends.';
    }
  }
  return errors;
}

// Derive from absolute timestamps, so a closed tab does not miss a transition.
// Hidden/Closed/Graded are explicit staff overrides and drafts never transition.
export function effectiveStatus(assessment, now = Date.now()) {
  if (!assessment.published) return 'draft';
  const { status, schedule } = assessment;
  if (!schedule?.resubmissions || !schedule.autoTransition
    || !['open', 'graded-open'].includes(status)
    || Object.keys(validateSchedule(schedule)).length) return status;
  if (now >= Date.parse(periodEnd(schedule.resubmission))) return 'graded';
  if (now >= Date.parse(schedule.initial.due)) return 'graded-open';
  return status;
}

export function readAssessments(storage = localStorage) {
  const records = JSON.parse(storage.getItem(ASSESSMENTS_KEY) || '[]');
  if (!Array.isArray(records)) throw new Error('Saved assessments could not be read.');
  return records;
}

export function saveAssessment(assessment, storage = localStorage) {
  const records = readAssessments(storage);
  const index = records.findIndex((record) => record.id === assessment.id);
  if (index === -1) records.push(assessment);
  else records[index] = assessment;
  storage.setItem(ASSESSMENTS_KEY, JSON.stringify(records));
}
