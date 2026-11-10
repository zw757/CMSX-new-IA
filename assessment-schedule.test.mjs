import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveStatus, readAssessments, saveAssessment, validateSchedule } from './assessment-schedule.mjs';

const schedule = () => ({
  initial: { due: '2026-10-01T22:00:00Z', allowLate: true, lateUntil: '2026-10-03T22:00:00Z', slipDays: 2 },
  resubmission: { due: '2026-10-08T22:00:00Z', allowLate: true, lateUntil: '2026-10-10T22:00:00Z', slipDays: 1 },
  resubmissions: true, autoTransition: true, showSlipDays: true,
});
const record = () => ({ id:'schedule-test', type:'assignment', published:true, status:'open', schedule:schedule() });

for (const type of ['assignment', 'quiz', 'survey']) {
  test(`${type}: transitions at initial due time, stays open through the resubmission late period, then closes`, () => {
    const item = { ...record(), type };
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.initial.due) - 1), 'open');
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.initial.due)), 'graded-open');
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.initial.lateUntil)), 'graded-open');
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.resubmission.due)), 'graded-open');
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.resubmission.lateUntil) - 1), 'graded-open');
    assert.equal(effectiveStatus(item, Date.parse(item.schedule.resubmission.lateUntil)), 'graded');
  });
}

test('drafts and manual statuses do not transition', () => {
  const now = Date.parse('2026-10-20T00:00:00Z');
  assert.equal(effectiveStatus({ ...record(), published:false }, now), 'draft');
  for (const status of ['hidden', 'closed', 'graded']) assert.equal(effectiveStatus({ ...record(), status }, now), status);
  const item = record();
  item.schedule.autoTransition = false;
  assert.equal(effectiveStatus(item, now), 'open');
  item.schedule.autoTransition = true;
  item.schedule.resubmissions = false;
  assert.equal(effectiveStatus(item, now), 'open');
});

test('without late resubmissions, closing uses the resubmission deadline', () => {
  const item = record();
  item.schedule.resubmission.allowLate = false;
  item.schedule.resubmission.lateUntil = '';
  assert.deepEqual(validateSchedule(item.schedule), {});
  assert.equal(effectiveStatus(item, Date.parse(item.schedule.resubmission.due)), 'graded');
});

test('each period requires a deadline and rejects invalid late cutoffs or slip days', () => {
  for (const key of ['initial', 'resubmission']) {
    const settings = schedule();
    settings[key].due = '';
    assert.ok(validateSchedule(settings)[`${key}-due`]);
    settings[key].due = 'invalid date';
    assert.ok(validateSchedule(settings)[`${key}-due`]);
    settings[key].due = schedule()[key].due;
    settings[key].lateUntil = settings[key].due;
    settings[key].slipDays = -1;
    assert.ok(validateSchedule(settings)[`${key}-late-until`]);
    assert.ok(validateSchedule(settings)[`${key}-slip-days`]);
    settings[key].slipDays = 1.5;
    assert.ok(validateSchedule(settings)[`${key}-slip-days`]);
  }
});

test('resubmission dates must follow the initial deadline and cover its late window', () => {
  const settings = schedule();
  settings.resubmission.due = settings.initial.due;
  assert.ok(validateSchedule(settings)['resubmission-due']);
  settings.resubmission.due = schedule().resubmission.due;
  settings.initial.lateUntil = '2026-10-11T00:00:00Z';
  assert.ok(validateSchedule(settings)['resubmission-late-until']);
});

test('disabled periods do not block publishing; incomplete schedules do not auto-transition', () => {
  const item = record();
  item.schedule.initial.allowLate = false;
  item.schedule.initial.lateUntil = '';
  item.schedule.resubmissions = false;
  item.schedule.resubmission = { due:'', allowLate:true, lateUntil:'', slipDays:NaN };
  assert.deepEqual(validateSchedule(item.schedule), {});
  item.schedule.resubmissions = true;
  assert.equal(effectiveStatus(item, Date.parse('2027-01-01T00:00:00Z')), 'open');
});

test('saved settings round-trip and updates keep one record', () => {
  const values = new Map();
  const storage = { getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, value) };
  for (const type of ['assignment', 'quiz', 'survey']) {
    const item = { ...record(), id:type, type };
    saveAssessment(item, storage);
    item.schedule.showSlipDays = false;
    item.schedule.resubmission.slipDays = 3;
    saveAssessment(item, storage);
    assert.deepEqual(readAssessments(storage).find(a => a.id === type), item);
  }
  assert.equal(readAssessments(storage).length, 3);
});
