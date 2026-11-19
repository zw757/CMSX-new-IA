import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStaffCSV, staffFromRows, readStaffFile, MAX_STAFF_FILE_BYTES } from './course-staff-import.mjs';

test('CSV supports BOM, quoted commas, escaped quotes and embedded newlines', () => {
  const rows = parseStaffCSV('\uFEFFNetID,Name,Role\r\nab123,"Brown, Alex",Admin\r\ncd456,"Casey ""CJ""\nDavis",TA\r\n');
  assert.deepEqual(rows[1], ['ab123', 'Brown, Alex', 'Admin']);
  assert.equal(rows[2][1], 'Casey "CJ"\nDavis');
  assert.equal(staffFromRows(rows).length, 2);
});
test('identities normalize while missing roles default to TA', () => {
  assert.deepEqual(staffFromRows([['Cornell NetID', 'Name'], [' AB123 ', ' Alex '], ['', '']]), [{ netid: 'ab123', name: 'Alex', role: 'TA' }]);
});
test('invalid headers, empty imports, duplicate identities and invalid NetIDs are rejected', () => {
  assert.throws(() => staffFromRows([['Name'], ['Alex']]), /NetID column/);
  assert.throws(() => staffFromRows([['NetID']]), /at least one/);
  assert.throws(() => staffFromRows([['NetID'], ['ab123'], ['AB123']]), /more than once/);
  assert.throws(() => staffFromRows([['NetID'], ['not a netid']]), /valid Cornell NetID/);
});
test('broken quotes are reported instead of silently changing the imported records', () => {
  assert.throws(() => parseStaffCSV('NetID,Name\nab123,"Alex'), /unclosed/);
  assert.throws(() => parseStaffCSV('NetID,Name\nab123,"Alex"oops'), /closing quote/);
});
test('file validation rejects unsupported, oversized and empty files before reading', async () => {
  await assert.rejects(readStaffFile({ name: 'staff.pdf', size: 10 }), /CSV or XLSX/);
  await assert.rejects(readStaffFile({ name: 'staff.csv', size: MAX_STAFF_FILE_BYTES + 1 }), /larger than 3MB/);
  await assert.rejects(readStaffFile({ name: 'staff.xlsx', size: 0 }), /empty/);
});
test('a valid CSV file imports records and a renamed non-XLSX file is rejected', async () => {
  const csv = new File(['NetID,Role\nab123,Grader\n'], 'staff.csv', { type: 'text/csv' });
  assert.deepEqual(await readStaffFile(csv), [{ netid: 'ab123', name: '', role: 'Grader' }]);
  await assert.rejects(readStaffFile(new File(['not a workbook'], 'staff.xlsx')), /not a readable XLSX/);
});
