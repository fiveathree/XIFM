// Give real wingers, wing-backs and second strikers their own position (RW LW RWB LWB CF), using Wikidata's
// "position played on team" (P413) for each player.
// usage: node tools/fm-positions.js <era> [--dry]      era 2001 = fm/data/*.js, others = fm/data/<era>/*.js
//   Only the position field (row[2]) changes, so pids stay the same. Rules:
//     RM / LM listed as a winger            → RW / LW (a side-specific "left/right winger" label wins)
//     RB / LB listed as a wing-back         → RWB / LWB
//     ST listed as a second striker, or AM whose main position is second striker → CF
//     ST / AM whose main position is "left winger" / "right winger"           → LW / RW
//   A player is only matched when Wikidata's birth year is within a year of ours. Cached in tools/.wiki-cache/.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [era, flag] = process.argv.slice(2), dry = flag === '--dry';
if (!era) { console.log('usage: node tools/fm-positions.js <era> [--dry]'); process.exit(1); }
const dir = era === '2001' ? 'fm/data' : path.join('fm/data', era);
const CACHE = path.join(__dirname, '.wiki-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'XIFM-data-tool/1.0 (hobby football game; player positions)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0, failed = 0;
async function wd(params, host = 'www.wikidata.org') {
  const key = path.join(CACHE, 'wd-' + crypto.createHash('sha1').update(host + JSON.stringify(params)).digest('hex') + '.json');
  if (fs.existsSync(key)) return JSON.parse(fs.readFileSync(key, 'utf8'));
  const url = 'https://' + host + '/w/api.php?' + new URLSearchParams({ format: 'json', maxlag: '5', ...params });
  for (let t = 0; t < 8; t++) {
    const wait = last + 400 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
    try {
      const r = await fetch(url, { headers: UA }), txt = await r.text();
      if (r.status === 429 || r.status >= 500) { await sleep(Math.min(60000, 5000 * 2 ** t)); continue; }
      const j = JSON.parse(txt); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
      fs.writeFileSync(key, JSON.stringify(j)); return j;
    } catch (e) { await sleep(Math.min(60000, 3000 * 2 ** t)); }
  }
  failed++; return null;
}
const claimIds = (e, p) => (e.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const birthYear = e => { const t = e.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time; return t ? +t.slice(1, 5) : null; };
const FOOTBALLER = 'Q937857', DISAMBIG = 'Q4167410', HUMAN = 'Q5';

// asked title → entity: English Wikipedia resolves redirects and gives the Wikidata item; disambiguation pages are skipped
async function entitiesFor(titles) {
  const out = {}, qOf = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const j = await wd({ action: 'query', titles: chunk.join('|'), redirects: '1', prop: 'pageprops', ppprop: 'wikibase_item|disambiguation', formatversion: '2' }, 'en.wikipedia.org');
    if (!j?.query) continue;
    const step = {}; for (const r of [...(j.query.normalized || []), ...(j.query.redirects || [])]) step[r.from] = r.to;
    const page = {}; for (const pg of j.query.pages || []) if (pg.pageprops?.wikibase_item && !('disambiguation' in pg.pageprops)) page[pg.title] = pg.pageprops.wikibase_item;
    for (const t of chunk) { let u = t; for (let k = 0; k < 3 && step[u]; k++) u = step[u]; if (page[u]) qOf[t] = page[u]; }
  }
  const ids = [...new Set(Object.values(qOf))], ents = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await wd({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'claims' });
    Object.assign(ents, j?.entities || {});
  }
  for (const [t, q] of Object.entries(qOf)) if (ents[q]) out[t] = ents[q];
  return out;
}
const POSMAP = {};   // Wikidata item → our tag
async function labelPositions(ids) {
  const need = [...new Set(ids)].filter(q => !(q in POSMAP));
  for (let i = 0; i < need.length; i += 50) {
    const j = await wd({ action: 'wbgetentities', ids: need.slice(i, i + 50).join('|'), props: 'labels', languages: 'en' });
    for (const [q, e] of Object.entries(j?.entities || {})) {
      const l = (e.labels?.en?.value || '').toLowerCase();
      POSMAP[q] = /left wing-?back|left wingback/.test(l) ? 'LWB' : /right wing-?back|right wingback/.test(l) ? 'RWB' : /wing-?back|wing back/.test(l) ? 'WB'
        : /left wing(er)?$|left winger/.test(l) ? 'LW' : /right wing(er)?$|right winger/.test(l) ? 'RW' : /^winger$|^wing$|outside forward/.test(l) ? 'W'
        : /second striker|support striker|false nine|deep-lying forward/.test(l) ? 'SS' : '';
    }
  }
}
function decide(pos, tags) {
  const has = t => tags.includes(t), main = tags.find(Boolean);
  if (pos === 'RM' || pos === 'LM') {
    if (has('LW') && !has('RW')) return 'LW'; if (has('RW') && !has('LW')) return 'RW';
    if (has('W') || has('LW') || has('RW')) return pos === 'RM' ? 'RW' : 'LW';
  }
  if (pos === 'RB' || pos === 'LB') {
    if (has('RWB') || has('LWB') || has('WB')) return has('LWB') && !has('RWB') ? 'LWB' : has('RWB') && !has('LWB') ? 'RWB' : pos === 'RB' ? 'RWB' : 'LWB';
  }
  if (pos === 'ST' || pos === 'AM') {
    if (main === 'LW' || main === 'RW') return main;
    if ((pos === 'ST' && has('SS')) || (pos === 'AM' && main === 'SS')) return 'CF';
  }
  return null;
}

