import {el, $, notify, busy, download} from './lib.js';
import {loadBoard, saveBoard, parseBackup} from './storage.js';
const stages = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];
let records = [], demo = false, editing = null, storageReady = true;
const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dueLabel = value => !value ? 'No deadline' : new Date(value + 'T12:00:00').toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
function commit(next) {
  if (demo) records = next;
  else {
    if (!storageReady) throw Error('Saved data could not be read. Restore a valid JSON backup before saving.');
    records = saveBoard(next);
  }
}
function render() {
  const needle = $('#search').value.toLowerCase(),
    filter = $('#filter').value;
  const filtered = records.filter(r => (!filter || r.status === filter) && (r.company + ' ' + r.role).toLowerCase().includes(needle));
  const today = localDate(new Date()),
    next = new Date();
  next.setDate(next.getDate() + 7);
  $('#stat-total').textContent = records.length;
  $('#stat-active').textContent = records.filter(r => ['Applied', 'Interview'].includes(r.status)).length;
  $('#stat-interview').textContent = records.filter(r => r.status === 'Interview').length;
  $('#stat-due').textContent = records.filter(r => r.deadline >= today && r.deadline <= localDate(next) && !['Closed', 'Offer'].includes(r.status)).length;
  $('#board').replaceChildren(...stages.filter(s => !filter || s === filter).map(stage => {
    const items = filtered.filter(r => r.status === stage);
    return el('div', {
        class: 'column'
      }, el('div', {
        class: 'column-title'
      }, stage, el('span', {
        class: 'count'
      }, items.length)),
      ...(items.length ? items.map(r => el('article', {
        class: 'application'
      }, el('div', {
        class: 'company-mark'
      }, r.company.slice(0, 2).toUpperCase()), el('p', {
        class: 'company'
      }, r.company), el('h3', {}, r.role), el('span', {
        class: 'pill'
      }, r.status), el('div', {
        class: 'application-footer'
      }, el('span', {
        class: 'muted'
      }, dueLabel(r.deadline)), el('button', {
        class: 'btn ghost',
        onclick: () => openApplication(r),
        'aria-label': `Edit ${r.role} at ${r.company}`
      }, 'Edit ↗')))) : [el('div', {
        class: 'empty'
      }, 'No applications here yet.')]));
  }));
  $('#identity').textContent = demo ? 'Fictional sample' : 'Browser workspace';
  $('#mode-banner').textContent = demo
    ? 'Fictional sample · Changes are temporary. Choose My board to return to your saved applications.'
    : 'Saved in this browser on this device. Download a JSON backup before clearing browser data or changing devices.';
  $('#local-button').hidden = !demo;
}
function openApplication(record) {
  editing = record?.id ?? null;
  const f = $('#application-form');
  f.reset();
  if (record)
    for (const k of ['company', 'role', 'status', 'deadline', 'url', 'notes']) f.elements[k].value = record[k] || '';
  $('#application-title').textContent = record ? 'Edit opportunity' : 'Add an opportunity';
  $('#application-error').textContent = '';
  $('#delete-button').hidden = !record;
  $('#application-dialog').showModal();
}
$('#demo-button').onclick = () => {

  const deadline = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return localDate(d);
  };
  records = [{
    id: 1,
    company: 'Northstar Labs',
    role: 'Python developer intern',
    status: 'Saved',
    deadline: deadline(4),
    url: '',
    notes: 'Fictional example: practise building a REST API.'
  }, {
    id: 2,
    company: 'Paperplane Studio',
    role: 'Frontend intern',
    status: 'Applied',
    deadline: deadline(12),
    url: '',
    notes: 'Fictional example.'
  }, {
    id: 3,
    company: 'Greenbyte Research',
    role: 'ML research intern',
    status: 'Interview',
    deadline: deadline(6),
    url: '',
    notes: 'Fictional example: review validation and data leakage.'
  }, {
    id: 4,
    company: 'Canvas Systems',
    role: 'Software engineering intern',
    status: 'Saved',
    deadline: deadline(3),
    url: '',
    notes: 'Fictional example.'
  }, {
    id: 5,
    company: 'Lighthouse Apps',
    role: 'Backend intern',
    status: 'Offer',
    deadline: '',
    url: '',
    notes: 'Fictional example.'
  }];
  demo = true;
  render();
};

$('#local-button').onclick = () => {
  try {
    records = loadBoard(); demo = false; storageReady = true; render();
  } catch { notify('Saved data could not be read. Restore a JSON backup to recover your board.'); }
};
$('#application-form').onsubmit = e => {
  e.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(e.target));
    const next = editing
      ? records.map(r => r.id === editing ? {...data, id: editing} : r)
      : [{...data, id: crypto.randomUUID()}, ...records];
    commit(next);
    $('#application-dialog').close();
    render();
    notify(demo ? 'Sample changed. Your saved board is untouched.' : 'Application saved in this browser.');
  } catch (error) { $('#application-error').textContent = error.message; }
};
$('#delete-button').onclick = () => {
  if (!confirm('Delete this application permanently?')) return;
  busy($('#delete-button'), async () => {
    commit(records.filter(r => r.id !== editing));
    $('#application-dialog').close(); render();
    notify(demo ? 'Sample application removed.' : 'Application deleted.');
  });
};
$('#add-button').onclick = () => openApplication();
$('#search').oninput = render;
$('#filter').onchange = render;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => document.getElementById(b.dataset.close).close());
$('#export-button').onclick = () => {
  const keys = ['company', 'role', 'status', 'deadline', 'url', 'notes'];
  const cell = x => {
    let s = String(x || '');
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  download(demo ? 'sample-applications.csv' : 'applications.csv',
    [keys.join(','), ...records.map(r => keys.map(k => cell(r[k])).join(','))].join('\r\n'), 'text/csv');
};
$('#backup-button').onclick = () => {
  try {
    download('campustrack-backup.json', JSON.stringify({version: 1,
      exportedAt: new Date().toISOString(), applications: loadBoard()}, null, 2));
    notify('Backup downloaded. Keep it somewhere safe.');
  } catch { notify('Saved data could not be read. Existing browser data has been preserved.'); }
};
$('#restore-button').onclick = () => $('#restore-file').click();
$('#restore-file').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 3000000) throw Error('Backup limit is 3 MB.');
    const imported = parseBackup(await file.text());
    if (!confirm('Replace the saved board in this browser with ' + imported.length + ' applications from this backup?')) return;
    records = saveBoard(imported); storageReady = true; demo = false; render();
    notify('Backup restored and saved in this browser.');
  } catch (error) { notify('Restore failed: ' + error.message + ' Existing saved data is unchanged.'); }
  finally { e.target.value = ''; }
};
try { records = loadBoard(); }
catch { storageReady = false; notify('Saved data could not be read. Restore a JSON backup before saving.'); }
render();
