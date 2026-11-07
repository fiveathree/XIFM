// Real youth squads (U18 + U21/U23) from Transfermarkt → fm/data/<era>/youth.js (FM.YOUTH).
// usage: node tools/fm-tm-youth.js <era> [clubId ... | all]      e.g. node tools/fm-tm-youth.js 2025 eng1.mun   (all = every club; clubs already in youth.js are skipped unless named)
//   clubId = league.club as in the game (eng1.mun). Existing clubs in youth.js are kept unless listed again.
//   For each club: finds "<name> U18" and "<name> U21" on Transfermarkt, reads that season's squads and keeps players
//   23 or under who are not already in the era's first-team data. A player in both squads goes to U18 if he is 18 or
//   under that season. Ability: from market value when there is one (same fit as tools/fm-tm-era.js), else by age;
//   potential: higher for younger and more valuable players. Row: [name, pos, nat, birthYear, skill, potential, 'u18'|'u21', shirtNo].
const fs = require('fs'), path = require('path');
const { get, dec, norm, NAT, parseSquad } = require('./fm-tm-lib');
const args = process.argv.slice(2), era = +args[0];
let want = args.slice(1).length ? args.slice(1) : ['eng1.mun'];
if (!era) { console.log('usage: node tools/fm-tm-youth.js <era> [clubId ...]'); process.exit(1); }
const dir = era === 2001 ? 'fm/data' : path.join('fm/data', String(era));
const ALLSKIP = new Set();   // filled from youth.js below when running 'all'
const L = {}; for (const f of fs.readdirSync(dir).filter(f => /^[a-z]+\d?\.js$/.test(f))) { global.FM = { addLeague: x => { L[x.id] = x; } }; eval(fs.readFileSync(path.join(dir, f), 'utf8')); }
if (want[0] === 'all') want = Object.values(L).flatMap(l => l.clubs.filter(c => !c.ref).map(c => l.id + '.' + c.id)).filter(k => !ALLSKIP.has(k));
const eraNames = new Set(Object.values(L).flatMap(l => l.clubs.flatMap(c => (c.p || []).map(p => norm(p[1])))));
const hsh = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const clubIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'tm-clubs.json'), 'utf8'));
const core = n => norm(dec(n).replace(/\([^)]*\)/g, '')).split(' ').filter(w => !['fc', 'afc', 'cf', 'sc', 'ac', 'as', 'sv', 'fk', 'sk', 'kv', 'krc', 'rsc', 'kaa', 'club', 'de', 'the', 'u18', 'u19', 'u21', 'u23'].includes(w) && !/^\d+$/.test(w)).join(' ');
// youth / reserve side names differ by country: "Arsenal U18", "Bayern Munich U19", "Juventus Primavera",
// "Barcelona Atlètic", "Real Madrid Castilla", "Bayern Munich II", "Juventus Next Gen", "Jong Ajax"
const TAGS = { u18: ['U18', 'U19', 'Primavera', 'U17', 'U20', 'Juvenil'], u21: ['U21', 'U23', 'II', 'Next Gen', 'Atlètic', 'Castilla', 'B', 'Jong'] };
// reserve / youth sides whose Transfermarkt name doesn't follow "<club> <tag>" (searched by exact title)
const ALIAS = {
  'Atlético Madrid': { u21: ['Atlético Madrileño'] }, 'Athletic Bilbao': { u21: ['Bilbao Athletic'] }, 'Real Betis': { u21: ['Betis Deportivo Balompié'] },
  'Celta Vigo': { u21: ['Celta Fortuna', 'Celta de Vigo B'] }, Osasuna: { u21: ['CA Osasuna Promesas', 'Osasuna Promesas'] }, Valencia: { u21: ['Valencia Mestalla'] },
  Espanyol: { u21: ['RCD Espanyol B'] }, Sevilla: { u21: ['Sevilla Atlético'] }, Elche: { u21: ['Elche Ilicitano'] }, Levante: { u21: ['Atlético Levante UD', 'Atlético Levante'] },
  'Real Oviedo': { u21: ['Real Oviedo Vetusta'] }, Lyon: { u21: ['Olympique Lyon B', 'Olympique Lyonnais B'] }, Strasbourg: { u21: ['RC Strasbourg Alsace B', 'RC Strasbourg B'] },
  Brest: { u21: ['Stade Brestois 29 B'] }, Rennes: { u21: ['Stade Rennais FC B', 'Stade Rennes B'] }, 'Brighton & Hove Albion': { u21: ['Brighton U21', 'Brighton & Hove Albion U21'], u18: ['Brighton U18', 'Brighton & Hove Albion U18'] },
};
async function findAlias(title) {
  const h = await get('/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(title)); if (!h) return null;
  const i = h.indexOf('Search results: Clubs'); if (i < 0) return null;
  for (const m of h.slice(i).matchAll(/<a title="([^"]+)" href="\/([^"\/]+)\/startseite\/verein\/(\d+)"/g)) if (norm(dec(m[1])) === norm(title)) return { id: m[3], slug: m[2], tm: dec(m[1]) };
  return null;
}
async function findYouth(name, tag) {
  if (tag.startsWith('=')) return findAlias(tag.slice(1));
  const q = tag === 'Jong' ? 'Jong ' + name : name + ' ' + tag;
  const h = await get('/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(q)); if (!h) return null;
  const i = h.indexOf('Search results: Clubs'); if (i < 0) return null;
  const tagRe = new RegExp('(^|\\s)' + tag.replace(/\s/g, '\\s') + '(\\s|$)', 'i');
  for (const m of h.slice(i).matchAll(/<a title="([^"]+)" href="\/([^"\/]+)\/startseite\/verein\/(\d+)"/g)) {
    const t = dec(m[1]); if (!tagRe.test(t)) continue;
    const rest = core(t.replace(tagRe, ' ')); if (rest && (rest === core(name) || rest.startsWith(core(name) + ' ') || core(name).startsWith(rest + ' '))) return { id: m[3], slug: m[2], tm: t };
  }
  return null;
}
(async () => {
  const fp = path.join(dir, 'youth.js'), cur = {};
  if (fs.existsSync(fp)) { global.FM = {}; eval(fs.readFileSync(fp, 'utf8')); Object.assign(cur, global.FM.YOUTH || {}); }
  if (args[1] === 'all') want = want.filter(k => !cur[k]);
  for (const cid of want) {
    const [lg, id] = cid.split('.'), club = L[lg] && L[lg].clubs.find(c => c.id === id);
    if (!club) { console.log(cid + ': no such club in ' + era); continue; }
    const got = new Map();
    const bases = [...new Set([clubIds[club.name] && clubIds[club.name].tm, club.name].filter(Boolean))];
    for (const side of ['u18', 'u21']) {
      // the first name that exists and has players of the right age that season
      let yc = null, tag = '', sq = [];
      for (const tg of [...((ALIAS[club.name] || {})[side] || []).map(a => '=' + a), ...TAGS[side]]) {
        for (const b of bases) {
          const f = await findYouth(b, tg); if (!f) continue;
          const h = await get(`/${f.slug}/kader/verein/${f.id}/saison_id/${era}/plus/1`); if (!h) continue;
          const ok = parseSquad(h).filter(t => t.by && era - t.by <= 23 && era - t.by >= 15);
          if (ok.length >= 8) { yc = f; tag = tg; sq = ok; break; }
        }
        if (yc) break;
      }
      if (!yc) { console.log(`${club.name} ${side}: not found`); continue; }
      for (const t of sq) {
        if (!t.by || !t.pos || era - t.by > 23 || era - t.by < 15 || eraNames.has(norm(t.name))) continue;
        if (t.joined && t.joined > `${era}-09-01` && !got.has(t.id)) { t.late = 1; }
        const prev = got.get(t.id); if (prev && !prev.late) continue;
        got.set(t.id, Object.assign(t, { team: era - t.by <= 18 ? 'u18' : 'u21' }));
      }
      console.log(`${club.name} ${tag}: ${yc.tm}`);
    }
    if (!got.size) continue;
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
    // keep squads a sensible size: the best 26 of U18 and 18 of U21
    const keep = [...rows.filter(r => r[6] === 'u18').slice(0, 26), ...rows.filter(r => r[6] === 'u21').slice(0, 18)]; rows.length = 0; rows.push(...keep);
    cur[cid] = rows;
    save(cur);
    console.log(`${cid}: ${rows.length} youth players (U18 ${rows.filter(r => r[6] === 'u18').length}, U21 ${rows.filter(r => r[6] === 'u21').length})`);
  }
  save(cur);
})();
function save(cur) {
  const fp = path.join(dir, 'youth.js');
  fs.writeFileSync(fp, `/* Real youth squads (青年軍) for this era, from Transfermarkt by tools/fm-tm-youth.js.\n   club id → [name, pos, nat, birthYear, skill, potential, 'u18'|'u21', shirtNo] */\nFM.YOUTH = {\n` +
    Object.entries(cur).map(([k, rows]) => `  ${JSON.stringify(k)}: [\n${rows.map(r => '    ' + JSON.stringify(r) + ',').join('\n')}\n  ],`).join('\n') + '\n};\n');
}
