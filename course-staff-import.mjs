export const MAX_STAFF_FILE_BYTES = 3 * 1024 * 1024;

// Quoted fields, escaped quotes, CRLF and embedded newlines follow CSV rules.
export function parseStaffCSV(text) {
  const rows = [];
  let row = [], value = '', quoted = false, endedQuote = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; endedQuote = true; }
      else value += char;
    } else if (char === '"' && !value && !endedQuote) quoted = true;
    else if (char === ',' || char === '\r' || char === '\n') {
      row.push(value); value = ''; endedQuote = false;
      if (char !== ',') {
        rows.push(row); row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else if (endedQuote && !/\s/.test(char)) throw new Error('The CSV has text after a closing quote. Check the file and try again.');
    else if (!endedQuote) value += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

export function staffFromRows(rows) {
  const nonempty = rows.filter(row => row.some(cell => String(cell ?? '').trim()));
  if (nonempty.length < 2) throw new Error('Add at least one staff member below the header row.');
  const headers = nonempty[0].map(cell => String(cell).trim().toLowerCase().replace(/[\s_-]/g, ''));
  const idIndex = headers.findIndex(header => ['netid', 'cornellnetid'].includes(header));
  if (idIndex < 0) throw new Error('Include a NetID column. Download the template for the expected format.');
  const roleIndex = headers.findIndex(header => ['role', 'staffrole'].includes(header));
  const nameIndex = headers.findIndex(header => ['name', 'fullname'].includes(header));
  const seen = new Set();
  return nonempty.slice(1).map((row, index) => {
    const netid = String(row[idIndex] ?? '').trim().toLowerCase();
    if (!/^[a-z]{1,8}\d{1,8}$/.test(netid)) throw new Error(`Row ${index + 2}: enter a valid Cornell NetID.`);
    if (seen.has(netid)) throw new Error(`Row ${index + 2}: ${netid} appears more than once.`);
    seen.add(netid);
    const role = String(roleIndex < 0 ? 'TA' : row[roleIndex] || 'TA').trim();
    if (role.length > 80) throw new Error(`Row ${index + 2}: role names must be 80 characters or fewer.`);
    return { netid, name: String(nameIndex < 0 ? '' : row[nameIndex] ?? '').trim().slice(0, 200), role: role || 'TA' };
  });
}

// Read standard XLSX workbooks locally; no uploaded staff data leaves the browser.
async function xlsxRows(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer), decoder = new TextDecoder();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('This is not a readable XLSX workbook. Export it again or use CSV.');
  const entries = new Map();
  let cursor = view.getUint32(end + 16, true);
  for (let i = 0, count = view.getUint16(end + 10, true); i < count; i++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('The XLSX workbook is damaged.');
    const nameLength = view.getUint16(cursor + 28, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    entries.set(name, { flags: view.getUint16(cursor + 8, true), method: view.getUint16(cursor + 10, true),
      size: view.getUint32(cursor + 20, true), unpacked: view.getUint32(cursor + 24, true), offset: view.getUint32(cursor + 42, true) });
    cursor += 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
  async function xml(path, optional = false) {
    const entry = entries.get(path);
    if (!entry) { if (optional) return null; throw new Error('The XLSX workbook is missing a worksheet.'); }
    if (entry.flags & 1) throw new Error('Password-protected workbooks are not supported. Save an unprotected copy.');
    if (entry.unpacked > 16 * 1024 * 1024) throw new Error('The worksheet is too large. Use a smaller staff file.');
    const offset = entry.offset;
    if (offset + 30 > bytes.length || view.getUint32(offset, true) !== 0x04034b50) throw new Error('The XLSX workbook is damaged.');
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    if (start + entry.size > bytes.length) throw new Error('The XLSX workbook is incomplete.');
    const data = bytes.slice(start, start + entry.size);
    let output = data;
    if (entry.method === 8) {
      const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const chunks = []; let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          length += value.length;
          if (length > 16 * 1024 * 1024) { await reader.cancel(); throw new Error('The worksheet is too large.'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      output = new Uint8Array(length); let position = 0;
      for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
    } else if (entry.method !== 0) throw new Error('Use a standard XLSX workbook or CSV file.');
    const doc = new DOMParser().parseFromString(decoder.decode(output), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('The XLSX worksheet cannot be read.');
    return doc;
  }
  const all = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
  const workbook = await xml('xl/workbook.xml');
  const firstSheet = all(workbook, 'sheet')[0];
  const relationships = await xml('xl/_rels/workbook.xml.rels');
  const id = firstSheet?.getAttribute('r:id');
  const target = all(relationships, 'Relationship').find(item => item.getAttribute('Id') === id)?.getAttribute('Target');
  if (!target || target.includes('..')) throw new Error('The XLSX workbook has no readable worksheet.');
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const shared = await xml('xl/sharedStrings.xml', true);
  const strings = shared ? all(shared, 'si').map(item => all(item, 't').map(t => t.textContent).join('')) : [];
  const sheet = await xml(path);
  return all(sheet, 'row').map(row => {
    const cells = [];
    for (const cell of all(row, 'c')) {
      const letters = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0];
      if (!letters) continue;
      let column = 0; for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
      if (column > 1000) throw new Error('The worksheet contains too many columns.');
      const raw = all(cell, 'v')[0]?.textContent ?? '';
      cells[column - 1] = cell.getAttribute('t') === 's' ? strings[Number(raw)] ?? ''
        : cell.getAttribute('t') === 'inlineStr' ? all(cell, 't').map(t => t.textContent).join('') : raw;
    }
    return Array.from(cells, value => value ?? '');
  });
}

export async function readStaffFile(file) {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Choose a CSV or XLSX file.');
  if (file.size > MAX_STAFF_FILE_BYTES) throw new Error('This file is larger than 3MB. Choose a smaller file.');
  if (!file.size) throw new Error('This file is empty. Add staff information and try again.');
  try {
    const rows = /\.csv$/i.test(file.name) ? parseStaffCSV(await file.text()) : await xlsxRows(await file.arrayBuffer());
    return staffFromRows(rows);
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) throw new Error('This file could not be read. Check the format or try CSV.');
    throw error;
  }
}
