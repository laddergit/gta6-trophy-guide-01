// Leonida Ledger — the GTA VI trophy guide and tracker (offline, static files).
// Loads app/data/trophies.json, renders the checklist, the roadmap and the
// missables, saves progress in localStorage, and exports / imports it.

const STORE_KEY = 'leonida-ledger-v1';
const ROADMAP_STAGES = [
  { stage: 1, name: 'Play the story', note: 'Chapters 1–4 and the story missions, in order. Nothing here is missable — missions can be replayed.' },
  { stage: 2, name: 'Contacts & strangers', note: 'The contact mission strands (Andy, Kenton, Billy, Randy, Tyrone), the stranger strands, and the partner moments. Do the missable partner trophies while the story gives you partner free roam.' },
  { stage: 3, name: 'Activities', note: 'Stunts, shooting range, drone races, races, fishing, arcade, bowling, meditation, hunting and WAiNK. Sample one of each early for Master of None, then chase the golds and the counts.' },
  { stage: 4, name: 'Explore & collect', note: 'All 52 areas, 100 vehicles, card sets, garage properties, Scooter Bros registrations — and keep an eye out for the strange event.' },
  { stage: 5, name: 'Crime & cleanup', note: 'Robberies, heists, laundering, challenges and spending. The stealth and back-to-back jobs need a deliberate setup — read their missable notes first.' },
  { stage: 6, name: 'The platinum', note: '100% Completion, then the platinum pops with it. Mop up whatever category the stats show short.' },
];

const rowsEl = document.getElementById('rows');
const detailEl = document.getElementById('detail');
const listMetaEl = document.getElementById('listMeta');
const emptyEl = document.getElementById('empty');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const kindEl = document.getElementById('kind');
const missableOnlyEl = document.getElementById('missableOnly');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilersEl = document.getElementById('spoilers');

let trophies = [];
let earned = new Set();
let spoilersOn = false;
let selectedId = 1;
let currentView = 'checklist';

function loadSavedProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && Array.isArray(raw.earned)) {
      earned = new Set(raw.earned.filter((id) => Number.isInteger(id)));
      spoilersOn = raw.spoilers === true;
    } else if (Array.isArray(raw)) {
      earned = new Set(raw.filter((id) => Number.isInteger(id)));
    }
  } catch {
    earned = new Set();
  }
  spoilersEl.checked = spoilersOn;
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ app: 'leonida-ledger', version: 1, earned: [...earned].sort((a, b) => a - b), spoilers: spoilersOn }));
}

function trophyById(id) {
  return trophies.find((t) => t.id === id);
}

function isSpoilerHidden(t) {
  return spoilersOn && t.kind === 'story' && !earned.has(t.id);
}

function displayName(t) {
  return isSpoilerHidden(t) ? 'Hidden story trophy' : t.name;
}

