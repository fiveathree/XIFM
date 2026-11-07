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
const rows = ctx.P.map(p => { const best = p[3].slice().sort((a, b) => b[2] - a[2])[0]; return [p[0], POS[p[1]] || p[1], p[2], Math.min(95, sk(best[2])), best[0], best[1]].concat(p[4] ? [p[4]] : []); });
fs.writeFileSync('fm/legends.js', '/* 傳奇球星 card pool for career mode, built from index.html by tools/fm-legends.js — do not edit by hand.\n   [name, pos, nat, skill, best season, club, short?]; the index is the card id (L0, L1, …): only append. */\nFM.LEGENDS = [\n' +
  rows.map(r => '  ' + JSON.stringify(r) + ',').join('\n') + '\n];\nFM.LEGNAT = ' + JSON.stringify(ctx.NATN) + ';\n');
const g = s => s >= 90 ? 'UR' : s >= 85 ? 'SSR' : s >= 77 ? 'SR' : s >= 68 ? 'R' : 'C', cnt = {};
for (const r of rows) cnt[g(r[3])] = (cnt[g(r[3])] || 0) + 1;
console.log(rows.length, 'legends', JSON.stringify(cnt));
