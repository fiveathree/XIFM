// Build an era's data files from a compact text source.
// usage: node tools/fm-build-era.js <source.txt> <era>   → writes fm/data/<era>/<league>.js (one per @league)
//
// Source format (one item per line, # starts a comment):
//   @eng1|英超|Premier League|1                      league: id|Chinese name|English name|tier (country from the id)
//   =Manchester United|95|20                       club: name|rep|bank £m — stadium, capacity, colours, short and id
//                                                   are copied from the 2001/02 data (or another era's) when a club of that name exists
//   =Blackburn Rovers|80|12|BLB|Ewood Park|31367|#009EE0,#FFFFFF   …or given in full: |short|stadium|cap|col1,col2
//   GK Peter Schmeichel DEN 1963 88               player: pos, full name, nation, birth year, skill
//   ST Ronaldo BRA 1976 93 /Ronaldo                optional short name after " /"
const fs = require('fs'), path = require('path');
const [src, era] = process.argv.slice(2);
if (!src || !era) { console.log('usage: node tools/fm-build-era.js <source.txt> <era>'); process.exit(1); }

// 2001/02 club metadata, by lower-cased name
const known = {};
global.FM = { addLeague(L) { for (const c of L.clubs) if (!c.ref) known[c.name.toLowerCase()] = c; } };
for (const f of ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'eur', 'ned1', 'por1', 'tur1', 'bel1']) {
  const p = path.resolve('fm/data', f + '.js'); if (fs.existsSync(p)) require(p);
}
// then the other eras: the nearest earlier era wins (2010 data for a 2020 build); later eras only fill clubs nobody else has.
// Stadium moves after that era are corrected afterwards with tools/fm-stadiums.js.
const eraDirs = fs.readdirSync('fm/data').filter(d => /^\d{4}$/.test(d) && d !== String(era)).map(Number);
const loadEra = y => { const got = {}; global.FM = { addLeague(L) { for (const c of L.clubs) if (!c.ref) got[c.name.toLowerCase()] = c; } };
  for (const f of fs.readdirSync(path.join('fm/data', String(y)))) if (f.endsWith('.js')) { const p = path.resolve('fm/data', String(y), f); delete require.cache[p]; require(p); } return got; };
for (const y of eraDirs.filter(y => y < +era && y > 2001).sort((a, b) => a - b)) Object.assign(known, loadEra(y));
for (const y of eraDirs.filter(y => y < 2001 || y > +era).sort((a, b) => Math.abs(a - era) - Math.abs(b - era))) for (const [k, c] of Object.entries(loadEra(y))) if (!known[k]) known[k] = c;
const CTRY = { eng: 'ENG', sco: 'SCO', esp: 'ESP', ita: 'ITA', ger: 'GER', fra: 'FRA', ned: 'NED', por: 'POR', tur: 'TUR', bel: 'BEL', eur: 'EUR' };
const POS = new Set('GK RB LB CD DM CM RM LM AM ST'.split(' '));
const leagues = []; let L = null, C = null, errs = 0;
const err = (n, m) => { console.log(`line ${n}: ${m}`); errs++; };
fs.readFileSync(src, 'utf8').split(/\r?\n/).forEach((raw, i) => {
  const n = i + 1, line = raw.replace(/^\s*#.*$/, '').replace(/\s#\s.*$/, '').trim(); if (!line) return; // "#" comments, but not colour codes
  if (line[0] === '@') {
    const [id, name, ename, tier] = line.slice(1).split('|');
    L = { id, country: CTRY[id.replace(/\d+$/, '')] || 'EUR', name, ename, tier: +tier || 1, clubs: [] }; leagues.push(L); C = null; return;
  }
  if (line[0] === '=') {
    if (!L) return err(n, 'club before @league');
    const f = line.slice(1).split('|').map(s => s.trim()), k = known[f[0].toLowerCase()];
    const short = f[3] || k?.short, stadium = f[4] || k?.stadium, cap = +f[5] || k?.cap, col = f[6] ? f[6].split(',') : k?.col;
    if (!short || !stadium || !cap || !col) return err(n, `club "${f[0]}" not in 2001/02 data: give |short|stadium|cap|col1,col2`);
    let id = (k && !L.clubs.some(c => c.id === k.id)) ? k.id : short.toLowerCase().replace(/[^a-z0-9]/g, '');
    while (L.clubs.some(c => c.id === id)) id += 'x';
    C = { id, name: f[0], short, country: k?.country || (L.country === 'EUR' ? 'EUR' : L.country), stadium, cap, col, rep: +f[1], bank: +f[2], p: [] };
    if (f[7]) C.country = f[7];
    L.clubs.push(C); return;
  }
  if (!C) return err(n, 'player before a club');
  const [body, sn] = line.split(' /'), t = body.trim().split(/\s+/);
  const pos = t[0], sk = +t[t.length - 1], by = +t[t.length - 2], nat = t[t.length - 3], name = t.slice(1, -3).join(' ');
  if (!POS.has(pos) || !/^[A-Z]{3}$/.test(nat) || !(by >= 1950 && by <= 2010) || !(sk >= 30 && sk <= 95) || !name) return err(n, 'bad player: ' + line);
  const row = [0, name, pos, nat, by, sk]; if (sn) row.push(sn.trim());
  C.p.push(row);
});
// duplicates across the whole era
const seen = new Map();
for (const l of leagues) for (const c of l.clubs) for (const p of c.p) { if (seen.has(p[1])) err(0, `duplicate player ${p[1]} (${seen.get(p[1])} & ${c.name})`); seen.set(p[1], c.name); }
for (const l of leagues) for (const c of l.clubs) if (c.country === 'EUR') err(0, `guest club ${c.name} needs a country (|...|...|...|...|...|...|CODE)`);
if (errs) { console.log(`${errs} error(s); nothing written`); process.exit(1); }
const dir = path.join('fm/data', String(era)); fs.mkdirSync(dir, { recursive: true });
// keep squad numbers already in the built files (filled by tools/fm-shirt-numbers.js) — keyed by club name + player name
const oldNo = new Map();
global.FM = { addLeague(L) { for (const c of L.clubs) for (const p of c.p || []) if (p[0]) oldNo.set(c.name + '|' + p[1], p[0]); } };
for (const l of leagues) { const p = path.resolve(dir, l.id + '.js'); if (fs.existsSync(p)) { delete require.cache[p]; require(p); } }
for (const l of leagues) for (const c of l.clubs) for (const p of c.p) p[0] = oldNo.get(c.name + '|' + p[1]) || 0;
const q = s => JSON.stringify(s);
for (const l of leagues) {
  const out = `FM.addLeague({\n  id:${q(l.id)}, country:${q(l.country)}, name:${q(l.name)}, ename:${q(l.ename)}, tier:${l.tier},\n  clubs:[\n` +
    l.clubs.map(c => `    {id:${q(c.id)}, name:${q(c.name)}, short:${q(c.short)}, country:${q(c.country)}, stadium:${q(c.stadium)}, cap:${c.cap},\n     col:${q(c.col)}, rep:${c.rep}, bank:${c.bank},\n     p:[\n` +
      c.p.map(r => `       ${q(r)},`).join('\n') + (c.p.length ? '\n' : '') + `     ]},`).join('\n') + `\n  ]\n});\n`;
  fs.writeFileSync(path.join(dir, l.id + '.js'), out);
}
console.log(`era ${era}: ` + leagues.map(l => `${l.id} ${l.clubs.length} clubs/${l.clubs.reduce((t, c) => t + c.p.length, 0)} players`).join(', '));
console.log('files: ' + leagues.map(l => l.id).join(','));
