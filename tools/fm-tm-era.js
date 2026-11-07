// Build a whole start season (era) from Transfermarkt, using the eras we already have for ability and club details.
// usage: node tools/fm-tm-era.js <year> [<year> ...] [--dry]      e.g. node tools/fm-tm-era.js 2005 2006
//   Writes fm/data/<year>/<league>.js for eng1 … bel1 + eur, and pos2.js. Then add the era to fm/eras.js.
//   • Clubs: each league's member clubs that season (Transfermarkt competition page). eur = the guest clubs of the
//     nearest existing era that are not in one of our leagues that season.
//   • Club details (id, short, stadium, colours, …) come from the nearest era that has the club (tools/tm-clubs.json links
//     our club names to Transfermarkt ids); rep and bank are interpolated by year between the eras before and after.
//     A club no era has gets its stadium from Transfermarkt and rep/bank from its squad strength.
//   • Players: the club's squad page for that season. Players who joined after 1 September are left out (mid-season
//     arrivals). Ability: interpolated between the player's abilities in the eras before and after (or the nearest one
//     plus an age curve); otherwise from market value + age (fitted on the known players of the same season); otherwise
//     from the club's known players. Secondary positions come from the other eras' pos2.js.
//   Pages are cached in tools/.tm-cache/ and spaced ~2.5 s apart (one season ≈ 250 pages ≈ 11 minutes the first time).
const fs = require('fs'), path = require('path');
const { get, norm, dec, NAT, parseSquad, stats } = require('./fm-tm-lib');
const args = process.argv.slice(2), dry = args.includes('--dry'), years = args.filter(a => /^\d{4}$/.test(a)).map(Number);
if (!years.length) { console.log('usage: node tools/fm-tm-era.js <year> [<year> ...] [--dry]'); process.exit(1); }
const LGS = ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'ned1', 'por1', 'tur1', 'bel1'];
const COMP = { eng1: 'GB1', eng2: 'GB2', eng3: 'GB3', eng4: 'GB4', sco1: 'SC1', esp1: 'ES1', ita1: 'IT1', ger1: 'L1', fra1: 'FR1', ned1: 'NL1', por1: 'PO1', tur1: 'TR1', bel1: 'BE1' };
const TIERD = { 1: 70, 2: 60, 3: 54, 4: 48, 5: 66 };   // ability of an unknown player at an unknown club, by league tier
const clubIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'tm-clubs.json'), 'utf8'));
const tmOf = {}; for (const [n, c] of Object.entries(clubIds)) (tmOf[c.id] = tmOf[c.id] || []).push(n);

// ---- existing eras ----
const eraDir = y => y === 2001 ? 'fm/data' : path.join('fm/data', String(y));
const isLeague = f => /^[a-z]+\d?\.js$/.test(f) && f !== 'pos2.js';
function loadEra(y) {
  const L = {}, dir = eraDir(y);
  for (const f of fs.readdirSync(dir).filter(isLeague)) { global.FM = { addLeague: x => { L[x.id] = x; } }; eval(fs.readFileSync(path.join(dir, f), 'utf8')); }
  // resolve {ref:"eur.aja"} to the club itself
  const byId = {}; for (const l of Object.values(L)) for (const c of l.clubs) if (!c.ref) byId[l.id + '.' + c.id] = c;
  for (const l of Object.values(L)) l.clubs = l.clubs.map(c => c.ref ? Object.assign({ moved: 1 }, byId[c.ref]) : c);
  let pos2 = {}; const p2 = path.join(dir, 'pos2.js'); if (fs.existsSync(p2)) { global.FM = {}; eval(fs.readFileSync(p2, 'utf8')); pos2 = global.FM.POS2 || {}; }
  return { y, L, pos2 };
}
const ERAS = fs.readdirSync('fm/data').filter(d => /^\d{4}$/.test(d)).map(Number).concat(2001).filter(y => !years.includes(y)).sort((a, b) => a - b).map(loadEra);
const hist = {};      // norm(name) → [{y, sk, by, pos, nat, sn}]
const clubHist = {};  // TM club id → [{y, lg, c}]
for (const E of ERAS) for (const l of Object.values(E.L)) for (const c of l.clubs) {
  if (!c.moved || l.id !== 'eur') { const t = clubIds[c.name]; if (t) (clubHist[t.id] = clubHist[t.id] || []).push({ y: E.y, lg: l.id, c }); }
  if (c.moved) continue;
  for (const p of c.p) { if (/青年軍/.test(p[1])) continue; (hist[norm(p[1])] = hist[norm(p[1])] || []).push({ y: E.y, sk: p[5], by: p[4], pos: p[2], nat: p[3], sn: p[6], name: p[1] }); }
}
const pos2All = {}; for (const E of ERAS.slice().sort((a, b) => b.y - a.y)) Object.assign(pos2All, E.pos2);