(async () => {
  const files = fs.readdirSync(dir).filter(f => /^[a-z]+\d?\.js$/.test(f));
  const all = [];
  for (const f of files) {
    const L = []; global.FM = { addLeague: x => L.push(x) }; eval(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const c of L[0].clubs) for (const p of c.p || []) if (['RM', 'LM', 'RB', 'LB', 'ST', 'AM'].includes(p[2])) all.push({ f, p });
  }
  // first try the plain name, then "Name (footballer)", then "Name (footballer, born YYYY)"
  const found = new Map();
  const tries = [p => p[1], p => p[1] + ' (footballer)', p => `${p[1]} (footballer, born ${p[4]})`];
  for (const mk of tries) {
    const left = all.filter(x => !found.has(x.p[1] + '|' + x.p[4]));
    const titles = [...new Set(left.map(x => mk(x.p)))];
    const ents = await entitiesFor(titles);
    for (const x of left) {
      const e = ents[mk(x.p)];
      if (!e) continue;
      const inst = claimIds(e, 'P31'), occ = claimIds(e, 'P106'), by = birthYear(e);
      if (inst.includes(DISAMBIG) || !inst.includes(HUMAN) || !occ.includes(FOOTBALLER) || !by || Math.abs(by - x.p[4]) > 1) continue;
      found.set(x.p[1] + '|' + x.p[4], e);
    }
  }
  await labelPositions([...found.values()].flatMap(e => claimIds(e, 'P413')));
  const changes = {}; let n = 0; const tally = {};
  for (const x of all) {
    const e = found.get(x.p[1] + '|' + x.p[4]); if (!e) continue;
    const to = decide(x.p[2], claimIds(e, 'P413').map(q => POSMAP[q] || ''));
    if (!to) continue;
    (changes[x.f] = changes[x.f] || []).push([x.p, to]); n++; tally[x.p[2] + '→' + to] = (tally[x.p[2] + '→' + to] || 0) + 1;
  }
  for (const [f, list] of Object.entries(changes)) {
    const fp = path.join(dir, f); let src = fs.readFileSync(fp, 'utf8');
    for (const [p, to] of list) {
      const re = new RegExp('(\\[\\d+,' + JSON.stringify(p[1]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',)"' + p[2] + '"');
      src = src.replace(re, (m, a) => a + JSON.stringify(to));
      if (dry) console.log(`${f.padEnd(9)} ${p[1]} ${p[2]} → ${to}`);
    }
    if (!dry) fs.writeFileSync(fp, src);
  }
  console.log(`era ${era}: ${all.length} candidates, ${found.size} found on Wikidata, ${n} changed ` + JSON.stringify(tally) + (failed ? ` (${failed} requests failed: run again)` : '') + (dry ? ' [dry run]' : ''));
})();
