// Fill in real squad numbers from each club's English Wikipedia season page.
// usage: node tools/fm-shirt-numbers.js <era> [league ...]     e.g.  node tools/fm-shirt-numbers.js 2010
//   era 2001 = fm/data/*.js, others = fm/data/<era>/*.js. Only the first field of a player row (the shirt number) changes,
//   so pids stay the same. Pages are cached in tools/.wiki-cache/ (not committed). A number already in the data is kept
//   unless Wikipedia gives one; numbers stay unique within a club. Prints a report of what was found per club.
const fs = require('fs'), path = require('path');
const [era, ...only] = process.argv.slice(2);
if (!era) { console.log('usage: node tools/fm-shirt-numbers.js <era> [league ...]'); process.exit(1); }
const dir = era === '2001' ? 'fm/data' : path.join('fm/data', era);
const y = +era, season = `${y}–${String((y + 1) % 100).padStart(2, '0')}`;
const CACHE = path.join(__dirname, '.wiki-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'XIFM-data-tool/1.0 (hobby football game; squad numbers)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let last = 0, failed = 0;
async function api(params) {
  const key = path.join(CACHE, require('crypto').createHash('sha1').update(JSON.stringify(params)).digest('hex') + '.json');
  const oldKey = path.join(CACHE, Buffer.from(JSON.stringify(params)).toString('base64url').slice(0, 180) + '.json');
  for (const k of [key, oldKey]) if (fs.existsSync(k)) return JSON.parse(fs.readFileSync(k, 'utf8'));
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  for (let t = 0; t < 8; t++) {
    const wait = last + 400 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();   // at most ~2.5 requests a second
    try {
      const r = await fetch(url, { headers: UA }), txt = await r.text();
      if (r.status === 429 || r.status >= 500 || /too many requests/i.test(txt.slice(0, 200))) { await sleep(Math.min(60000, 5000 * 2 ** t)); continue; }
      const j = JSON.parse(txt); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
      fs.writeFileSync(key, JSON.stringify(j)); return j;
    } catch (e) { await sleep(Math.min(60000, 3000 * 2 ** t)); }
  }
  failed++; return null;   // not cached: a later run tries again
}
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i')
  .toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
// club name → words used to recognise its season page
const STOP = new Set(['fc', 'f', 'c', 'afc', 'cf', 'ac', 'sc', 'the', 'de', 'club', 'football', 'and', 'hove', 'city', 'united', 'town', 'county', 'rovers', 'athletic', 'albion', 'wanderers', 'sporting', 'real', 'as', 'ss', 'us', 'vfl', 'vfb', 'sv', 'tsg', 'rc', 'ogc', 'kv', 'krc', 'rsc', 'sk', 'jk', 'bk', 'fk']);
const keyWords = name => norm(name).split(' ').filter(w => w.length > 1 && !STOP.has(w));

async function findPage(club) {
  const kw = keyWords(club.name); if (!kw.length) kw.push(norm(club.name).split(' ')[0]);
  for (const q of [`${season} ${club.name} season`, `${season} ${kw.join(' ')} season`]) {
    const j = await api({ action: 'query', list: 'search', srsearch: q, srlimit: '10', srnamespace: '0' });
    if (!j) return undefined;
    for (const h of j.query?.search || []) {
      const t = norm(h.title);
      if (!h.title.startsWith(season) || !/season$/.test(t)) continue;
      if (kw.every(w => t.includes(w))) return h.title;
    }
  }
  return null;
}
// the club's own article as it stood in mid-October of that season (its "Current squad" list), for clubs without a good season page
async function clubArticleRows(club) {
  const kw = keyWords(club.name); if (!kw.length) kw.push(norm(club.name).split(' ')[0]);
  const j = await api({ action: 'query', list: 'search', srsearch: club.name + ' football club', srlimit: '8', srnamespace: '0' });
  if (!j) return [];
  const h = (j.query?.search || []).find(h => !/season|list of|history of|women|reserves|academy|under-|\bII\b|\bB$/i.test(h.title) && kw.every(w => norm(h.title).includes(w)));
  if (!h) return [];
  const r = await api({ action: 'query', prop: 'revisions', titles: h.title, rvlimit: '1', rvdir: 'older', rvstart: y + '-10-15T00:00:00Z', rvprop: 'content', rvslots: 'main', redirects: '1' });
  const wt = r?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
  const sq = wt.search(/==\s*(first[- ]team |current )?squad/i);   // only the squad section, not loan / former player lists
  return sq < 0 ? [] : parse(wt.slice(sq, sq + 20000).split(/\n==\s*(?:out on loan|on loan|players out|reserves|youth|academy|former|retired|notable|management|club officials|staff)/i)[0]);
}

// rows of (number, linked player names) from season-page wikitext
function parse(wt) {
  const out = [];
  wt = wt.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '');
  // {{Fs player|no=5|...|name=[[Rio Ferdinand]]}} and similar templates
  // any "{{… player |no=5 |name=[[…]]}}" style template (Fs player, Efs player, Fb si player |n= |p=, …)
  const starts = [...wt.matchAll(/\{\{\s*[A-Za-z ]*player\d?\s*\|/gi)].map(m => m.index);
  starts.forEach((s, k) => {
    const body = wt.slice(s, Math.min(starts[k + 1] ?? wt.length, s + 2500));
    const no = body.match(/\|\s*(?:no|n|num|number)\s*=\s*(\d{1,2})\s*(?=[|}\n])/), nm = body.match(/\|\s*(?:name|p|player)\s*=\s*((?:\{\{[^{}]*\}\}|\[\[[^\]]*\]\]|[^|}\n])*)/);
    if (no && nm && +no[1] > 0) out.push([+no[1], names(nm[1])]);
  });
  // table rows: the first cell holding just a number 1–99, then the first player link in that row
  for (const row of wt.split(/\n\|-/)) {
    const cells = row.split(/\n\||\|\||\n!|!!/).map(c => c.replace(/^[^|\[{]*?\|(?!\|)(?=[^\]]*$)/, '').trim());
    let no = null;
    for (const c of cells) { const s = c.replace(/^.*\|/, '').replace(/'''/g, '').trim(); if (/^\d{1,2}$/.test(s) && +s > 0) { no = +s; break; } if (/\[\[|\{\{sortname/i.test(c)) break; }
    if (no == null) continue;
    const nm = names(row.replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, ''));
    if (nm.length) out.push([no, nm.slice(0, 2)]);
  }
  return out;
}
function names(s) {
  const r = [];
  for (const m of s.matchAll(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|([^|}]*))?/gi)) r.push(m[3] ? m[3] : m[1] + ' ' + m[2], m[1] + ' ' + m[2]);
  for (const m of s.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)) { if (/^(category|file|image|wp|template):/i.test(m[1])) continue; r.push(m[1]); if (m[2]) r.push(m[2]); }
  return r.map(norm).filter(Boolean);
}
// our player ↔ wiki name
function matchNo(p, rows) {
  const full = norm(p[1]), sn = p[6] ? norm(p[6]) : null, parts = full.split(' '), last = parts.slice(-1)[0], first = parts[0];
  const tests = [n => n === full, n => sn && n === sn, n => n.endsWith(' ' + last) && n[0] === first[0] && parts.length > 1, n => parts.length > 2 && n === first + ' ' + last,
    n => parts.length === 1 && (n === full || n.startsWith(full + ' ') || n.endsWith(' ' + full))];
  for (const t of tests) { const hit = rows.filter(([, ns]) => ns.some(t)); if (hit.length) return hit[0][0]; }
  return null;
}

(async () => {
  const files = fs.readdirSync(dir).filter(f => /^[a-z]+\d?\.js$/.test(f) && (!only.length || only.includes(f.replace('.js', ''))));
  let tot = 0, got = 0, pages = 0, clubsN = 0; const miss = [];
  for (const f of files) {
    const fp = path.join(dir, f); let src = fs.readFileSync(fp, 'utf8');
    const L = []; global.FM = { addLeague: x => L.push(x) }; eval(src); const lg = L[0];
    for (const club of lg.clubs) {
      if (club.ref) continue; clubsN++;
      const title = await findPage(club);
      let rows = [];
      if (title) { pages++; const j = await api({ action: 'parse', page: title, prop: 'wikitext', redirects: '1' }); rows = parse(j?.parse?.wikitext || ''); }
      else if (title === null) miss.push(lg.id + '.' + club.id);
      // fallback when the season page is missing or matched under 70% of our players
      let via = '';
      if (club.p.filter(p => matchNo(p, rows)).length < club.p.length * 0.7) { const extra = await clubArticleRows(club); if (extra.length) { rows = rows.concat(extra); via = ' + club article'; } }
      const used = new Set(), want = club.p.map(p => matchNo(p, rows));
      want.forEach((n, i) => { if (n && used.has(n)) want[i] = null; else if (n) used.add(n); });   // two of ours on one number (a mid-season swap): the first keeps it
      let found = 0;
      club.p.forEach((p, i) => {
        tot++;
        let n = want[i];
        if (n) { found++; got++; }
        else if (p[0] && !used.has(p[0])) n = p[0];   // keep a number we already had if nobody else took it
        else n = 0;
        if (n) used.add(n);
        if (n !== p[0]) {
          const esc = JSON.stringify(p[1]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          src = src.replace(new RegExp('\\[' + p[0] + ',' + esc + ','), '[' + n + ',' + JSON.stringify(p[1]) + ',');
          p[0] = n;
        }
      });
      console.log(`${lg.id}.${club.id.padEnd(5)} ${String(found).padStart(2)}/${club.p.length} ${title || (title === undefined ? '(request failed)' : '(no season page)')}${via}`);
    }
    fs.writeFileSync(fp, src);
  }
  console.log(`\nera ${era}: ${pages}/${clubsN} season pages, numbers for ${got}/${tot} players` + (failed ? ` (${failed} requests failed: run again)` : ''));
  if (miss.length) console.log('no page: ' + miss.join(' '));
})();
