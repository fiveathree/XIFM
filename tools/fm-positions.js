// Give real wingers, wing-backs and second strikers their own position (RW LW RWB LWB CF), using the "position"
// field of each player's English Wikipedia infobox.
// usage: node tools/fm-positions.js <era> [--dry]      era 2001 = fm/data/*.js, others = fm/data/<era>/*.js
//   Only the position field (row[2]) changes, so pids stay the same. Rules (infobox terms in their listed order):
//     RM / LM with any winger term            → RW / LW (our side kept: the infobox covers a whole career)
//     RB / LB with any wing-back term         → RWB / LWB (our side kept)
//     ST / AM whose first term is a left/right winger → LW / RW
//     ST with a second-striker term, or AM whose first term is one → CF
//   A page only counts when it is a football biography whose birth year is within a year of ours.
//   Pages are cached in tools/.wiki-cache/ (not committed); --dry lists changes without writing.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [era, flag] = process.argv.slice(2), dry = flag === '--dry';
if (!era) { console.log('usage: node tools/fm-positions.js <era> [--dry]'); process.exit(1); }
const dir = era === '2001' ? 'fm/data' : path.join('fm/data', era);
const CACHE = path.join(__dirname, '.wiki-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'XIFM-data-tool/1.0 (hobby football game; player positions)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0, failed = 0;
async function api(params) {
  const key = path.join(CACHE, 'pos-' + crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex') + '.json');
  if (fs.existsSync(key)) return JSON.parse(fs.readFileSync(key, 'utf8'));
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  for (let t = 0; t < 8; t++) {
    const wait = last + 600 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
    try {
      const r = await fetch(url, { headers: UA }), txt = await r.text();
      if (r.status === 429 || r.status >= 500) { process.stderr.write('[' + r.status + ']'); await sleep(Math.min(60000, 5000 * 2 ** t)); continue; }
      const j = JSON.parse(txt); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
      fs.writeFileSync(key, JSON.stringify(j)); process.stderr.write('.'); return j;
    } catch (e) { await sleep(Math.min(60000, 3000 * 2 ** t)); }
  }
  failed++; return null;
}

// asked title → infobox { by, terms } (redirects followed; disambiguation and non-football pages give nothing)
async function infoboxes(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 20) {
    const chunk = titles.slice(i, i + 20);
    let cont = {}, step = {}, pages = {};
    for (let g = 0; g < 10; g++) {
      const j = await api({ action: 'query', titles: chunk.join('|'), redirects: '1', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0', ...cont });
      if (!j?.query) break;
      for (const r of [...(j.query.normalized || []), ...(j.query.redirects || [])]) step[r.from] = r.to;
      for (const pg of j.query.pages || []) { const c = pg.revisions?.[0]?.slots?.main?.content; if (c) pages[pg.title] = c; }
      if (!j.continue) break; cont = j.continue;
    }
    for (const t of chunk) {
      let u = t; for (let k = 0; k < 3 && step[u]; k++) u = step[u];
      const wt = pages[u]; if (!wt || !/\{\{\s*infobox football biography/i.test(wt)) continue;
      const bd = wt.match(/\|\s*birth_date\s*=([^\n]*)/i), by = bd && bd[1].match(/\b(19[4-9]\d|200\d)\b/);
      const pm = wt.match(/\|\s*position\s*=([^\n]*)/i);
      if (!by || !pm) continue;
      const txt = pm[1].replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1')
        .replace(/\{\{[^}]*\}\}/g, '').replace(/<br\s*\/?>/gi, ',').toLowerCase();
      out[t] = { by: +by[1], terms: txt.split(/[,/;]|\band\b|\bor\b/).map(s => s.trim()).filter(Boolean) };
    }
  }
  return out;
}
const tag = s => /left[- ]?wing[- ]?back/.test(s) ? 'LWB' : /right[- ]?wing[- ]?back/.test(s) ? 'RWB' : /wing[- ]?back/.test(s) ? 'WB'
  : /left[- ]?wing(er)?\b/.test(s) ? 'LW' : /right[- ]?wing(er)?\b/.test(s) ? 'RW' : /\bwinger\b|^wide forward|^outside forward/.test(s) ? 'W'
  : /second striker|support striker|false nine|deep[- ]lying forward|shadow striker/.test(s) ? 'SS' : '';
function decide(pos, terms) {
  const tags = terms.map(tag), has = t => tags.includes(t), first = tags[0];
  if (pos === 'RM' || pos === 'LM') {
    if (has('W') || has('LW') || has('RW')) return pos === 'RM' ? 'RW' : 'LW';   // keep our side: the infobox covers a whole career
  }
  if (pos === 'RB' || pos === 'LB') {
    if (has('WB') || has('LWB') || has('RWB')) return pos === 'RB' ? 'RWB' : 'LWB';
  }
  if (pos === 'ST' || pos === 'AM') {
    if (first === 'LW' || first === 'RW') return first;
    if ((pos === 'ST' && has('SS')) || (pos === 'AM' && first === 'SS')) return 'CF';
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
  // the plain name first, then "Name (footballer)", then "Name (footballer, born YYYY)"
  const found = new Map(), key = p => p[1] + '|' + p[4];
  for (const mk of [p => p[1], p => p[1] + ' (footballer)', p => `${p[1]} (footballer, born ${p[4]})`]) {
    const left = all.filter(x => !found.has(key(x.p)));
    const ib = await infoboxes([...new Set(left.map(x => mk(x.p)))]);
    for (const x of left) { const b = ib[mk(x.p)]; if (b && Math.abs(b.by - x.p[4]) <= 1) found.set(key(x.p), b); }
  }
  const changes = {}; let n = 0; const tally = {};
  for (const x of all) {
    const b = found.get(key(x.p)); if (!b) continue;
    const to = decide(x.p[2], b.terms); if (!to) continue;
    (changes[x.f] = changes[x.f] || []).push([x.p, to, b.terms.join(', ')]); n++; tally[x.p[2] + '→' + to] = (tally[x.p[2] + '→' + to] || 0) + 1;
  }
  for (const [f, list] of Object.entries(changes)) {
    const fp = path.join(dir, f); let src = fs.readFileSync(fp, 'utf8');
    for (const [p, to, why] of list) {
      const re = new RegExp('(\\[\\d+,' + JSON.stringify(p[1]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',)"' + p[2] + '"');
      src = src.replace(re, (m, a) => a + JSON.stringify(to));
      if (dry) console.log(`${f.padEnd(9)} ${p[1]} ${p[2]} → ${to}   (${why})`);
    }
    if (!dry) fs.writeFileSync(fp, src);
  }
  console.log(`era ${era}: ${all.length} candidates, ${found.size} found on Wikipedia, ${n} changed ` + JSON.stringify(tally) + (failed ? ` (${failed} requests failed: run again)` : '') + (dry ? ' [dry run]' : ''));
})();
