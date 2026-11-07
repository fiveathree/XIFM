// Real youth squads (U18 + U21/U23) from Transfermarkt → fm/data/<era>/youth.js (FM.YOUTH).
// usage: node tools/fm-tm-youth.js <era> [clubId ...]      e.g. node tools/fm-tm-youth.js 2025 eng1.mun
//   clubId = league.club as in the game (eng1.mun). Existing clubs in youth.js are kept unless listed again.
//   For each club: finds "<name> U18" and "<name> U21" on Transfermarkt, reads that season's squads and keeps players
//   23 or under who are not already in the era's first-team data. A player in both squads goes to U18 if he is 18 or
//   under that season. Ability: from market value when there is one (same fit as tools/fm-tm-era.js), else by age;
//   potential: higher for younger and more valuable players. Row: [name, pos, nat, birthYear, skill, potential, 'u18'|'u21', shirtNo].
const fs = require('fs'), path = require('path');
const { get, dec, norm, NAT, parseSquad } = require('./fm-tm-lib');
const args = process.argv.slice(2), era = +args[0], want = args.slice(1).length ? args.slice(1) : ['eng1.mun'];
if (!era) { console.log('usage: node tools/fm-tm-youth.js <era> [clubId ...]'); process.exit(1); }
const dir = era === 2001 ? 'fm/data' : path.join('fm/data', String(era));
const L = {}; for (const f of fs.readdirSync(dir).filter(f => /^[a-z]+\d?\.js$/.test(f))) { global.FM = { addLeague: x => { L[x.id] = x; } }; eval(fs.readFileSync(path.join(dir, f), 'utf8')); }
const eraNames = new Set(Object.values(L).flatMap(l => l.clubs.flatMap(c => (c.p || []).map(p => norm(p[1])))));
const hsh = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
async function findYouth(name, tag) {
  const h = await get('/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(name + ' ' + tag)); if (!h) return null;
  const i = h.indexOf('Search results: Clubs'); if (i < 0) return null;
  for (const m of h.slice(i).matchAll(/<a title="([^"]+)" href="\/([^"\/]+)\/startseite\/verein\/(\d+)"/g)) {
    const t = dec(m[1]); if (norm(t).startsWith(norm(name)) && (new RegExp(tag.replace('U21', 'U2[13]'), 'i')).test(t)) return { id: m[3], slug: m[2], tm: t };
  }
  return null;
}
(async () => {
  const fp = path.join(dir, 'youth.js'), cur = {};
  if (fs.existsSync(fp)) { global.FM = {}; eval(fs.readFileSync(fp, 'utf8')); Object.assign(cur, global.FM.YOUTH || {}); }
  for (const cid of want) {
    const [lg, id] = cid.split('.'), club = L[lg] && L[lg].clubs.find(c => c.id === id);
    if (!club) { console.log(cid + ': no such club in ' + era); continue; }
    const got = new Map();
    for (const tag of ['U18', 'U21']) {
      const yc = await findYouth(club.name, tag); if (!yc) { console.log(`${club.name} ${tag}: not found`); continue; }
      const h = await get(`/${yc.slug}/kader/verein/${yc.id}/saison_id/${era}/plus/1`); if (!h) continue;
      for (const t of parseSquad(h)) {
        if (!t.by || !t.pos || era - t.by > 23 || era - t.by < 15 || eraNames.has(norm(t.name))) continue;
        if (t.joined && t.joined > `${era}-09-01` && !got.has(t.id)) { t.late = 1; }
        const prev = got.get(t.id); if (prev && !prev.late) continue;
        got.set(t.id, Object.assign(t, { team: era - t.by <= 18 ? 'u18' : 'u21' }));
      }
      console.log(`${club.name} ${tag}: ${yc.tm}`);
    }
    const rows = [];
    for (const t of got.values()) {
      if (t.late) continue;   // joins after the start of the season
      const nat = NAT[t.nat]; if (!nat) { console.log('  nation?', t.name, t.nat); continue; }
      const age = era - t.by, base = { 15: 44, 16: 47, 17: 50, 18: 53, 19: 56, 20: 58, 21: 60 }[age] || 61;
      const sk = clamp(Math.round(t.v > 0 ? Math.max(base, 13.7 + 3.63 * Math.log(t.v) + .19 * age) : base), 40, 74);
      const pot = clamp(Math.round(sk + 8 + (21 - age) * 2 + hsh(t.name) % 9 + (t.v >= 1e6 ? 6 : t.v >= 1e5 ? 3 : 0)), sk + 4, 92);
      rows.push([dec(t.name), t.pos, nat, t.by, sk, pot, t.team, t.no || 0]);
    }
    rows.sort((a, b) => (a[6] > b[6] ? 1 : -1) || b[4] - a[4]);
    cur[cid] = rows;
    console.log(`${cid}: ${rows.length} youth players (U18 ${rows.filter(r => r[6] === 'u18').length}, U21 ${rows.filter(r => r[6] === 'u21').length})`);
  }
  fs.writeFileSync(fp, `/* Real youth squads (青年軍) for this era, from Transfermarkt by tools/fm-tm-youth.js.\n   club id → [name, pos, nat, birthYear, skill, potential, 'u18'|'u21', shirtNo] */\nFM.YOUTH = {\n` +
    Object.entries(cur).map(([k, rows]) => `  ${JSON.stringify(k)}: [\n${rows.map(r => '    ' + JSON.stringify(r) + ',').join('\n')}\n  ],`).join('\n') + '\n};\n');
})();
