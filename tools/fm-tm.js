// Correct an era's squads from Transfermarkt's season squad pages (numbers, positions, missing players, secondary positions).
// usage: node tools/fm-tm.js <era> [--dry] [--profiles] [league ...]
//   era 2001 = fm/data/*.js, others = fm/data/<era>/*.js. Transfermarkt season = era (2004 → 2004/05).
//   Per club: finds the club on Transfermarkt (cached in tools/tm-clubs.json — fix a wrong match there by hand), reads
//   /kader/verein/<id>/saison_id/<era>/plus/1 and matches players by name + birth year (±1). Then:
//     • shirt number ← that season's number (unique within the club)
//     • position ← Transfermarkt's main position (wing-backs we already have stay; a wide player keeps our side)
//     • players missing from our squad are appended at the end of the club (pids stay stable) with an ability estimated
//       from their market value and age (fitted on the matched players of the same era); skipped if the name is already
//       elsewhere in the era or the squad already has 30
//     • --profiles: also reads each matched player's profile for "Other position" → fm/data/<era>/pos2.js
//   Hand corrections in tools/fm-pos-manual.json win over everything. Pages are cached in tools/.tm-cache/ (not committed).
//   Requests are spaced ~2.5 s apart. Prints a per-club report; --dry writes nothing.
const fs = require('fs'), path = require('path');
const { get, norm, dec, TMPOS, NAT, parseSquad, stats } = require('./fm-tm-lib');
const args = process.argv.slice(2), era = args[0], dry = args.includes('--dry'), profiles = args.includes('--profiles');
const only = args.slice(1).filter(a => !a.startsWith('--'));
if (!era) { console.log('usage: node tools/fm-tm.js <era> [--dry] [--profiles] [league ...]'); process.exit(1); }
const dir = era === '2001' ? 'fm/data' : path.join('fm/data', era);
const CACHE = path.join(__dirname, '.tm-cache');
const CLUBF = path.join(__dirname, 'tm-clubs.json'), MANF = path.join(__dirname, 'fm-pos-manual.json');
const clubIds = fs.existsSync(CLUBF) ? JSON.parse(fs.readFileSync(CLUBF, 'utf8')) : {};
const manual = (fs.existsSync(MANF) ? JSON.parse(fs.readFileSync(MANF, 'utf8')) : {})[era] || {};
async function findClub(name) {
  if (clubIds[name]) return clubIds[name];
  let h = await get('/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(name)); if (h == null) return null;
  if (h.indexOf('Search results: Clubs') < 0 && /[&.']/.test(name)) h = await get('/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(name.replace(/&.*$|[.']/g, ' ').trim())) || '';
  const i = h.indexOf('Search results: Clubs'); if (i < 0) return null;   // only the club results, not players' current clubs
  const strip = s => norm(s).split(' ').filter(w => !['fc', 'afc', 'cf', 'sc', 'ac', 'sv', 'fk', 'sk', 'bk', 'the', 'de', 'and', 'hove'].includes(w)).join(' ');
  const want = strip(name), cand = [];
  for (const m of h.slice(i).matchAll(/<a title="([^"]+)" href="\/([^"\/]+)\/startseite\/verein\/(\d+)"/g)) {
    if (/\bU\d\d\b|\bII\b|\bB\b|Youth|Reserves|Women|Ladies|Juniors|UEFA/i.test(m[1])) continue;
    const t = strip(dec(m[1]));
    cand.push({ id: m[3], slug: m[2], tm: dec(m[1]), sc: t === want ? 0 : t.includes(want) || want.includes(t) ? 1 : 2 });
  }
  const best = cand.slice().sort((a, b) => a.sc - b.sc)[0];
  if (!best || (best.sc === 2 && best !== cand[0])) return null;
  clubIds[name] = { id: best.id, slug: best.slug, tm: best.tm }; return clubIds[name];
}
// our player ↔ TM player
function same(p, t) {
  if (t.by && Math.abs(t.by - p[4]) > 1) return false;
  const a = norm(p[1]), b = norm(t.name), sn = p[6] ? norm(p[6]) : null;
  if (a === b || (sn && sn === b)) return true;
  const pa = a.split(' '), pb = b.split(' ');
  if (pa.length > 1 && pb.length > 1 && pa[pa.length - 1] === pb[pb.length - 1] && pa[0][0] === pb[0][0]) return true;
  if (pa.length === 1 && pb.includes(pa[0])) return true;
  if (pb.length === 1 && pa.includes(pb[0])) return true;
  return a.includes(b) || b.includes(a);
}
const side = p => /^R/.test(p) ? 'R' : /^L/.test(p) ? 'L' : '';
const mirror = p => p.replace(/^R/, '#').replace(/^L/, 'R').replace(/^#/, 'L');
function newPos(ours, tm) {
  if (!tm) return ours;
  if ((ours === 'RWB' && tm === 'RB') || (ours === 'LWB' && tm === 'LB')) return ours;
  if (side(ours) && side(tm) && side(ours) !== side(tm) && ['RW', 'LW', 'RM', 'LM', 'RB', 'LB', 'RWB', 'LWB'].includes(tm)) return mirror(tm);
  return tm;
}

(async () => {
  const isLeague = f => /^[a-z]+\d?\.js$/.test(f) && f !== 'pos2.js';
  const files = fs.readdirSync(dir).filter(f => isLeague(f) && (!only.length || only.includes(f.replace('.js', ''))));
  const all = {}; for (const f of fs.readdirSync(dir).filter(isLeague)) { const L = []; global.FM = { addLeague: x => L.push(x) }; eval(fs.readFileSync(path.join(dir, f), 'utf8')); all[f] = L[0]; }
  const eraNames = new Set(Object.values(all).flatMap(l => l.clubs.flatMap(c => (c.p || []).map(p => p[1]))));
  const plan = []; const fit = [];   // fit: [ln value, age, our skill] for the ability estimate
  for (const f of files) for (const club of all[f].clubs) {
    if (club.ref) continue;
    const cl = await findClub(club.name); if (!cl) { console.log(`${all[f].id}.${club.id} ${club.name}: not found on Transfermarkt`); continue; }
    const h = await get(`/${cl.slug}/kader/verein/${cl.id}/saison_id/${era}/plus/1`); if (h == null) { console.log(`${club.name}: request failed`); continue; }
    const tm = parseSquad(h), used = new Set();
    const match = club.p.map(p => { const t = tm.find(t => !used.has(t.id) && same(p, t)); if (t) used.add(t.id); return t || null; });
    match.forEach((t, i) => { if (t && t.v > 0) fit.push([Math.log(t.v), era - (t.by || club.p[i][4]), club.p[i][5]]); });
    plan.push({ f, club, cl, tm, match, extra: tm.filter(t => !used.has(t.id)) });
  }
  // least squares: skill ≈ a + b·ln(value) + c·age
  let est = () => null;
  if (fit.length >= 30) {
    const X = fit.map(([lv, ag]) => [1, lv, ag]), y = fit.map(r => r[2]);
    const XtX = [0, 1, 2].map(i => [0, 1, 2].map(j => X.reduce((s, r) => s + r[i] * r[j], 0))), Xty = [0, 1, 2].map(i => X.reduce((s, r, k) => s + r[i] * y[k], 0));
    const A = XtX.map((r, i) => [...r, Xty[i]]);
    for (let i = 0; i < 3; i++) { const p = A[i][i]; for (let j = i; j < 4; j++) A[i][j] /= p; for (let k = 0; k < 3; k++) if (k !== i) { const q = A[k][i]; for (let j = i; j < 4; j++) A[k][j] -= q * A[i][j]; } }
    const [a, b, c] = A.map(r => r[3]);
    est = t => t.v > 0 ? Math.max(40, Math.min(92, Math.round(a + b * Math.log(t.v) + c * (era - (t.by || era - 25))))) : null;
    console.log(`ability fit on ${fit.length} players: skill ≈ ${a.toFixed(1)} + ${b.toFixed(2)}·ln(value) + ${c.toFixed(2)}·age`);
  }
  // profiles → other positions
  const pos2 = {};
  if (profiles) for (const P of plan) for (const [i, t] of P.match.entries()) {
    if (!t) continue;
    const h = await get(`/${t.slug}/profil/spieler/${t.id}`); if (!h) continue;
    const i0 = h.indexOf('Other position'); if (i0 < 0) continue;
    const txt = h.slice(i0, i0 + 1500).replace(/<[^>]+>/g, '|').split('|').map(dec).filter(Boolean);
    const other = []; for (const s of txt.slice(1)) { if (!TMPOS[s]) break; other.push(TMPOS[s]); }
    const main = newPos(P.club.p[i][2], t.pos), o2 = [...new Set(other.map(o => side(main) && side(o) && side(o) !== side(main) && side(t.pos) !== side(main) ? mirror(o) : o))].filter(o => o !== main);
    if (o2.length) pos2[P.club.p[i][1]] = o2;
  }
  // write
  const byFile = {}; let nNo = 0, nPos = 0, nAdd = 0, nMatch = 0, nOurs = 0; const skipped = [];
  for (const P of plan) {
    const { club, match, extra } = P; nOurs += club.p.length;
    const lines = byFile[P.f] = byFile[P.f] || [];
    const nos = new Set(match.map(t => t && t.no).filter(Boolean));
    club.p.forEach((p, i) => {
      const t = match[i]; if (t) nMatch++;
      const m = manual[p[1]];
      let no = t && t.no ? t.no : (nos.has(p[0]) ? 0 : p[0]); if (no) nos.add(no);
      const pos = m && m.pos ? m.pos : t ? newPos(p[2], t.pos) : p[2];
      if (no !== p[0]) nNo++; if (pos !== p[2]) nPos++;
      if (no !== p[0] || pos !== p[2]) lines.push({ k: 'set', club: club.name, old: p, no, pos });
    });
    let size = club.p.length;
    const med = club.p.map(p => p[5]).sort((a, b) => a - b)[Math.floor(club.p.length / 2)] || 50;
    for (const t of extra.sort((a, b) => b.v - a.v)) {   // most valuable first
      if (size >= 28) { skipped.push(`${t.name} (${club.name}: squad full)`); continue; }
      if (!t.v || (est(t) && est(t) < med - 8)) continue;   // fringe / youth: the game makes its own youngsters
      if ([...eraNames].some(n => norm(n) === norm(t.name))) { skipped.push(`${t.name} (already elsewhere in ${era})`); continue; }
      const sk = est(t), nat = NAT[t.nat];
      if (!sk || !nat || !t.pos || !t.by) { skipped.push(`${t.name} (${!sk ? 'no value' : !nat ? 'nation ' + t.nat : 'no position/birth'})`); continue; }
      const m = manual[t.name];
      lines.push({ k: 'add', club: club.name, row: [t.no && !nos.has(t.no) ? t.no : 0, t.name, m && m.pos || t.pos, nat, t.by, sk] });
      if (t.no) nos.add(t.no); eraNames.add(t.name); size++; nAdd++;
    }
    console.log(`${all[P.f].id}.${club.id.padEnd(5)} ${P.cl.tm.padEnd(28)} matched ${match.filter(Boolean).length}/${club.p.length}, TM ${P.tm.length}, +${lines.filter(l => l.k === 'add' && l.club === club.name).length}`);
  }
  for (const [n, m] of Object.entries(manual)) if (m.pos2) pos2[n] = m.pos2;
  if (dry) for (const lines of Object.values(byFile)) for (const l of lines) console.log(l.k === 'set' ? `  ${l.club}: ${l.old[1]} #${l.old[0]} ${l.old[2]} → #${l.no} ${l.pos}` : `  ${l.club}: + ${JSON.stringify(l.row)}`);
  if (!dry) {
    for (const [f, lines] of Object.entries(byFile)) {
      const fp = path.join(dir, f); let s = fs.readFileSync(fp, 'utf8'); const crlf = s.includes('\r\n'); if (crlf) s = s.replace(/\r\n/g, '\n');
      for (const l of lines.filter(l => l.k === 'set')) {
        const re = new RegExp('\\[' + l.old[0] + ',' + JSON.stringify(l.old[1]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',"' + l.old[2] + '",');
        s = s.replace(re, () => '[' + l.no + ',' + JSON.stringify(l.old[1]) + ',' + JSON.stringify(l.pos) + ',');
      }
      for (const l of lines.filter(l => l.k === 'add')) {   // append at the end of the club's list
        const at = s.indexOf('name:' + JSON.stringify(l.club) + ','); if (at < 0) continue;
        const end = s.indexOf('\n     ]}', at); if (end < 0) continue;
        const prev = s.slice(0, end).trimEnd();
        s = prev + (prev.endsWith('[') ? '' : (prev.endsWith(',') ? '' : ',')) + '\n       ' + JSON.stringify(l.row) + ',' + s.slice(end);
      }
      fs.writeFileSync(fp, crlf ? s.replace(/\n/g, '\r\n') : s);
    }
    if (profiles || Object.keys(manual).length) {
      const fp = path.join(dir, 'pos2.js'), cur = {};
      if (fs.existsSync(fp)) { global.FM = {}; eval(fs.readFileSync(fp, 'utf8')); Object.assign(cur, global.FM.POS2 || {}); }
      Object.assign(cur, pos2);
      fs.writeFileSync(fp, '/* Secondary positions (次位置) for this era: player name → positions they also play at full ability.\n   Built by tools/fm-tm.js --profiles (Transfermarkt "Other position") + tools/fm-pos-manual.json. */\nFM.POS2 = {\n' +
        Object.entries(cur).sort().map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') + '\n};\n');
    }
    fs.writeFileSync(CLUBF, JSON.stringify(clubIds, null, 1));
  }
  console.log(`\nera ${era}: matched ${nMatch}/${nOurs}, numbers changed ${nNo}, positions changed ${nPos}, players added ${nAdd}, secondary positions ${Object.keys(pos2).length}` +
    (stats().failed ? ` (${stats().failed} requests failed: run again)` : '') + ` · ${stats().fetched} pages fetched${dry ? ' [dry run]' : ''}`);
  if (skipped.length) console.log('not added: ' + skipped.slice(0, 60).join('; ') + (skipped.length > 60 ? ` … +${skipped.length - 60}` : ''));
})();