function displayDescription(t) {
  return isSpoilerHidden(t) ? 'Complete this story trophy to reveal it.' : t.description;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// The guide text ends with a "Source: ..." sentence that repeats what the
// detail pane's Sources section already states, so the rendered guide drops
// that tail and reads as pure advice. The raw data keeps it.
function guideText(t) {
  return t.guide.replace(/ Source: [^.]*\.$/, '');
}

function kindLabel(kind) {
  return { story: 'Story', activity: 'Activity', collectible: 'Collectible', crime: 'Crime', misc: 'Other' }[kind] ?? kind;
}

function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (missableOnlyEl.checked && !t.missable) return false;
    if (hideEarnedEl.checked && earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderChecklist() {
  const shown = applyFilters();
  rowsEl.replaceChildren();
  for (const t of shown) {
    const tr = document.createElement('tr');
    if (t.id === selectedId) tr.classList.add('selected');
    if (earned.has(t.id)) tr.classList.add('earned-row');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${displayName(t)}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveProgress();
      renderAll();
    });
    const cells = [
      box,
      (() => { const s = document.createElement('span'); const n = document.createElement('span'); n.className = 't-name'; n.textContent = displayName(t); const d = document.createElement('span'); d.className = 't-desc'; d.textContent = displayDescription(t); s.append(n, d); return s; })(),
      (() => { const b = document.createElement('span'); b.className = `badge ${t.grade}`; b.textContent = gradeLabel(t.grade); return b; })(),
      (() => { const s = document.createElement('span'); s.className = 'kind-tag'; s.textContent = kindLabel(t.kind) + (t.missable ? ' · Missable' : ''); return s; })(),
      (() => { const s = document.createElement('span'); s.className = 'guide-cell'; s.textContent = isSpoilerHidden(t) ? 'Guide hidden until earned.' : guideText(t); return s; })(),
    ];
    for (const c of cells) {
      const td = document.createElement('td');
      td.append(c);
      tr.append(td);
    }
    tr.addEventListener('click', (e) => {
      if (e.target === box) return;
      selectedId = t.id;
      renderAll();
    });
    rowsEl.append(tr);
  }
  emptyEl.hidden = shown.length !== 0;
  listMetaEl.textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${earned.size} earned`;
}

function renderDetail() {
  const t = trophyById(selectedId) ?? trophies[0];
  if (!t) { detailEl.textContent = ''; return; }
  selectedId = t.id;
  detailEl.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = displayName(t);
  const desc = document.createElement('p');
  desc.className = 'd-desc';
  desc.textContent = displayDescription(t);
  const meta = document.createElement('div');
  meta.className = 'd-meta';
  const badge = document.createElement('span');
  badge.className = `badge ${t.grade}`;
  badge.textContent = gradeLabel(t.grade);
  const kind = document.createElement('span');
  kind.className = 'kind-tag';
  kind.textContent = kindLabel(t.kind);
  meta.append(badge, kind);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'miss-flag';
    flag.textContent = 'Missable';
    meta.append(flag);
  }
  detailEl.append(h2, desc, meta);
  if (isSpoilerHidden(t)) {
    const p = document.createElement('p');
    p.className = 'd-hidden';
    p.textContent = 'Spoilers hidden: tick this trophy off when you earn it and its name, description and guide will appear here.';
    detailEl.append(p);
    return;
  }
  if (t.missable && t.missable_note) {
    const warn = document.createElement('p');
    warn.className = 'd-missable';
    warn.textContent = `Missable — ${t.missable_note}`;
    detailEl.append(warn);
  }
  const gh = document.createElement('h3');
  gh.textContent = 'How to get it';
  const guide = document.createElement('p');
  guide.textContent = guideText(t);
  const rh = document.createElement('h3');
  rh.textContent = 'Roadmap';
  const road = document.createElement('p');
  const stage = ROADMAP_STAGES.find((s) => s.stage === t.roadmap);
  road.textContent = `Stage ${t.roadmap} — ${stage ? stage.name : ''}.`;
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  const src = document.createElement('p');
  src.className = 'd-source';
  src.textContent = t.source;
  detailEl.append(gh, guide, rh, road, sh, src);
}

function renderRoadmap() {
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  for (const s of ROADMAP_STAGES) {
    const members = trophies.filter((t) => t.roadmap === s.stage);
    const done = members.filter((t) => earned.has(t.id)).length;
    const card = document.createElement('div');
    card.className = 'stage';
    const h3 = document.createElement('h3');
    h3.textContent = `Stage ${s.stage} — ${s.name}`;
    const prog = document.createElement('p');
    prog.className = 'stage-prog';
    prog.textContent = `${done} of ${members.length} earned`;
    const note = document.createElement('p');
    note.textContent = s.note;
    const ul = document.createElement('ul');
    for (const t of members) {
      const li = document.createElement('li');
      if (earned.has(t.id)) li.classList.add('done');
      li.textContent = `${displayName(t)} — ${gradeLabel(t.grade)}${t.missable ? ' · Missable' : ''}`;
      ul.append(li);
    }
    card.append(h3, prog, note, ul);
    stagesEl.append(card);
  }
}

function renderMissables() {
  const listEl = document.getElementById('missableList');
  listEl.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div');
    card.className = 'miss-card';
    const h3 = document.createElement('h3');
    h3.textContent = `${displayName(t)} — ${gradeLabel(t.grade)}`;
    const desc = document.createElement('p');
    desc.textContent = displayDescription(t);
    const note = document.createElement('p');
    note.textContent = `Why it is missable: ${t.missable_note}`;
    const guide = document.createElement('p');
    guide.textContent = guideText(t);
    const src = document.createElement('p');
    src.className = 'd-source';
    src.textContent = t.source;
    card.append(h3, desc, note, guide, src);
    listEl.append(card);
  }
}

function updateProgress() {
  document.getElementById('progressCount').textContent = `${earned.size} of ${trophies.length} earned`;
  document.getElementById('progressPct').textContent = `${Math.round((earned.size / Math.max(1, trophies.length)) * 100)}%`;
  document.getElementById('progressFill').style.width = `${(earned.size / Math.max(1, trophies.length)) * 100}%`;
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('listCol').hidden = view !== 'checklist';
  document.getElementById('detailCol').hidden = view !== 'checklist';
  document.getElementById('controls').style.display = view === 'checklist' ? '' : 'none';
  document.getElementById('roadmapView').hidden = view !== 'roadmap';
  document.getElementById('missablesView').hidden = view !== 'missables';
}

function renderAll() {
  updateProgress();
  if (currentView === 'checklist') {
    renderChecklist();
    renderDetail();
  } else if (currentView === 'roadmap') {
    renderRoadmap();
  } else {
    renderMissables();
  }
}

function exportProgress() {
  const payload = JSON.stringify({ app: 'leonida-ledger', version: 1, earned: [...earned].sort((a, b) => a - b), spoilers: spoilersOn }, null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
}

async function importProgress(file) {
  const data = JSON.parse(await file.text());
  const ids = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(ids)) throw new Error('not a progress file');
  const valid = new Set(trophies.map((t) => t.id));
  earned = new Set(ids.filter((id) => valid.has(id)));
  if (typeof data.spoilers === 'boolean') {
    spoilersOn = data.spoilers;
    spoilersEl.checked = spoilersOn;
  }
  saveProgress();
  renderAll();
}

function wireControls() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); renderAll(); }));
  searchEl.addEventListener('input', renderChecklist);
  gradeEl.addEventListener('change', renderChecklist);
  kindEl.addEventListener('change', renderChecklist);
  missableOnlyEl.addEventListener('change', renderChecklist);
  hideEarnedEl.addEventListener('change', renderChecklist);
  spoilersEl.addEventListener('change', () => { spoilersOn = spoilersEl.checked; saveProgress(); renderAll(); });
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await importProgress(file); } catch { alert('That file is not a Leonida Ledger progress export.'); }
    e.target.value = '';
  });
}

// Fixed scenes for screenshots: ?view=checklist|roadmap|missables, ?trophy=<id>,
// ?spoilers=on|off, ?grade=, ?kind=, ?demo=1 (seeds 12 earned trophies).
function setupShotScene() {
  const q = new URLSearchParams(location.search);
  if (q.get('view')) setView(q.get('view'));
  if (q.get('trophy')) {
    const id = Number(q.get('trophy'));
    if (trophyById(id)) selectedId = id;
  }
  if (q.get('spoilers') === 'on') { spoilersOn = true; spoilersEl.checked = true; }
  if (q.get('spoilers') === 'off') { spoilersOn = false; spoilersEl.checked = false; }
  if (q.get('grade')) gradeEl.value = q.get('grade');
  if (q.get('kind')) kindEl.value = q.get('kind');
  if (q.get('search')) searchEl.value = q.get('search');
  if (q.get('demo') === '1') {
    earned = new Set([2, 3, 4, 8, 15, 16, 20, 21, 28, 35, 44, 46]);
    saveProgress();
  }
  renderAll();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
loadSavedProgress();
wireControls();
setupShotScene();
