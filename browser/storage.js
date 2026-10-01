export const STORAGE_KEY = 'campustrack.browser.v1';
const stages = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];
export function validateBoard(value) {
  if (!Array.isArray(value) || value.length > 500) throw Error('Use a board with at most 500 applications.');
  const seen = new Set();
  return value.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('Invalid application record.');
    const text = (key, max, required = false) => {
      const value = row[key] ?? '';
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error('Invalid ' + key + '.');
      return required ? value.trim() : value;
    };
    const id = String(row.id ?? 'import-' + index);
    if (!id || id.length > 100 || seen.has(id)) throw Error('Application identifiers must be unique.');
    seen.add(id);
    const company = text('company', 100, true), role = text('role', 120, true);
    const status = text('status', 20), deadline = text('deadline', 10);
    if (!stages.includes(status)) throw Error('Invalid application stage.');
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isFinite(Date.parse(deadline)) || new Date(deadline).toISOString().slice(0, 10) !== deadline)) throw Error('Invalid deadline.');
    const url = text('url', 1000), notes = text('notes', 4000);
    if (url) {
      let parsed;
      try { parsed = new URL(url); } catch { throw Error('Use a valid HTTP or HTTPS link.'); }
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw Error('Use a normal HTTP or HTTPS link without credentials.');
    }
    return {id, company, role, status, deadline, url, notes};
  });
}
export function loadBoard(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1) throw Error('Unsupported saved-board format.');
  return validateBoard(data.applications);
}
export function saveBoard(records, storage = localStorage) {
  const validated = validateBoard(records);
  storage.setItem(STORAGE_KEY, JSON.stringify({version: 1, applications: validated}));
  return validated;
}
export function parseBackup(raw) {
  if (typeof raw !== 'string' || raw.length > 3000000) throw Error('Backup limit is 3 MB.');
  const data = JSON.parse(raw);
  if (data.version !== 1) throw Error('Use a CampusTrack JSON backup, version 1.');
  return validateBoard(data.applications);
}
