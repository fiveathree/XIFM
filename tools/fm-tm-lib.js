// Shared Transfermarkt helpers for tools/fm-tm.js and tools/fm-tm-era.js: cached, rate-limited fetch and squad-page parsing.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const CACHE = path.join(__dirname, '.tm-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0, failed = 0, fetched = 0;
async function get(url) {
  const key = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.html');
  if (fs.existsSync(key)) return fs.readFileSync(key, 'utf8');
  for (let t = 0; t < 6; t++) {
    const wait = last + 2500 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
    try {
      const r = await fetch('https://www.transfermarkt.com' + url, { headers: UA }); const txt = await r.text();
      if (r.status === 429 || r.status === 403 || r.status >= 500) { process.stderr.write(`[${r.status}]`); await sleep(Math.min(120000, 10000 * 2 ** t)); continue; }
      if (r.status === 404) { fs.writeFileSync(key, ''); return ''; }
      fs.writeFileSync(key, txt); fetched++; process.stderr.write('.'); return txt;
    } catch (e) { await sleep(Math.min(60000, 5000 * 2 ** t)); }
  }
  failed++; return null;
}
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i')
  .toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const dec = s => s.replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();

const TMPOS = { 'Goalkeeper': 'GK', 'Centre-Back': 'CD', 'Left-Back': 'LB', 'Right-Back': 'RB', 'Defensive Midfield': 'DM', 'Central Midfield': 'CM', 'Right Midfield': 'RM', 'Left Midfield': 'LM',
  'Attacking Midfield': 'AM', 'Left Winger': 'LW', 'Right Winger': 'RW', 'Second Striker': 'CF', 'Centre-Forward': 'ST', 'Sweeper': 'CD', 'Defender': 'CD', 'Midfield': 'CM', 'Striker': 'ST', 'Attack': 'ST', 'mittelfeld': 'CM' };
const NAT = { England: 'ENG', Scotland: 'SCO', Wales: 'WAL', 'Northern Ireland': 'NIR', Ireland: 'IRL', France: 'FRA', Spain: 'ESP', Italy: 'ITA', Germany: 'GER', Netherlands: 'NED', Portugal: 'POR', Belgium: 'BEL',
  Turkey: 'TUR', 'Türkiye': 'TUR', Brazil: 'BRA', Argentina: 'ARG', Uruguay: 'URU', Colombia: 'COL', Chile: 'CHI', Paraguay: 'PAR', Peru: 'PER', Ecuador: 'ECU', Venezuela: 'VEN', Mexico: 'MEX', 'United States': 'USA',
  Canada: 'CAN', Jamaica: 'JAM', 'Trinidad and Tobago': 'TRI', Denmark: 'DEN', Sweden: 'SWE', Norway: 'NOR', Finland: 'FIN', Iceland: 'ISL', Switzerland: 'SUI', Austria: 'AUT', Poland: 'POL', 'Czech Republic': 'CZE', Czechia: 'CZE',
  Slovakia: 'SVK', Hungary: 'HUN', Romania: 'ROU', Bulgaria: 'BUL', Greece: 'GRE', Croatia: 'CRO', Serbia: 'SRB', Slovenia: 'SVN', 'Bosnia-Herzegovina': 'BIH', Montenegro: 'MNE', 'North Macedonia': 'MKD', Albania: 'ALB',
  Kosovo: 'KVX', Ukraine: 'UKR', Russia: 'RUS', Belarus: 'BLR', Georgia: 'GEO', Armenia: 'ARM', Israel: 'ISR', Cyprus: 'CYP', Morocco: 'MAR', Algeria: 'ALG', Tunisia: 'TUN', Egypt: 'EGY', Nigeria: 'NGA', Ghana: 'GHA',
  Senegal: 'SEN', "Cote d'Ivoire": 'CIV', 'Ivory Coast': 'CIV', Cameroon: 'CMR', Mali: 'MLI', 'Burkina Faso': 'BFA', Guinea: 'GUI', 'DR Congo': 'COD', Congo: 'CGO', Gabon: 'GAB', 'South Africa': 'RSA', Zambia: 'ZAM',
  Zimbabwe: 'ZIM', Angola: 'ANG', 'Cape Verde': 'CPV', 'Guinea-Bissau': 'GNB', Gambia: 'GAM', Togo: 'TOG', Benin: 'BEN', Kenya: 'KEN', Japan: 'JPN', 'Korea, South': 'KOR', 'South Korea': 'KOR', China: 'CHN', Iran: 'IRN',
  Australia: 'AUS', 'New Zealand': 'NZL', Lithuania: 'LTU', Latvia: 'LVA', Estonia: 'EST', Luxembourg: 'LUX', Moldova: 'MDA', Azerbaijan: 'AZE', Suriname: 'SUR', Curacao: 'CUW', Honduras: 'HON', 'Costa Rica': 'CRC',
  Panama: 'PAN', Bolivia: 'BOL', 'Faroe Islands': 'FRO', Malta: 'MLT', Liberia: 'LBR', 'Sierra Leone': 'SLE', 'Equatorial Guinea': 'EQG', Gibraltar: 'GIB', Mozambique: 'MOZ', Uzbekistan: 'UZB', 'Saudi Arabia': 'KSA', Iraq: 'IRQ' };

// one club's season squad rows
function parseSquad(h) {
  const out = [];
  for (const r of h.split(/<tr class="(?:odd|even)">/).slice(1)) {
    const link = r.match(/href="\/([^"\/]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]*)</); if (!link) continue;
    const no = (r.match(/class="rn_nummer">([^<]*)</) || [])[1];
    const cells = r.replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').split('|').map(s => dec(s)).filter(Boolean);
    const pos = cells.find(c => TMPOS[c]);
    const dates = cells.filter(c => /^\d\d\/\d\d\/\d{4}/.test(c)), dob = (dates[0] || '').match(/\d{4}/);
    const jn = (dates[1] || '').match(/^(\d\d)\/(\d\d)\/(\d{4})/), joined = jn ? jn[3] + '-' + jn[2] + '-' + jn[1] : null;   // date he joined the club
    const mv = (cells.slice().reverse().find(c => /^€[\d.,]+(m|k|bn)?$/i.test(c)) || '');
    const nat = (r.match(/title="([^"]+)"[^>]*class="flaggenrahmen/) || [])[1];   // first flag in the row = nationality
    let v = 0; const m = mv.match(/€([\d.,]+)(m|k|bn)?/i); if (m) v = parseFloat(m[1].replace(',', '.')) * ({ m: 1e6, k: 1e3, bn: 1e9 }[(m[2] || '').toLowerCase()] || 1);
    out.push({ id: link[2], slug: link[1], name: dec(link[3]), no: /^\d+$/.test((no || '').trim()) ? +no : 0, pos: pos ? TMPOS[pos] : null, by: dob ? +dob[0] : null, v, nat: nat ? dec(nat) : null, joined });
  }
  return out;
}
const stats = () => ({ failed, fetched });
module.exports = { get, norm, dec, TMPOS, NAT, parseSquad, stats, CACHE };
