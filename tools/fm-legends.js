// Build fm/legends.js (career-mode 傳奇球星 card pool) from the main game's player database in index.html.
// usage: node tools/fm-legends.js
// Each legend appears once, at his best card: [name, pos, nat, skill, season, club, short?].
// Positions are mapped to career-mode ones; the main game's rating (50–105) is mapped band by band so the card grade stays
// the same (UR 101+ → 90+, SSR 90–100 → 85–89, SR 80–89 → 77–84, R 70–79 → 68–76, C → below 68).
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const i = html.indexOf('const P=['), j = html.indexOf('const grade=');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(i, j).replace(/^const (P|NATN|MOREV|V2526)\s*=/gm, 'var $1='), ctx);
const POS = { CB: 'CD', CDM: 'DM', CAM: 'AM' };
const sk = r => Math.round(r >= 101 ? 90 + (r - 101) * .8 : r >= 90 ? 85 + (r - 90) * .4 : r >= 80 ? 77 + (r - 80) * .78 : r >= 70 ? 68 + (r - 70) * .9 : 50 + (r - 50) * .9);
// career-mode design: extra UR legends in midfield, defence and goal (the main game keeps UR for its 11 prime legends).
// Grades count position (fm/core.js gradeP: keepers/defenders +2, DM/CM +1), so UR = 88+ for keepers and defenders,
// 89+ for DM/CM, 90+ elsewhere.
const UR_DESIGN = {
  'Lev Yashin': 90, 'Gianluigi Buffon': 90, 'Iker Casillas': 89, 'Manuel Neuer': 89, 'Peter Schmeichel': 88,
  'Franco Baresi': 90, 'Bobby Moore': 89, 'Fabio Cannavaro': 89, 'Alessandro Nesta': 88, 'Virgil van Dijk': 88, 'Cafu': 88, 'Roberto Carlos': 88,
  'Sergio Ramos': 88, 'Philipp Lahm': 88, 'Carles Puyol': 88,
  'Zico': 91, 'Michel Platini': 91, 'Bobby Charlton': 90, 'Kevin De Bruyne': 90, 'Kaká': 90, 'Xavi': 90, 'Andrés Iniesta': 90, 'Lothar Matthäus': 90,
  'Luka Modrić': 89, 'Andrea Pirlo': 89, 'Steven Gerrard': 89, 'Patrick Vieira': 89, 'Toni Kroos': 89, 'Frank Lampard': 89,
};
const rows = ctx.P.map(p => { const best = p[3].slice().sort((a, b) => b[2] - a[2])[0]; return [p[0], POS[p[1]] || p[1], p[2], UR_DESIGN[p[0]] || Math.min(95, sk(best[2])), best[0], best[1]].concat(p[4] ? [p[4]] : []); });
const miss = Object.keys(UR_DESIGN).filter(n => !ctx.P.some(p => p[0] === n)); if (miss.length) console.log('not in index.html:', miss.join(', '));
fs.writeFileSync('fm/legends.js', '/* 傳奇球星 card pool for career mode, built from index.html by tools/fm-legends.js — do not edit by hand.\n   [name, pos, nat, skill, best season, club, short?]; the index is the card id (L0, L1, …): only append. */\nFM.LEGENDS = [\n' +
  rows.map(r => '  ' + JSON.stringify(r) + ',').join('\n') + '\n];\nFM.LEGNAT = ' + JSON.stringify(ctx.NATN) + ';\n');
const GB = { GK: 2, CD: 2, RB: 2, LB: 2, RWB: 2, LWB: 2, DM: 1, CM: 1 }, g = (s, pos) => { s += GB[pos] || 0; return s >= 90 ? 'UR' : s >= 85 ? 'SSR' : s >= 77 ? 'SR' : s >= 68 ? 'R' : 'C'; }, cnt = {}, urPos = {};
for (const r of rows) { const k = g(r[3], r[1]); cnt[k] = (cnt[k] || 0) + 1; if (k === 'UR') urPos[r[1]] = (urPos[r[1]] || 0) + 1; }
console.log('UR by position', JSON.stringify(urPos));
console.log(rows.length, 'legends', JSON.stringify(cnt));
