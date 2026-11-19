// Keep comparison independent of the DOM and compare against the saved snapshot.
export function booleanChange(before, after) {
  return !!before === !!after ? 'same' : after ? 'added' : 'removed';
}

export function accessValue(settings, audience, permission) {
  return !!settings[`${audience}Access`] && !!settings[`${audience}${permission}`];
}

// Match by identity, so sorting, additions and removals cannot shift comparisons.
export function compareRows(before, after, key) {
  const previous = new Map(before.map(row => [key(row), row]));
  const current = new Set(after.map(key));
  return [
    ...after.map(row => ({ before: previous.get(key(row)), after: row,
      change: previous.has(key(row)) ? 'same' : 'added' })),
    ...before.filter(row => !current.has(key(row))).map(row => ({ before: row, after: undefined, change: 'removed' })),
  ];
}

// Word-level LCS keeps unchanged prose intact, including punctuation and whitespace.
// Bound the matrix for unusually long, wholly replaced descriptions.
export function textChanges(before = '', after = '') {
  before = String(before); after = String(after);
  if (before === after) return before ? [{ type: 'same', text: before }] : [];
  const a = before.match(/\s+|[^\s]+/gu) || [], b = after.match(/\s+|[^\s]+/gu) || [];
  let start = 0, endA = a.length, endB = b.length;
  while (start < endA && start < endB && a[start] === b[start]) start++;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const result = [];
  function append(type, text) {
    if (!text) return;
    if (result.at(-1)?.type === type) result.at(-1).text += text;
    else result.push({ type, text });
  }
  append('same', a.slice(0, start).join(''));
  const rows = endA - start, columns = endB - start;
  if ((rows + 1) * (columns + 1) > 250000) {
    append('removed', a.slice(start, endA).join(''));
    append('added', b.slice(start, endB).join(''));
  } else {
    const matrix = Array.from({ length: rows + 1 }, () => new Uint32Array(columns + 1));
    for (let i = rows - 1; i >= 0; i--) for (let j = columns - 1; j >= 0; j--) {
      matrix[i][j] = a[start + i] === b[start + j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
    let i = 0, j = 0;
    while (i < rows || j < columns) {
      if (i < rows && j < columns && a[start + i] === b[start + j]) { append('same', a[start + i]); i++; j++; }
      else if (i < rows && (j === columns || matrix[i + 1][j] >= matrix[i][j + 1])) append('removed', a[start + i++]);
      else append('added', b[start + j++]);
    }
  }
  append('same', a.slice(endA).join(''));
  return result;
}
