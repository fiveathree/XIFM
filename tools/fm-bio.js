// Height and preferred foot for career-mode players, from the Transfermarkt squad pages already in tools/.tm-cache
// (no new downloads). usage: node tools/fm-bio.js [era ...]   (no era = every era in fm/eras.js)
// Writes fm/data/<era>/bio.js:  FM.BIO = { pid: [heightCm, 'R'|'L'|'B'] }  (players found on Transfermarkt only)
// Matching: normalised full name + birth year (±1); a player found in any season's page counts for every era.
const fs = require('fs'), path = require('path');
const { norm, dec, CACHE } = require('./fm-tm-lib');
const FOOT = { right: 'R', left: 'L', both: 'B' };
const bio = new Map();   // norm(name) → [{ by, h, f }]
let pages = 0, rows = 0;
for (const f of fs.readdirSync(CACHE)) {
  const h = fs.readFileSync(path.join(CACHE, f), 'utf8'); if (!h.includes('/profil/spieler/') || !h.includes('rn_nummer')) continue;
  pages++;
  for (const r of h.split(/<tr class="(?:odd|even)">/).slice(1)) {
    const link = r.match(/href="\/[^"\/]+\/profil\/spieler\/\d+"[^>]*>([^<]*)</); if (!link) continue;
    const cells = r.replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').split('|').map(s => dec(s)).filter(Boolean);
    const dob = (cells.find(c => /^\d\d\/\d\d\/\d{4}/.test(c)) || '').match(/\d{4}/);
    const hm = cells.map(c => c.match(/^(\d),(\d\d) ?m$/)).find(Boolean), ft = cells.find(c => FOOT[c]);
    if (!dob || (!hm && !ft)) continue;
    const k = norm(dec(link[1])), e = { by: +dob[0], h: hm ? +hm[1] * 100 + +hm[2] : 0, f: ft ? FOOT[ft] : '' };
    const l = bio.get(k) || []; const same = l.find(x => x.by === e.by);
    if (same) { same.h = same.h || e.h; same.f = same.f || e.f; } else { l.push(e); bio.set(k, l); }
    rows++;
  }
}
console.log(`${pages} squad pages, ${rows} rows, ${bio.size} names`);
global.FM = {}; eval(fs.readFileSync('fm/eras.js', 'utf8'));
const eras = process.argv.slice(2).map(Number); const list = eras.length ? eras : Object.keys(FM.ERAS).map(Number);
for (const y of list) {
  const dir = y === 2001 ? 'fm/data' : path.join('fm/data', String(y)), out = {};
  let n = 0, hit = 0;
  for (const f of fs.readdirSync(dir).filter(f => /^[a-z]+\d?\.js$/.test(f) && !['pos2.js', 'youth.js', 'bio.js'].includes(f))) {
    global.FM = { addLeague(L) {
      for (const c of L.clubs) { if (c.ref) continue; c.p.forEach((p, i) => {
        n++; const pid = L.id + '.' + c.id + '.' + i, l = bio.get(norm(p[1])) || [];
        const e = l.find(x => x.by === p[4]) || l.find(x => Math.abs(x.by - p[4]) <= 1);
        if (e && (e.h || e.f)) { out[pid] = [e.h || 0, e.f || '']; hit++; }
      }); }
    } };
    eval(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  fs.writeFileSync(path.join(dir, 'bio.js'), `/* Height (cm) and preferred foot from Transfermarkt, by tools/fm-bio.js. pid → [height, 'R'|'L'|'B'] */\nFM.BIO = ${JSON.stringify(out)};\n`);
  console.log(`${y}: ${hit} / ${n} players`);
}