// age curve: ability change from one birthday to the next
const AGE = a => a < 21 ? 3 : a < 24 ? 2 : a < 27 ? 1 : a < 30 ? 0 : a < 32 ? -1 : a < 34 ? -2 : -3;
const ageMove = (by, y0, y1) => { let s = 0; if (y1 > y0) for (let y = y0; y < y1; y++) s += AGE(y - by); else for (let y = y0; y > y1; y--) s -= AGE(y - 1 - by); return s; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function known(t, year) {   // [{y, sk, ...}] for this Transfermarkt player
  const h = (hist[norm(t.name)] || []).filter(x => !t.by || Math.abs(x.by - t.by) <= 1);
  if (h.length) return h;
  // "Firstname Lastname" vs a short/long form: same surname + first initial + birth year
  const w = norm(t.name).split(' '); if (w.length < 2 || !t.by) return [];
  for (const [k, v] of Object.entries(hist)) { const u = k.split(' '); if (u.length > 1 && u[u.length - 1] === w[w.length - 1] && u[0][0] === w[0][0]) { const m = v.filter(x => x.by === t.by); if (m.length) return m; } }
  return [];
}
function skillFrom(h, by, year) {
  const before = h.filter(x => x.y < year).sort((a, b) => b.y - a.y)[0], after = h.filter(x => x.y > year).sort((a, b) => a.y - b.y)[0];
  if (before && after && after.y - before.y <= 16) return Math.round(before.sk + (after.sk - before.sk) * (year - before.y) / (after.y - before.y));
  const n = [before, after].filter(Boolean).sort((a, b) => Math.abs(a.y - year) - Math.abs(b.y - year))[0];
  if (!n || Math.abs(n.y - year) > 9) return null;
  return clamp(n.sk + ageMove(by || n.by, n.y, year), 35, 94);
}
function nearestClub(tmid, year) {
  const h = clubHist[tmid] || []; if (!h.length) return null;
  const sorted = h.slice().sort((a, b) => Math.abs(a.y - year) - Math.abs(b.y - year) || a.y - b.y), near = sorted[0].c;
  const before = h.filter(x => x.y < year).sort((a, b) => b.y - a.y)[0], after = h.filter(x => x.y > year).sort((a, b) => a.y - b.y)[0];
  const lerp = k => before && after ? Math.round((before.c[k] + (after.c[k] - before.c[k]) * (year - before.y) / (after.y - before.y)) * 10) / 10 : near[k];
  return { near, rep: Math.round(lerp('rep')), bank: lerp('bank'), lg: sorted[0].lg };
}
const cleanName = s => dec(s).replace(/^(FC|AFC|SC|SV|CF|SK|FK|KV|KRC|RSC|R\.)\s+/, '').replace(/\s+(FC|AFC|CF|SC|SAD)$/, '').trim();
const nearestEra = (year, earlierFirst) => ERAS.slice().sort((a, b) => earlierFirst ? ((a.y > year) - (b.y > year)) || Math.abs(a.y - year) - Math.abs(b.y - year) : Math.abs(a.y - year) - Math.abs(b.y - year) || a.y - b.y)[0];

async function build(year) {
  const head = nearestEra(year, true);   // league names: the nearest earlier era (league names changed over time)
  const leagues = {}, taken = new Set(), report = [];
  // 1. member clubs of each league that season
  for (const lg of LGS) {
    const h = await get(`/x/startseite/wettbewerb/${COMP[lg]}/plus/?saison_id=${year}`); if (!h) { report.push(`${lg}: league page failed`); continue; }
    const seen = new Map();
    for (const m of h.matchAll(new RegExp(`<a title="([^"]+)" href="/([^"/]+)/startseite/verein/(\\d+)/saison_id/${year}"`, 'g'))) if (!seen.has(m[3])) seen.set(m[3], { id: m[3], slug: m[2], tm: dec(m[1]) });
    leagues[lg] = [...seen.values()]; leagues[lg].forEach(c => taken.add(c.id));
  }
  // guest clubs: the nearest era's eur list, minus clubs in our leagues this season
  const g = nearestEra(year, false).L.eur;
  leagues.eur = g.clubs.filter(c => !c.moved).map(c => clubIds[c.name]).filter(t => t && !taken.has(t.id)).map(t => ({ id: t.id, slug: t.slug, tm: t.tm }));
  // 2. squads
  const raw = {};
  for (const [lg, cl] of Object.entries(leagues)) for (const c of cl) {
    const h = await get(`/${c.slug}/kader/verein/${c.id}/saison_id/${year}/plus/1`);
    if (h == null) { report.push(`${c.tm}: squad page failed`); continue; }
    const hs = h.indexOf('Stadium:'), hd = hs > 0 ? h.slice(hs, hs + 800).replace(/<[^>]+>/g, '|').split('|').map(dec).filter(Boolean) : [];
    raw[c.id] = { lg, c, tm: parseSquad(h), stadium: hd[1], cap: hd[2] ? +hd[2].replace(/\D/g, '') : 0 };
  }
  // 3. abilities: known players first, then a value fit for this season
  const cut = `${year}-09-02`, end = `${year + 1}-07-01`, rows = [], fit = [], placed = new Map();
  for (const R of Object.values(raw)) {
    R.tm = R.tm.filter(t => !(t.joined && t.joined >= cut && t.joined < end));   // arrived mid-season
    for (const t of R.tm) {
      const h = known(t, year); t.h = h; t.sk = h.length ? skillFrom(h, t.by, year) : null;
      if (t.sk && t.v > 0) fit.push([Math.log(t.v), year - (t.by || h[0].by), t.sk]);
    }
  }
  let est = () => null;
  if (fit.length >= 40) {
    const X = fit.map(([lv, ag]) => [1, lv, ag]), y = fit.map(r => r[2]);
    const A = [0, 1, 2].map(i => [...[0, 1, 2].map(j => X.reduce((s, r) => s + r[i] * r[j], 0)), X.reduce((s, r, k) => s + r[i] * y[k], 0)]);
    for (let i = 0; i < 3; i++) { const p = A[i][i]; for (let j = i; j < 4; j++) A[i][j] /= p; for (let k = 0; k < 3; k++) if (k !== i) { const q = A[k][i]; for (let j = i; j < 4; j++) A[k][j] -= q * A[i][j]; } }
    const [a, b, c2] = A.map(r => r[3]);
    est = t => t.v > 0 ? clamp(Math.round(a + b * Math.log(t.v) + c2 * (year - (t.by || year - 25))), 38, 90) : null;
    report.push(`ability fit on ${fit.length}: skill ≈ ${a.toFixed(1)} + ${b.toFixed(2)}·ln(value) + ${c2.toFixed(2)}·age`);
  }
  // 4. clubs
  const out = {}; let nKnown = 0, nVal = 0, nClub = 0, nSkip = 0; const newClubs = [];
  const repFit = [];
  for (const [lg, cl] of Object.entries(leagues)) {
    const L = out[lg] = Object.assign({}, head.L[lg] || nearestEra(year, false).L[lg], { clubs: [] });
    delete L.clubs_; const tier = L.tier || 5;
    const ids = new Set(), shorts = new Set();
    for (const c of cl) {
      const R = raw[c.id]; if (!R) continue;
      const ks = R.tm.map(t => t.sk).filter(Boolean).sort((a, b) => a - b), med = ks.length >= 5 ? ks[Math.floor(ks.length / 2)] : null;
      const nc = nearestClub(c.id, year);
      const p = [];
      for (const t of R.tm) {
        if (placed.has(t.id)) continue;
        const h0 = t.h[0] || {};
        let sk = t.sk, how = 'k';
        if (!sk) { sk = est(t); how = 'v'; }
        if (!sk) { const age = year - (t.by || year - 25); sk = clamp(Math.round((med || (nc ? (nc.rep * .3 + 48) : TIERD[tier])) - 3 + (age < 20 ? -8 : age < 22 ? -4 : 0)), 36, 85); how = 'c'; }
        const nat = NAT[t.nat] || h0.nat, by = t.by || h0.by, pos = t.pos || h0.pos;
        if (!nat || !by || !pos || by > 2010 || by < 1950) { nSkip++; continue; }
        // keep wing-backs and our side for wide players we already know
        let ps = pos; if (h0.pos && ((h0.pos === 'RWB' && pos === 'RB') || (h0.pos === 'LWB' && pos === 'LB'))) ps = h0.pos;
        const name = h0.name || t.name;
        p.push({ t, row: [t.no || 0, name, ps, nat, by, sk].concat(h0.sn ? [h0.sn] : []), how });
      }
      // squad: both best keepers, then the best of the rest, up to 28 (fringe players far below the squad dropped)
      p.sort((a, b) => b.row[5] - a.row[5]);
      const gks = p.filter(x => x.row[2] === 'GK').slice(0, 3), rest = p.filter(x => x.row[2] !== 'GK');
      const top = p.slice(0, 16).map(x => x.row[5]), floor = (top[top.length - 1] || 50) - 10;
      const squad = gks.slice(0, 2).concat(gks.slice(2).filter(x => x.row[5] >= floor)).concat(rest.filter(x => x.row[5] >= floor).slice(0, 25));
      if (squad.length < 11) { report.push(`${c.tm}: only ${squad.length} players`); }
      const nos = new Set(); for (const x of squad) { if (x.row[0] && nos.has(x.row[0])) x.row[0] = 0; if (x.row[0]) nos.add(x.row[0]); }
      const order = { GK: 0, RB: 1, RWB: 1, LB: 2, LWB: 2, CD: 3, DM: 4, CM: 5, RM: 6, LM: 6, AM: 7, RW: 8, LW: 8, CF: 9, ST: 10 };
      squad.sort((a, b) => order[a.row[2]] - order[b.row[2]] || b.row[5] - a.row[5]);
      const names = new Set(L.clubs.flatMap(k => k.p.map(r => r[1])));
      const prow = squad.filter(x => !names.has(x.row[1])).map(x => { placed.set(x.t.id, c.id); if (x.how === 'k') nKnown++; else if (x.how === 'v') nVal++; else nClub++; return x.row; });
      // club details
      let club;
      if (nc) {
        const n = nc.near; club = { id: n.id, name: n.name, short: n.short, country: n.country, stadium: n.stadium, cap: n.cap, col: n.col, rep: nc.rep, bank: nc.bank };
      } else {
        const name = cleanName(c.tm), base = norm(name).replace(/ /g, '');
        club = { id: base.slice(0, 3), name, short: base.slice(0, 3).toUpperCase(), country: lg === 'eur' ? 'EUR' : L.country, stadium: R.stadium || name + ' Stadium', cap: R.cap || 15000, col: ['#DDDDDD', '#333333'], rep: 0, bank: 0, fresh: 1 };
        newClubs.push(`${lg}:${name}`);
      }
      let id = club.id, k = 2; while (ids.has(id)) id = club.id.slice(0, 3) + k++; club.id = id; ids.add(id);
      let sh = club.short, k2 = 2; while (shorts.has(sh)) sh = club.short.slice(0, 2) + k2++; club.short = sh; shorts.add(sh);
      club.p = prow;
      const avg = prow.map(r => r[5]).sort((a, b) => b - a).slice(0, 16); club.str = avg.reduce((s, v) => s + v, 0) / Math.max(1, avg.length);
      if (!club.fresh) repFit.push([club.str, club.rep, club.bank]);
      L.clubs.push(club);
    }
  }
  // rep / bank for clubs no era has: linear fit on the known clubs' squad strength
  const lin = k => { const n = repFit.length, mx = repFit.reduce((s, r) => s + r[0], 0) / n, my = repFit.reduce((s, r) => s + r[k], 0) / n;
    const b = repFit.reduce((s, r) => s + (r[0] - mx) * (r[k] - my), 0) / repFit.reduce((s, r) => s + (r[0] - mx) ** 2, 0); return x => my + b * (x - mx); };
  const fr = lin(1), fb = lin(2);
  for (const L of Object.values(out)) for (const c of L.clubs) { if (c.fresh) { c.rep = clamp(Math.round(fr(c.str)), 15, 92); c.bank = clamp(Math.round(fb(c.str) * 10) / 10, 0.5, 80); if (c.country === 'EUR') c.country = 'EUR'; } delete c.fresh; delete c.str; }
  // eur clubs need their own country: take it from the nearest era (always known there)
  for (const c of out.eur.clubs) if (c.country === 'EUR') c.country = 'EUR';
  // 5. write
  const allNames = new Set(Object.values(out).flatMap(L => L.clubs.flatMap(c => c.p.map(r => r[1]))));
  const pos2 = Object.fromEntries(Object.entries(pos2All).filter(([n]) => allNames.has(n)));
  const nPl = Object.values(out).reduce((s, L) => s + L.clubs.reduce((t, c) => t + c.p.length, 0), 0);
  console.log(`\nera ${year}: ${Object.values(out).reduce((s, L) => s + L.clubs.length, 0)} clubs, ${nPl} players (ability from other eras ${nKnown}, from value ${nVal}, from club level ${nClub}; ${nSkip} skipped), ${Object.keys(pos2).length} secondary positions` +
    (stats().failed ? `, ${stats().failed} requests failed (run again)` : '') + ` · league names from ${head.y}`);
  for (const r of report) console.log('  ' + r);
  if (newClubs.length) console.log('  clubs no other era has (check colours/short name): ' + newClubs.join(', '));
  if (dry) return;
  const dir = path.join('fm/data', String(year)); fs.mkdirSync(dir, { recursive: true });
  const js = v => JSON.stringify(v);
  for (const [lg, L] of Object.entries(out)) {
    const s = `FM.addLeague({\n  id:${js(L.id)}, country:${js(L.country)}, name:${js(L.name)}, ename:${js(L.ename)}, tier:${L.tier},\n  clubs:[\n` +
      L.clubs.map(c => `    {id:${js(c.id)}, name:${js(c.name)}, short:${js(c.short)}, country:${js(c.country)}, stadium:${js(c.stadium)}, cap:${c.cap},\n     col:${js(c.col)}, rep:${c.rep}, bank:${c.bank},\n     p:[\n` +
        c.p.map(r => '       ' + js(r) + ',').join('\n') + '\n     ]},').join('\n') + '\n  ]\n});\n';
    fs.writeFileSync(path.join(dir, lg + '.js'), s);
  }
  fs.writeFileSync(path.join(dir, 'pos2.js'), '/* Secondary positions (次位置) for this era: player name → positions they also play at full ability.\n   Taken from the other eras by tools/fm-tm-era.js. */\nFM.POS2 = {\n' +
    Object.entries(pos2).sort().map(([k, v]) => `  ${js(k)}: ${js(v)},`).join('\n') + '\n};\n');
}
(async () => { for (const y of years) await build(y); })();
