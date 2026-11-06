/* =====================================================================
   XIFM 經理生涯 2001/02 — core
   static data index · state · calendar · competitions · economy · AI
   No DOM access in this file (so a whole season can be simulated in Node).
   ===================================================================== */
'use strict';

/* ---------- small helpers ---------- */
const R = Math.random;
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sum = a => a.reduce((t, x) => t + x, 0);
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hsh(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function wpick(items, w) { const t = sum(w); let r = R() * t; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }

/* ---------- dates (integer day numbers, UTC) ---------- */
const DAY = 864e5;
const dn = (y, m, d) => Date.UTC(y, m - 1, d) / DAY;
const dd = n => new Date(n * DAY);
const wday = n => dd(n).getUTCDay();
const WD = '日一二三四五六';
function fdate(n, mode) {
  const d = dd(n), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, x = d.getUTCDate();
  if (mode === 's') return `${x}/${m}`;
  if (mode === 'm') return `${m}月${x}日（${WD[d.getUTCDay()]}）`;
  return `${y}年${m}月${x}日（${WD[d.getUTCDay()]}）`;
}

/* ---------- static data index (from fm/data/*.js) ---------- */
const LG = {}, CL = {}, PS = {}, CLUBS = [];
// every league the code knows, in display order; the loaded era's data decides which exist (PLAY_LG).
// A saved game keeps its own list (G.plg); saves from before the extra leagues have none and use OLD_LG.
const ALL_LG = ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'ned1', 'por1', 'tur1', 'bel1'];
const OLD_LG = ALL_LG.slice(0, 9);
const PLAY_LG = [];
const PLG = () => (G && G.plg) || OLD_LG;
const GCL = () => Object.keys(G.clubs);
const ENG = ['eng1', 'eng2', 'eng3', 'eng4'];
let ERA = { y: 2001 };
function shortName(full) { const p = full.split(' '); return p.length < 2 ? full : p[0][0] + '. ' + p.slice(1).join(' '); }
/* Build the static index from the loaded era's data files (FM.leagues). A club entry {ref:'eur.aja'} moves an
   existing club (keeping its player ids) into that league instead of duplicating it. */
function indexEra(y) {
  ERA = Object.assign({ y }, (FM.ERAS || {})[y] || {});
  for (const o of [LG, CL, PS]) for (const k in o) delete o[k];
  CLUBS.length = 0; PLAY_LG.length = 0;
  for (const L of FM.leagues) {
    LG[L.id] = L;
    for (const c of L.clubs) {
      if (c.ref) continue;
      const cid = L.id + '.' + c.id;
      c.cid = cid; c.lg0 = L.id; CL[cid] = c; CLUBS.push(cid);
      c.p.forEach((r, i) => { PS[cid + '.' + i] = { no: r[0], name: r[1], pos: r[2], nat: r[3], by: r[4], sk: r[5], sn: r[6] || shortName(r[1]) }; });
    }
  }
  for (const L of FM.leagues) for (const c of L.clubs) if (c.ref && CL[c.ref]) CL[c.ref].lg0 = L.id;
  for (const L of FM.leagues) L.cids = L.clubs.map(c => c.ref || c.cid).filter(c => CL[c] && CL[c].lg0 === L.id);
  PLAY_LG.push(...ALL_LG.filter(l => LG[l]));
  // later-season patches register their players now; they join the game at that season's rollover
  for (const [yr, patch] of Object.entries(FM.seasons || {})) {
    if ((patch.era || 2001) !== y) continue;
    for (const [ck, rows] of Object.entries(patch.clubs || {})) rows.forEach((r, i) => { PS[`s${yr}.${ck}.${i}`] = { no: r[0], name: r[1], pos: r[2], nat: r[3], by: r[4], sk: r[5], sn: r[6] || shortName(r[1]) }; });
  }
}
const clubName = cid => cid === 'free' ? '自由球員' : CL[cid] ? CL[cid].name : cid;
const clubShort = cid => CL[cid] ? CL[cid].short : '—';
const clubCountry = cid => CL[cid].country || LG[CL[cid].lg0].country;

const NATZ = { ENG: '英格蘭', SCO: '蘇格蘭', WAL: '威爾斯', NIR: '北愛爾蘭', IRL: '愛爾蘭', FRA: '法國', GER: '德國', ESP: '西班牙', ITA: '意大利', NED: '荷蘭', BEL: '比利時', POR: '葡萄牙', BRA: '巴西', ARG: '阿根廷', URU: '烏拉圭', NOR: '挪威', SWE: '瑞典', DEN: '丹麥', FIN: '芬蘭', ISL: '冰島', SUI: '瑞士', AUT: '奧地利', CZE: '捷克', SVK: '斯洛伐克', POL: '波蘭', HUN: '匈牙利', ROU: '羅馬尼亞', BUL: '保加利亞', CRO: '克羅地亞', SRB: '塞爾維亞', YUG: '南斯拉夫', SVN: '斯洛文尼亞', BIH: '波黑', MKD: '北馬其頓', GRE: '希臘', TUR: '土耳其', RUS: '俄羅斯', UKR: '烏克蘭', GEO: '格魯吉亞', BLR: '白俄羅斯', LVA: '拉脫維亞', LTU: '立陶宛', EST: '愛沙尼亞', ISR: '以色列', CMR: '喀麥隆', NGA: '尼日利亞', GHA: '加納', CIV: '科特迪瓦', SEN: '塞內加爾', MAR: '摩洛哥', TUN: '突尼斯', ALG: '阿爾及利亞', EGY: '埃及', RSA: '南非', ZIM: '津巴布韋', ZAM: '贊比亞', MLI: '馬里', GUI: '幾內亞', COD: '剛果民主共和國', LBR: '利比里亞', USA: '美國', CAN: '加拿大', MEX: '墨西哥', CRC: '哥斯達黎加', JAM: '牙買加', TRI: '千里達', HON: '洪都拉斯', COL: '哥倫比亞', CHI: '智利', PAR: '巴拉圭', PER: '秘魯', ECU: '厄瓜多爾', VEN: '委內瑞拉', BOL: '玻利維亞', AUS: '澳洲', NZL: '新西蘭', JPN: '日本', KOR: '南韓', CHN: '中國', IRN: '伊朗', KSA: '沙特阿拉伯', BFA: '布基納法索', VIN: '聖文森', BER: '百慕達', BRB: '巴巴多斯', GIB: '直布羅陀', BEN: '貝寧', MSR: '蒙特塞拉特', ANG: '安哥拉', GRN: '格林納達', SKN: '聖基茨', PAN: '巴拿馬', TJK: '塔吉克', UZB: '烏茲別克', ARM: '亞美尼亞', ALB: '阿爾巴尼亞', CYP: '塞浦路斯', GAM: '岡比亞', TOG: '多哥', LUX: '盧森堡', SCG: '塞黑', NAM: '納米比亞', DOM: '多米尼加', SLE: '塞拉利昂', GAB: '加蓬', LIE: '列支敦士登', MNE: '黑山', KOS: '科索沃', CPV: '佛得角', CGO: '剛果', ZAM: '贊比亞', TCD: '乍得', OMA: '阿曼', KEN: '肯尼亞', BDI: '布隆迪', MKD: '北馬其頓', SRB: '塞爾維亞' };
const natName = c => NATZ[c] || c;
// EU / EEA nations in 2001 (others are shown as NON EU, like the original game)
const EU = new Set('AUT BEL DEN FIN FRA GER GRE IRL ITA LUX NED POR ESP SWE ENG SCO WAL NIR NOR ISL LIE'.split(' '));

/* ---------- positions ---------- */
const POSN = { GK: '門將', RB: '右閘', LB: '左閘', CD: '中堅', DM: '防守中場', CM: '中場', RM: '右中場', LM: '左中場', AM: '進攻中場', ST: '前鋒' };
const lineOf = p => p === 'GK' ? 'G' : (p === 'RB' || p === 'LB' || p === 'CD') ? 'D' : p === 'ST' ? 'A' : 'M';
const NEARP = { RB: { LB: .9, RM: .86, CD: .85 }, LB: { RB: .9, LM: .86, CD: .85 }, CD: { DM: .88, RB: .84, LB: .84 }, DM: { CM: .95, CD: .86 }, CM: { DM: .95, AM: .92, RM: .88, LM: .88 }, RM: { LM: .9, RB: .85, AM: .86, CM: .88 }, LM: { RM: .9, LB: .85, AM: .86, CM: .88 }, AM: { CM: .9, ST: .9, RM: .87, LM: .87 }, ST: { AM: .9 } };
function fitPos(nat, slot) {
  if (nat === slot) return 1;
  if (nat === 'GK' || slot === 'GK') return .3;
  const n = NEARP[nat]?.[slot]; if (n) return n;
  if (lineOf(nat) === lineOf(slot)) return .8;
  return .68;
}

/* ---------- formations (x: 0 left → 100 right, y: 0 = opponent goal → 100 = own goal) ---------- */
const GKS = ['GK', 50, 93], B4 = [['RB', 86, 72], ['CD', 62, 77], ['CD', 38, 77], ['LB', 14, 72]];
const FORMS = {
  '4-4-2': [GKS, ...B4, ['RM', 86, 46], ['CM', 62, 51], ['CM', 38, 51], ['LM', 14, 46], ['ST', 62, 20], ['ST', 38, 20]],
  '4-3-3': [GKS, ...B4, ['CM', 70, 50], ['DM', 50, 58], ['CM', 30, 50], ['ST', 82, 24], ['ST', 50, 17], ['ST', 18, 24]],
  '4-5-1': [GKS, ...B4, ['RM', 86, 44], ['CM', 66, 51], ['DM', 50, 58], ['CM', 34, 51], ['LM', 14, 44], ['ST', 50, 18]],
  '4-1-2-1-2': [GKS, ...B4, ['DM', 50, 60], ['CM', 72, 48], ['CM', 28, 48], ['AM', 50, 34], ['ST', 62, 17], ['ST', 38, 17]],
  '4-2-4': [GKS, ...B4, ['CM', 62, 54], ['CM', 38, 54], ['RM', 86, 26], ['ST', 62, 18], ['ST', 38, 18], ['LM', 14, 26]],
  '3-5-2': [GKS, ['CD', 72, 76], ['CD', 50, 79], ['CD', 28, 76], ['RM', 88, 47], ['CM', 66, 52], ['DM', 50, 60], ['CM', 34, 52], ['LM', 12, 47], ['ST', 62, 18], ['ST', 38, 18]],
  '3-4-3': [GKS, ['CD', 72, 76], ['CD', 50, 79], ['CD', 28, 76], ['RM', 86, 48], ['CM', 62, 53], ['CM', 38, 53], ['LM', 14, 48], ['ST', 80, 23], ['ST', 50, 16], ['ST', 20, 23]],
  '5-3-2': [GKS, ['RB', 88, 64], ['CD', 70, 77], ['CD', 50, 80], ['CD', 30, 77], ['LB', 12, 64], ['CM', 70, 49], ['CM', 50, 54], ['CM', 30, 49], ['ST', 62, 18], ['ST', 38, 18]],
  '5-4-1': [GKS, ['RB', 88, 64], ['CD', 70, 77], ['CD', 50, 80], ['CD', 30, 77], ['LB', 12, 64], ['RM', 84, 45], ['CM', 61, 50], ['CM', 39, 50], ['LM', 16, 45], ['ST', 50, 18]],
};
const STYLE = { ment: ['防守', '平衡', '進攻'], pass: ['短傳', '混合', '長傳'], tempo: ['慢', '正常', '快'], mark: ['區域防守', '人盯人'], trap: ['唔用', '用'] };
const ORDERS = { n: '普通', dr: '盤扭', cr: '傳中', ls: '遠射', fw: '前插', hd: '留守', mm: '盯人' };

/* ---------- attributes (derived; 8 per player like the original's profile page) ---------- */
const ATT_OUT = ['速度', '體力', '力量', '搶截', '傳球', '射門', '頭球', '控球'];
const ATT_GK = ['撲救', '反應', '手型', '出擊', '站位', '開球', '體力', '力量'];
const APROF = {
  GK: [2, 2, 0, -4, 0, -12, -6, -4], CD: [-10, -2, 5, 6, -10, -26, 6, -12], RB: [3, 3, -4, 2, -5, -20, -8, -6], LB: [3, 3, -4, 2, -5, -20, -8, -6],
  DM: [-8, 4, 2, 5, -2, -15, -4, -5], CM: [-4, 4, -2, -3, 5, -8, -8, 1], RM: [5, 2, -8, -12, 1, -8, -12, 2], LM: [5, 2, -8, -12, 1, -8, -12, 2],
  AM: [0, -4, -10, -20, 4, 2, -10, 6], ST: [2, -2, 2, -30, -8, 5, 2, 1],
};
function attrs(pid) {
  const p = ps(pid), sk = G.pl[pid].sk, pr = APROF[p.pos];
  return pr.map((o, k) => clamp(Math.round(sk + o + (hsh(p.name + '#' + k) % 11) - 5), 20, 99));
}
const attrNames = pid => ps(pid).pos === 'GK' ? ATT_GK : ATT_OUT;

/* ---------- state ---------- */
let G = null;
const ps = pid => PS[pid] || G.y[pid];
const pd = pid => G.pl[pid];
const ageOf = pid => G.season - ps(pid).by;
const isUser = cid => G && G.mgr.cid === cid;
const TIERF = { eng1: 1, eng2: .7, eng3: .55, eng4: .45, sco1: .6, esp1: 1, ita1: 1.05, ger1: .95, fra1: .8, ned1: .72, por1: .68, tur1: .66, bel1: .6, eur: .65 };
const DEFPRICE = { eng1: 25, eng2: 17, eng3: 14, eng4: 12, sco1: 18, esp1: 22, ita1: 24, ger1: 18, fra1: 18, ned1: 18, por1: 15, tur1: 15, bel1: 14, eur: 15 };
const TV = { eng1: 550e3, eng2: 70e3, eng3: 25e3, eng4: 15e3, sco1: 60e3, esp1: 350e3, ita1: 420e3, ger1: 300e3, fra1: 220e3, ned1: 120e3, por1: 100e3, tur1: 90e3, bel1: 70e3 };
// European places per league: [Champions League, UEFA Cup] (cup winners add more in England)
const QSPOTS = { eng1: [4, 2], esp1: [4, 3], ita1: [4, 3], ger1: [4, 3], fra1: [3, 3], sco1: [2, 2], ned1: [2, 2], por1: [2, 2], tur1: [2, 2], bel1: [1, 2] };
function wageFor(sk, lg) { return Math.max(150, Math.round(2500 * Math.exp(.11 * (sk - 60)) * (TIERF[lg] || .7) / 10) * 10); }
function roundMoney(v) { return v < 1e5 ? Math.round(v / 5e3) * 5e3 : v < 1e6 ? Math.round(v / 25e3) * 25e3 : Math.round(v / 5e4) * 5e4; }
function valueOf(pid) {
  const d = pd(pid), a = ageOf(pid);
  let v = 20000 * Math.exp((d.sk - 40) * .155);
  v *= a <= 19 ? 1.4 : a <= 22 ? 1.25 : a <= 27 ? 1 : a <= 29 ? .8 : a <= 31 ? .55 : a <= 33 ? .32 : .18;
  if (d.c !== 'free' && d.ct - G.season <= 1) v *= .75;
  return Math.max(5000, roundMoney(v));
}
function money(x) {
  if (x == null) return '—';
  const s = x < 0 ? '-' : '', a = Math.abs(x);
  return s + (a >= 1e6 ? '£' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'm' : a >= 1e3 ? '£' + Math.round(a / 1e3) + 'k' : '£' + Math.round(a));
}
const GRADE = sk => sk >= 90 ? 'UR' : sk >= 85 ? 'SSR' : sk >= 77 ? 'SR' : sk >= 68 ? 'R' : 'C';
function newStats() { return { ap: 0, gl: 0, as: 0, yc: 0, rc: 0, mom: 0, rt: 0 }; }
const form = pid => { const f = pd(pid).fm; return f.length ? sum(f) / f.length : 0; };

/* rosters: cid → array of pids (rebuilt from G.pl) */
let ROS = {};
function reindex() { ROS = {}; for (const pid in G.pl) { const c = G.pl[pid].c; (ROS[c] = ROS[c] || []).push(pid); } }
const roster = cid => ROS[cid] || [];
function movePlayer(pid, to) {
  const d = pd(pid), from = d.c;
  if (ROS[from]) ROS[from] = ROS[from].filter(x => x !== pid);
  d.c = to; (ROS[to] = ROS[to] || []).push(pid);
  for (const cid of [from]) { const c = G.clubs[cid]; if (c) { c.xi = c.xi.map(x => x === pid ? null : x); c.sb = c.sb.filter(x => x !== pid); delete c.ord[pid]; } }
  d.list = 0;
}
function squadNo(cid) { const used = new Set(roster(cid).map(p => pd(p).no)); for (let n = 1; n < 60; n++) if (!used.has(n)) return n; return 0; }

/* ---------- calendar (2001/02 base; every other season, earlier or later eras too, shifts by 364 days to keep weekdays) ---------- */
const S0 = 2001, off = s => (s - S0) * 364;
const CAL = {
  start: dn(2001, 7, 2), roll: dn(2002, 7, 1),
  lg: {
    eng1: [dn(2001, 8, 18), dn(2002, 5, 11), 6], eng2: [dn(2001, 8, 11), dn(2002, 4, 20), 6], eng3: [dn(2001, 8, 11), dn(2002, 4, 20), 6], eng4: [dn(2001, 8, 11), dn(2002, 4, 20), 6],
    sco1: [dn(2001, 7, 28), dn(2002, 5, 11), 6], esp1: [dn(2001, 8, 25), dn(2002, 5, 11), 6], ita1: [dn(2001, 8, 26), dn(2002, 5, 5), 0],
    ger1: [dn(2001, 7, 28), dn(2002, 5, 4), 6], fra1: [dn(2001, 7, 28), dn(2002, 5, 4), 6],
    ned1: [dn(2001, 8, 18), dn(2002, 5, 5), 0], por1: [dn(2001, 8, 18), dn(2002, 5, 12), 0], tur1: [dn(2001, 8, 11), dn(2002, 5, 19), 6], bel1: [dn(2001, 7, 28), dn(2002, 5, 12), 6],
  },
};
const FAC_D = [dn(2001, 11, 17), dn(2001, 12, 8), dn(2002, 1, 5), dn(2002, 1, 26), dn(2002, 2, 16), dn(2002, 3, 9), dn(2002, 4, 14), dn(2002, 5, 4)];
const DEADLINE = dn(2002, 3, 28);
const inWindow = d => { const o = off(G.season), x = d - o; return x < DEADLINE || x >= dn(2002, 7, 1); };

function datesFor(start, end, wd, need, excl) {
  const sat = [], mid = [];
  for (let d = start; d <= end; d++) {
    if (excl.has(d)) continue;
    if (wday(d) === wd) sat.push(d);
    else if (wday(d) === (wd + 3) % 7 && d > start + 6 && d < end - 3 && !excl.has(d - 3) && !excl.has(d + 4)) mid.push(d);
  }
  if (sat.length >= need) return Array.from({ length: need }, (_, k) => sat[Math.round(k * (sat.length - 1) / Math.max(1, need - 1))]);
  const m = need - sat.length, ch = Array.from({ length: m }, (_, k) => mid[Math.round((k + .5) * mid.length / m - .5)]);
  return [...sat, ...ch].sort((a, b) => a - b);
}
function roundRobin(n) {
  const t = [...Array(n).keys()]; if (n % 2) t.push(-1);
  const m = t.length, rs = [];
  for (let r = 0; r < m - 1; r++) { const rd = []; for (let i = 0; i < m / 2; i++) { const a = t[i], b = t[m - 1 - i]; if (a >= 0 && b >= 0) rd.push(r % 2 ? [b, a] : [a, b]); } rs.push(rd); t.splice(1, 0, t.pop()); }
  return rs;
}

/* ---------- fixtures ---------- */
let FXD = new Map(); // day → fixtures
function addFx(f) { f.i = G.nfx++; f.hg = f.ag = null; G.fx.push(f); (FXD.get(f.d) || FXD.set(f.d, []).get(f.d)).push(f); return f; }
function reindexFx() { FXD = new Map(); for (const f of G.fx) (FXD.get(f.d) || FXD.set(f.d, []).get(f.d)).push(f); }
const fxById = i => G.fx.find(f => f.i === i);
const clubFx = cid => G.fx.filter(f => f.h === cid || f.a === cid).sort((a, b) => a.d - b.d || a.i - b.i);
function moveFx(f, d) { const a = FXD.get(f.d); a.splice(a.indexOf(f), 1); f.d = d; (FXD.get(d) || FXD.set(d, []).get(d)).push(f); }
// a club can't play twice within two days: push the league game to the next free midweek
function resolveClashes() {
  const byClub = {};
  for (const f of G.fx) { if (f.hg != null) continue; for (const c of [f.h, f.a]) (byClub[c] = byClub[c] || []).push(f); }
  const busy = (c, d) => (byClub[c] || []).some(f => Math.abs(f.d - d) <= 1);
  for (const c in byClub) {
    const list = byClub[c].sort((a, b) => a.d - b.d);
    for (let i = 1; i < list.length; i++) {
      const p = list[i - 1], f = list[i];
      if (f.d - p.d > 1) continue;
      const mv = G.comp[f.c]?.t === 'L' ? f : G.comp[p.c]?.t === 'L' ? p : null;
      if (!mv) continue;
      const others = [mv.h, mv.a];
      for (let d = Math.max(f.d, p.d) + 2; d < Math.max(f.d, p.d) + 60; d++) {
        if ([2, 3].includes(wday(d)) && others.every(o => !busy(o, d))) { moveFx(mv, d); break; }
      }
      list.sort((a, b) => a.d - b.d); i = 0;
    }
  }
}

/* ---------- competitions ---------- */
const CUPNAME = { fac: '足總盃', lc: '聯賽盃', cl: '歐洲冠軍聯賽', uefa: '歐洲足協盃', sco_c: '蘇格蘭盃', esp_c: '西班牙國王盃', ita_c: '意大利盃', ger_c: '德國盃', fra_c: '法國盃', ned_c: '荷蘭盃', por_c: '葡萄牙盃', tur_c: '土耳其盃', bel_c: '比利時盃', po2: '英甲升級附加賽', po3: '英乙升級附加賽', po4: '英丙升級附加賽' };
const compName = id => G.comp[id]?.nm || CUPNAME[id] || LG[id]?.name || id;
function newTab(cl) { return Object.fromEntries(cl.map(c => [c, [0, 0, 0, 0, 0, 0]])); }
function standings(tab) {
  return Object.entries(tab).map(([c, t]) => ({ c, p: t[0], w: t[1], d: t[2], l: t[3], f: t[4], a: t[5], pts: t[1] * 3 + t[2] }))
    .sort((x, y) => y.pts - x.pts || (y.f - y.a) - (x.f - x.a) || y.f - x.f || clubName(x.c).localeCompare(clubName(y.c)));
}
function createLeague(lid, o) {
  const cl = shuffle([...G.lgm[lid]]), n = cl.length;
  let rr = roundRobin(n); rr = rr.concat(rr.map(rd => rd.map(([a, b]) => [b, a])));
  if (lid === 'sco1') rr = n <= 10 ? rr.concat(rr) : rr.concat(roundRobin(n).slice(0, n - 1)); // 10 clubs: 36 rounds (1990s); 12: 33 like the SPL
  const [st, en, wd] = CAL.lg[lid];
  const excl = new Set(ENG.includes(lid) ? FAC_D.map(d => d + o) : []);
  const dates = datesFor(st + o, en + o, wd, rr.length, excl);
  G.comp[lid] = { id: lid, t: 'L', nm: LG[lid].name, cl: [...cl], tab: newTab(cl), n: sum(rr.map(r => r.length)), pl: 0, done: false };
  rr.forEach((rd, r) => rd.forEach(([i, j]) => addFx({ d: dates[r], c: lid, r, h: cl[i], a: cl[j] })));
}
/* knockout: rd = [{n, d:[dates], legs, ent:[cids], neu, fin, ven}] */
function createKO(id, rd, extra) { G.comp[id] = Object.assign({ id, t: 'K', nm: CUPNAME[id], rd, cur: -1, alive: [], ties: [], done: false, win: null }, extra || {}); }
const D = (y, m, d, o) => dn(y, m, d) + o;
function createCups(s, o) {
  const inEurope = new Set([...(G.comp.cl?.grp || []).flat(), ...(G.comp.uefa?.rd[0].ent || [])]);
  const e1 = G.lgm.eng1;
  createKO('fac', [
    { n: '第一圈', d: [FAC_D[0] + o], ent: [...G.lgm.eng3, ...G.lgm.eng4] }, { n: '第二圈', d: [FAC_D[1] + o] },
    { n: '第三圈', d: [FAC_D[2] + o], ent: [...e1, ...G.lgm.eng2] }, { n: '第四圈', d: [FAC_D[3] + o] }, { n: '第五圈', d: [FAC_D[4] + o] },
    { n: '八強', d: [FAC_D[5] + o] }, { n: '四強', d: [FAC_D[6] + o], neu: 1, ven: '維拉公園' }, { n: '決賽', d: [FAC_D[7] + o], neu: 1, fin: 1, ven: '千禧球場' }]);
  createKO('lc', [
    { n: '第一圈', d: [D(2001, 8, 22, o)], ent: [...G.lgm.eng2, ...G.lgm.eng3, ...G.lgm.eng4] }, { n: '第二圈', d: [D(2001, 9, 12, o)], ent: e1.filter(c => !inEurope.has(c)) },
    { n: '第三圈', d: [D(2001, 10, 10, o)], ent: e1.filter(c => inEurope.has(c)) }, { n: '第四圈', d: [D(2001, 11, 28, o)] }, { n: '八強', d: [D(2001, 12, 12, o)] },
    { n: '四強', d: [D(2002, 1, 9, o), D(2002, 1, 23, o)], legs: 2 }, { n: '決賽', d: [D(2002, 2, 24, o)], neu: 1, fin: 1, ven: '千禧球場' }]);
  const dom = (id, lid, dates, fin, ven) => PLG().includes(lid) && createKO(id, [{ n: '第一圈', d: [dates[0]], ent: [...G.lgm[lid]] }, ...dates.slice(1).map((d, k) => ({ n: ['第二圈', '第三圈', '八強', '四強'][k] || '第' + (k + 2) + '圈', d: [d] })), { n: '決賽', d: [fin], neu: 1, fin: 1, ven }]);
  const W = [D(2001, 10, 3, o), D(2001, 11, 7, o), D(2001, 12, 12, o), D(2002, 1, 16, o), D(2002, 2, 6, o), D(2002, 3, 20, o)];
  dom('sco_c', 'sco1', [D(2002, 1, 26, o), D(2002, 2, 23, o), D(2002, 3, 23, o)], D(2002, 5, 4, o), '漢普頓公園');
  dom('esp_c', 'esp1', [D(2001, 10, 3, o), D(2001, 11, 7, o), D(2001, 12, 5, o), D(2002, 1, 9, o), D(2002, 1, 30, o)], D(2002, 3, 6, o), '伯納烏球場');
  dom('ita_c', 'ita1', W, D(2002, 5, 9, o), '奧林匹克球場（羅馬）');
  dom('ger_c', 'ger1', W, D(2002, 5, 11, o), '柏林奧林匹克球場');
  dom('fra_c', 'fra1', W, D(2002, 5, 11, o), '法蘭西球場');
  dom('ned_c', 'ned1', W, D(2002, 5, 12, o), '飛燕諾球場');
  dom('por_c', 'por1', W, D(2002, 5, 12, o), '國家球場（里斯本）');
  dom('tur_c', 'tur1', W, D(2002, 5, 15, o), '阿塔圖爾克奧林匹克球場');
  dom('bel_c', 'bel1', W, D(2002, 5, 12, o), '博杜安國王球場');
}
// the real 2001/02 Champions League groups (first group stage); other eras may give ERA.cl / ERA.ueEng in fm/eras.js
const CL01 = [['Roma', 'Real Madrid', 'Lokomotiv', 'Anderlecht'], ['Liverpool', 'Boavista', 'Dynamo Kyiv', 'Dortmund'], ['Panathinaikos', 'Arsenal', 'Mallorca', 'Schalke'], ['Nantes', 'Galatasaray', 'PSV', 'Lazio'], ['Celtic', 'Juventus', 'Porto', 'Rosenborg'], ['Barcelona', 'Leverkusen', 'Lyon', 'Fenerbah'], ['Deportivo', 'Manchester United', 'Lille', 'Olympiacos'], ['Bayern', 'Sparta', 'Feyenoord', 'Spartak']];
const UEFA_ENG01 = ['Chelsea', 'Ipswich', 'Leeds', 'Aston Villa'];
function findClub(q, pool) { pool = pool || CLUBS; const ql = q.toLowerCase(); return pool.find(c => CL[c].name.toLowerCase() === ql) || pool.find(c => CL[c].name.toLowerCase().includes(ql)); }
const byRep = a => [...a].sort((x, y) => G.clubs[y].rep - G.clubs[x].rep);
function createEurope(s, o) {
  let clT, ueT;
  const eur = byRep(G.lgm.eur || []);
  const realCL = !G.qual && (ERA.cl || (ERA.y === 2001 ? CL01 : null));
  if (realCL) {
    const grp = realCL.map(g => g.map(n => findClub(n, GCL())).filter(Boolean));
    const used = new Set(grp.flat());
    // fill gaps if any club is missing from the data
    const fill = byRep(GCL().filter(c => !used.has(c)));
    grp.forEach(g => { while (g.length < 4) { const c = fill.shift(); g.push(c); used.add(c); } });
    clT = grp;
    const eng = (ERA.ueEng || (ERA.y === 2001 ? UEFA_ENG01 : [])).map(n => findClub(n, G.lgm.eng1)).filter(c => c && !used.has(c));
    const per = l => G.lgm[l] ? byRep(G.lgm[l]).filter(c => !used.has(c)) : [];
    ueT = [...(eng.length ? eng : per('eng1').slice(0, 4)), ...per('esp1').slice(0, 4), ...per('ita1').slice(0, 4), ...per('ger1').slice(0, 4), ...per('fra1').slice(0, 3), ...per('sco1').slice(0, 2), ...['ned1', 'por1', 'tur1', 'bel1'].flatMap(l => per(l).slice(0, 2)), ...eur.filter(c => !used.has(c))];
  } else {
    // later seasons: last season's qualifiers; an era's first season without real groups: by reputation
    const q = G.qual || { cl: PLG().flatMap(l => QSPOTS[l] ? byRep(G.lgm[l]).slice(0, QSPOTS[l][0]) : []), uefa: PLG().flatMap(l => QSPOTS[l] ? byRep(G.lgm[l]).slice(QSPOTS[l][0], QSPOTS[l][0] + QSPOTS[l][1] + 1) : []) };
    const cl = [...q.cl], used = new Set(cl);
    for (const c of eur) if (cl.length < 32 && !used.has(c)) { cl.push(c); used.add(c); }
    for (const c of byRep(GCL())) if (cl.length < 32 && !used.has(c)) { cl.push(c); used.add(c); }
    clT = drawGroups(cl.slice(0, 32));
    ueT = q.uefa.filter(c => !used.has(c)); ueT.forEach(c => used.add(c));
    for (const c of eur) if (!used.has(c)) { ueT.push(c); used.add(c); }
  }
  const usedAll = new Set([...clT.flat(), ...ueT]);
  for (const c of byRep(GCL())) { if (ueT.length >= 32) break; if (!usedAll.has(c)) { ueT.push(c); usedAll.add(c); } }
  ueT = ueT.slice(0, 32);
  // Champions League: 8 groups of 4, then two-legged knockout
  const gd = [D(2001, 9, 12, o), D(2001, 9, 19, o), D(2001, 9, 26, o), D(2001, 10, 17, o), D(2001, 10, 24, o), D(2001, 10, 31, o)];
  createKO('cl', [{ n: '十六強', d: [D(2002, 2, 20, o), D(2002, 3, 13, o)], legs: 2, seed: 'grp' }, { n: '八強', d: [D(2002, 4, 2, o), D(2002, 4, 9, o)], legs: 2 }, { n: '四強', d: [D(2002, 4, 23, o), D(2002, 4, 30, o)], legs: 2 }, { n: '決賽', d: [D(2002, 5, 15, o)], neu: 1, fin: 1, ven: '漢普頓公園' }],
    { t: 'G', grp: clT, gtab: newTab(clT.flat()), gdone: false, gn: 96, gpl: 0 });
  const RR4 = [[[0, 1], [2, 3]], [[3, 0], [1, 2]], [[0, 2], [3, 1]]];
  const sched = [...RR4, ...RR4.map(r => r.map(([a, b]) => [b, a]))];
  clT.forEach((g, gi) => sched.forEach((rd, k) => rd.forEach(([a, b]) => addFx({ d: gd[k], c: 'cl', g: gi, r: k, h: g[a], a: g[b] }))));
  createKO('uefa', [{ n: '第一圈', d: [D(2001, 9, 20, o), D(2001, 9, 27, o)], legs: 2, ent: ueT }, { n: '第二圈', d: [D(2001, 10, 18, o), D(2001, 11, 1, o)], legs: 2 }, { n: '第三圈', d: [D(2001, 11, 22, o), D(2001, 12, 6, o)], legs: 2, ent: [] }, { n: '八強', d: [D(2002, 2, 21, o), D(2002, 2, 28, o)], legs: 2 }, { n: '四強', d: [D(2002, 4, 4, o), D(2002, 4, 11, o)], legs: 2 }, { n: '決賽', d: [D(2002, 5, 8, o)], neu: 1, fin: 1, ven: '飛燕諾球場' }]);
}
function drawGroups(cl) {
  const pots = [0, 1, 2, 3].map(k => byRep(cl).slice(k * 8, k * 8 + 8));
  for (let tries = 0; tries < 200; tries++) {
    const g = Array.from({ length: 8 }, () => []);
    pots.forEach(p => shuffle([...p]).forEach((c, i) => g[i].push(c)));
    if (g.every(x => new Set(x.map(clubCountry)).size === x.length) || tries === 199) return g;
  }
}
function drawRound(comp) {
  const r = comp.cur + 1, rd = comp.rd[r];
  let pool = [...comp.alive, ...(rd.ent || [])];
  if (comp.t === 'G' && r === 0) { // CL last 16: group winners v runners-up, not from the same group
    const w = [], ru = [];
    comp.grp.forEach(g => { const st = standings(Object.fromEntries(g.map(c => [c, comp.gtab[c]]))); w.push(st[0].c); ru.push(st[1].c); });
    let pairs;
    for (let t = 0; t < 100; t++) { const r2 = shuffle([...ru]); if (r2.every((c, i) => comp.grp.findIndex(g => g.includes(c)) !== comp.grp.findIndex(g => g.includes(w[i]))) || t === 99) { pairs = w.map((c, i) => [r2[i], c]); break; } }
    pairs.forEach(([a, b]) => makeTie(comp, r, a, b));
  } else if (rd.seeded) { rd.seeded.forEach(([a, b]) => makeTie(comp, r, a, b)); }
  else {
    pool = shuffle(pool);
    if (pool.length % 2) { const b = byRep(pool)[0]; pool.splice(pool.indexOf(b), 1); comp.ties.push({ r, a: b, b: null, w: b, fx: [] }); }
    for (let i = 0; i < pool.length; i += 2) makeTie(comp, r, pool[i], pool[i + 1]);
  }
  comp.cur = r;
  const mine = comp.ties.find(t => t.r === r && (isUser(t.a) || isUser(t.b)));
  if (mine) {
    const opp = isUser(mine.a) ? mine.b : mine.a;
    mail(`${comp.nm}${rd.n}抽籤`, opp ? `你嘅對手係 <b>${esc(clubName(opp))}</b>（${esc(LG[G.clubs[opp].lg].name)}）。比賽日期：${rd.d.map(x => fdate(x, 'm')).join('、')}${rd.neu ? '，' + (rd.ven || '中立場') : ''}。` : '你今圈輪空，直接晉級。');
  }
}
function makeTie(comp, r, a, b) {
  const rd = comp.rd[r], t = { r, a, b, w: null, fx: [] };
  comp.ties.push(t);
  const legs = rd.legs || 1;
  if (legs === 1) t.fx.push(addFx({ d: rd.d[0], c: comp.id, r, h: a, a: b, ko: 1, n: rd.neu ? 1 : 0 }).i);
  else { t.fx.push(addFx({ d: rd.d[0], c: comp.id, r, h: a, a: b }).i); t.fx.push(addFx({ d: rd.d[1], c: comp.id, r, h: b, a: a, ko: 2 }).i); }
}
function nextRoundIdx(comp) { const r = comp.cur + 1; return comp.alive.length === 2 && comp.cur >= 0 ? comp.rd.length - 1 : r; }
function roundDone(comp, r) { return comp.ties.filter(t => t.r === r).every(t => t.w); }
function maybeDraw(comp, day) {
  if (comp.done) return;
  if (comp.t === 'G' && !comp.gdone) return;
  if (comp.cur >= 0 && !roundDone(comp, comp.cur)) return;
  if (comp.cur >= 0) comp.alive = comp.ties.filter(t => t.r === comp.cur).map(t => t.w);
  if (comp.cur >= 0 && comp.alive.length === 1) { comp.done = true; comp.win = comp.alive[0]; cupWon(comp); return; }
  let r = nextRoundIdx(comp);
  if (r >= comp.rd.length) r = comp.rd.length - 1;
  if (r <= comp.cur) { comp.done = true; return; }
  const rd = comp.rd[r];
  const pool = comp.alive.length + (rd.ent ? rd.ent.length : 0) + (rd.seeded ? rd.seeded.length * 2 : 0) + (comp.cur < 0 && comp.t === 'G' ? 16 : 0);
  if (pool < 2) { comp.done = true; comp.win = comp.alive[0] || null; if (comp.win) cupWon(comp); return; }
  if (rd.fin && pool > 2) { // too many teams left for the final: add a round before it
    const prev = comp.rd[r - 1]?.d.slice(-1)[0] ?? rd.d[0] - 28;
    comp.rd.splice(r, 0, { n: pool <= 4 ? '四強' : pool <= 8 ? '八強' : '附加圈', d: [Math.round((prev + rd.d[0]) / 2)] });
    return maybeDraw(comp, day);
  }
  if (day < rd.d[0] - 14) return;
  comp.cur = r - 1;
  drawRound(comp);
  resolveClashes();
}
function cupWon(comp) {
  const w = comp.win;
  news(`🏆 ${clubName(w)} 贏得${comp.nm}`);
  if (isUser(w)) { mail(`恭喜！贏得${comp.nm}`, `你帶領 ${esc(clubName(w))} 捧走${comp.nm}！董事局非常滿意。`); G.clubs[w].conf = clamp(G.clubs[w].conf + 15, 0, 100); G.mgr.rep = clamp(G.mgr.rep + 6, 0, 100); }
  G.trophies.push({ s: G.season, c: comp.id, nm: comp.nm, w });
}

/* ---------- squads, youth ---------- */
const NEED = { G: 2, D: 6, M: 6, A: 3 };
function mkYouth(cid, pos, sk) {
  const n = G.nid++, pid = 'y' + n, c = CL[cid];
  const k = roster(cid).filter(p => p[0] === 'y').length + 1;
  G.y[pid] = { no: 0, name: `${c.short} 青年軍 ${k}`, pos, nat: clubCountry(cid), by: G.season - ri(17, 19), sk, sn: `${c.short} 青年軍 ${k}`, yth: 1 };
  G.pl[pid] = newPl(cid, sk, G.season + ri(1, 3), 0);
  G.pl[pid].no = squadNo(cid) || 0;
  (ROS[cid] = ROS[cid] || []).push(pid);
  return pid;
}
function newPl(cid, sk, ct, no) { return { c: cid, no, sk, cond: 100, fm: [], inj: 0, injn: '', sus: 0, w: wageFor(sk, CL[cid] ? G.clubs[cid]?.lg || CL[cid].lg0 : 'eng3'), ct, list: 0, s: newStats() }; }
function fillYouth(cid, min, gap = 4) {
  // thinly documented clubs (fewer than 8 known players): base the level on club reputation, not on the few names we have
  const ros = roster(cid), rs = clamp(Math.round(28 + (G.clubs[cid]?.rep ?? CL[cid].rep) * .6), 40, 76);
  const avg = ros.length >= 8 ? sum(ros.map(p => pd(p).sk)) / ros.length : (sum(ros.map(p => pd(p).sk)) + (8 - ros.length) * rs) / 8;
  const cnt = { G: 0, D: 0, M: 0, A: 0 }; ros.forEach(p => cnt[lineOf(ps(p).pos)]++);
  const POSBY = { G: ['GK'], D: ['CD', 'CD', 'RB', 'LB'], M: ['CM', 'RM', 'LM', 'CM', 'DM'], A: ['ST'] };
  let guard = 0;
  while ((roster(cid).length < min || Object.keys(NEED).some(l => cnt[l] < NEED[l])) && guard++ < 40) {
    const l = Object.keys(NEED).sort((a, b) => (cnt[a] - NEED[a]) - (cnt[b] - NEED[b]))[0];
    mkYouth(cid, pick(POSBY[l]), clamp(Math.round(avg - gap + ri(-3, 3)), 35, 80)); cnt[l]++;
  }
}

/* ---------- lineup selection (AI and the user's 自動排陣) ---------- */
function avail(pid) { const d = pd(pid); return !d.inj && !d.sus; }
function effOf(pid, slot, cond) {
  const d = pd(pid), c = cond ?? d.cond;
  const cf = c >= 92 ? 1 : clamp(.78 + .22 * (c - 40) / 52, .7, 1);
  const f = form(pid), ff = f ? clamp(1 + (f - 6.6) * .02, .96, 1.04) : 1;
  return d.sk * fitPos(ps(pid).pos, slot) * cf * ff;
}
function autoPick(cid) {
  const c = G.clubs[cid], slots = FORMS[c.form];
  const pool = roster(cid).filter(avail);
  const used = new Set(), xi = Array(11).fill(null);
  const order = slots.map((s, i) => i).sort((a, b) => 'GCSDRLMA'.indexOf(slots[a][0][0]) - 'GCSDRLMA'.indexOf(slots[b][0][0]));
  for (const i of order) {
    let best = null, bv = -1;
    for (const p of pool) { if (used.has(p)) continue; const v = effOf(p, slots[i][0]) * (pd(p).cond < 70 ? .9 : 1); if (v > bv) { bv = v; best = p; } }
    if (best) { xi[i] = best; used.add(best); }
  }
  const rest = pool.filter(p => !used.has(p)).sort((a, b) => pd(b).sk - pd(a).sk);
  const sb = [];
  const gk = rest.find(p => ps(p).pos === 'GK'); if (gk) sb.push(gk);
  for (const l of ['D', 'M', 'A']) { const p = rest.find(x => !sb.includes(x) && lineOf(ps(x).pos) === l); if (p) sb.push(p); }
  for (const p of rest) { if (sb.length >= 5) break; if (!sb.includes(p)) sb.push(p); }
  c.xi = xi; c.sb = sb.slice(0, 5);
}
function lineupProblems(cid) {
  const c = G.clubs[cid], out = [];
  c.xi.forEach((p, i) => { if (!p) out.push(`第 ${i + 1} 位（${FORMS[c.form][i][0]}）冇人`); else if (!avail(p)) out.push(`${ps(p).sn} ${pd(p).inj ? '受傷' : '停賽'}`); });
  return out;
}
const AIFORM = ['4-4-2', '4-4-2', '4-4-2', '4-3-3', '3-5-2', '4-5-1', '4-1-2-1-2'];
function aiForm(cid) { const L = CL[cid].lg0; if (ENG.includes(L) || L === 'sco1') return hsh(cid) % 4 ? '4-4-2' : pick(AIFORM); return AIFORM[hsh(cid) % AIFORM.length]; }

/* ---------- mail & news ---------- */
function mail(t, b, act) { G.mail.unshift({ id: G.nid++, d: G.day, t, b, act: act || null, rd: 0 }); if (G.mail.length > 80) G.mail.length = 80; }
function news(t) { G.news.unshift(t); if (G.news.length > 40) G.news.length = 40; }

/* ---------- finances ---------- */
function fin(cid, k, v) { const c = G.clubs[cid]; if (!c) return; if (isUser(cid) && G.inf && v < 0) return; c.cash += v; const s = c.fin.s; s[k] = (s[k] || 0) + v; const w = c.fin.w; w[k] = (w[k] || 0) + v; }
function attendance(cid, oppCid, comp) {
  const c = G.clubs[cid], base = DEFPRICE[c.lg] || 18;
  const pos = G.comp[c.lg]?.t === 'L' ? standings(G.comp[c.lg].tab).findIndex(x => x.c === cid) / Math.max(1, G.comp[c.lg].cl.length) : .5;
  let fill = .32 + c.rep / 150 + (.5 - pos) * .2 + (oppCid ? G.clubs[oppCid].rep / 900 : 0) + (comp && comp !== c.lg ? .08 : 0);
  fill *= Math.pow(base / Math.max(1, c.price), .6);
  return Math.round(c.cap * clamp(fill, .12, 1));
}
function weekly() {
  const wage = {};
  for (const pid in G.pl) { const d = G.pl[pid]; if (G.clubs[d.c]) wage[d.c] = (wage[d.c] || 0) + d.w; }
  for (const cid of GCL()) {
    const c = G.clubs[cid]; c.fin.w = {};
    fin(cid, 'wage', -(wage[cid] || 0));
    fin(cid, 'staff', -Math.round(sum(Object.values(c.st).map(l => l * l)) * 350 * (TIERF[c.lg] || .7)));
    fin(cid, 'merch', Math.round(.0034 * c.rep ** 4));
    fin(cid, 'spon', Math.round(.002 * c.rep ** 4));
    if (c.build && G.day >= c.build.done) { c.cap += c.build.seats; if (isUser(cid)) mail('球場擴建完成', `新看台已經落成，球場容量增加 ${c.build.seats.toLocaleString()} 個座位，而家係 ${c.cap.toLocaleString()}。`); c.build = null; }
  }
}

/* ---------- transfers ---------- */
function transfer(pid, to, fee, wage, years) {
  const d = pd(pid), from = d.c;
  if (G.clubs[from]) fin(from, 'tin', fee);
  if (G.clubs[to]) fin(to, 'tout', -fee);
  movePlayer(pid, to);
  d.w = wage || wageFor(d.sk, G.clubs[to]?.lg || 'eng3');
  d.ct = G.season + (years || ri(2, 4));
  d.no = squadNo(to);
  G.tlog.unshift({ d: G.day, pid, from, to, fee }); if (G.tlog.length > 120) G.tlog.length = 120;
  const big = fee >= 3e6 || isUser(to) || isUser(from);
  if (big) news(`${ps(pid).sn} 由 ${clubName(from)} 轉投 ${clubName(to)}（${fee ? money(fee) : '自由轉會'}）`);
  if (G.clubs[from] && !isUser(from)) autoPick(from);
  if (G.clubs[to] && !isUser(to)) autoPick(to);
}
// what the selling club wants
function askingPrice(pid) {
  const d = pd(pid), cid = d.c; if (cid === 'free') return 0;
  const ros = roster(cid).map(p => pd(p).sk).sort((a, b) => b - a);
  const key = d.sk >= (ros[10] ?? 0);
  return roundMoney(valueOf(pid) * (key ? 1.35 : 1) * (d.list ? .85 : 1) * (ageOf(pid) > 31 ? .9 : 1));
}
function wageDemand(pid, buyer) {
  const d = pd(pid), from = d.c;
  const base = wageFor(d.sk, G.clubs[buyer].lg);
  const repGap = from !== 'free' ? (G.clubs[from].rep - G.clubs[buyer].rep) / 100 : 0;
  return Math.max(d.c === buyer ? d.w : 0, roundMoney(base * clamp(1.12 + repGap, .9, 1.7) / 10) * 10 || base);
}
function refusesMove(pid, buyer) {
  const d = pd(pid); if (d.c === 'free') return false;
  const tierOf = cid => ({ eng1: 1, eng2: 2, eng3: 3, eng4: 4, sco1: 2, esp1: 1, ita1: 1, ger1: 1, fra1: 1, ned1: 2, por1: 2, tur1: 2, bel1: 2, eur: 2 }[G.clubs[cid].lg] || 2);
  return d.sk >= 76 && tierOf(buyer) - tierOf(d.c) >= 2;
}
// AI market
let ALLP = null;
function aiMarket() {
  ALLP = ALLP || Object.keys(G.pl);
  const strong = (() => { const x = G.day - off(G.season); return x < dn(2001, 9, 1) || (x >= dn(2002, 1, 1) && x < dn(2002, 2, 1)); })();
  if (R() < (strong ? .55 : .12)) aiBuy();
  if (strong && R() < .4) aiFree();
  if (R() < .1) aiTrim();
}
function lineAvg(cid) {
  const by = { G: [], D: [], M: [], A: [] };
  roster(cid).forEach(p => by[lineOf(ps(p).pos)].push(pd(p).sk));
  const top = (a, k) => { a.sort((x, y) => y - x); return a.length ? sum(a.slice(0, k)) / Math.min(k, a.length) : 30; };
  return { G: top(by.G, 1), D: top(by.D, 4), M: top(by.M, 4), A: top(by.A, 2) };
}
function aiBuy() {
  const buyers = GCL().filter(c => !isUser(c) && G.clubs[c].lg !== 'eur' && G.clubs[c].cash > 4e5);
  if (!buyers.length) return;
  const buyer = wpick(buyers, buyers.map(c => Math.sqrt(G.clubs[c].cash)));
  const b = G.clubs[buyer], la = lineAvg(buyer), ovr = (la.G + la.D * 4 + la.M * 4 + la.A * 2) / 11;
  const line = Object.keys(la).sort((x, y) => (la[x] - ovr) - (la[y] - ovr))[0];
  let best = null, bs = 0;
  for (let k = 0; k < 350; k++) {
    const pid = ALLP[Math.floor(R() * ALLP.length)], d = G.pl[pid];
    if (!d || d.c === buyer || isUser(d.c) || d.c === 'ret' || lineOf(ps(pid).pos) !== line) continue;
    if (d.sk < la[line] + 1 || d.sk > la[line] + 9 || ageOf(pid) > 31) continue;
    const fee = d.c === 'free' ? 0 : askingPrice(pid);
    if (fee > b.cash * .5) continue;
    if (d.c !== 'free' && G.clubs[d.c].rep > b.rep + 6 && !d.list) continue;
    if (d.sk > bs) { bs = d.sk; best = [pid, fee]; }
  }
  if (best) transfer(best[0], buyer, best[1]);
}
function aiFree() {
  const fa = roster('free'); if (!fa.length) return;
  const short = GCL().filter(c => !isUser(c) && G.clubs[c].lg !== 'eur' && roster(c).length < 21);
  if (!short.length) return;
  const cid = pick(short), la = lineAvg(cid), ovr = (la.D + la.M + la.A) / 3;
  const cand = fa.filter(p => pd(p).sk <= ovr + 4 && pd(p).sk >= ovr - 10).sort((a, b) => pd(b).sk - pd(a).sk)[0];
  if (cand) transfer(cand, cid, 0);
}
function aiTrim() {
  const fat = GCL().filter(c => !isUser(c) && roster(c).length > 32);
  if (!fat.length) return;
  const cid = pick(fat), worst = [...roster(cid)].sort((a, b) => pd(a).sk - pd(b).sk)[0];
  movePlayer(worst, 'free');
}
// offers for the user's players
function aiOffers() {
  const me = G.mgr.cid; if (!me) return;
  const ros = roster(me), top = [...ros].sort((a, b) => pd(b).sk - pd(a).sk).slice(0, 3);
  for (const pid of ros) {
    const d = pd(pid);
    const p = d.list ? .12 : top.includes(pid) ? .006 : .0015;
    if (R() > p || G.off.some(o => o.pid === pid)) continue;
    const fee0 = valueOf(pid);
    const buyers = GCL().filter(c => c !== me && G.clubs[c].lg !== 'eur' && G.clubs[c].cash > fee0 * .8 && Math.abs(G.clubs[c].rep - G.clubs[me].rep) < 30 && lineAvg(c)[lineOf(ps(pid).pos)] < d.sk + 3);
    if (!buyers.length) continue;
    const from = pick(buyers), fee = roundMoney(fee0 * (d.list ? .7 + R() * .35 : 1.1 + R() * .4));
    const id = G.nid++;
    G.off.push({ id, pid, from, fee, exp: G.day + 7 });
    mail(`${clubName(from)} 對 ${ps(pid).sn} 出價`, `${esc(clubName(from))} 願意出 <b>${money(fee)}</b> 收購 ${esc(ps(pid).name)}（身價 ${money(fee0)}）。報價 7 日內有效。`, { k: 'offer', id });
  }
  G.off = G.off.filter(o => { if (o.exp < G.day) { return false; } return true; });
}
function acceptOffer(id) {
  const o = G.off.find(x => x.id === id); if (!o) return '報價已經過期';
  if (pd(o.pid).c !== G.mgr.cid) { G.off = G.off.filter(x => x.id !== id); return '球員已經唔喺你球隊'; }
  transfer(o.pid, o.from, o.fee);
  G.off = G.off.filter(x => x.pid !== o.pid);
  return `${ps(o.pid).sn} 以 ${money(o.fee)} 轉會 ${clubName(o.from)}`;
}

/* ---------- user bids & contracts ---------- */
function userBid(pid, fee) {
  const me = G.mgr.cid, d = pd(pid);
  if (!inWindow(G.day)) return { ok: false, msg: '轉會截止日（3 月 28 日）已過，要等到 7 月 1 日轉會市場重開。' };
  if (d.c === me) return { ok: false, msg: '佢已經係你嘅球員。' };
  if (refusesMove(pid, me)) return { ok: false, msg: `${ps(pid).sn} 表示唔會考慮加盟低級別聯賽球會。` };
  if (d.c === 'free') return { ok: true, fee: 0, msg: '自由球員，可以直接傾合約。' };
  if (!G.inf && fee > G.clubs[me].cash) return { ok: false, msg: `球會只有 ${money(G.clubs[me].cash)}，唔夠錢。` };
  const ask = askingPrice(pid);
  if (fee >= ask) return { ok: true, fee, msg: `${clubName(d.c)} 接受你 ${money(fee)} 嘅出價，可以同球員傾合約。` };
  if (fee >= ask * .75) return { ok: false, counter: ask, msg: `${clubName(d.c)} 拒絕，佢哋要 ${money(ask)} 先肯放人。` };
  return { ok: false, msg: `${clubName(d.c)} 一口拒絕：「${money(fee)}？唔使諗。」` };
}
function contractTalk(pid, wage, years) {
  const me = G.mgr.cid, dem = wageDemand(pid, me);
  if (years < 1 || years > 5) return { ok: false, msg: '合約年期要 1 至 5 年。' };
  const want = dem * (ageOf(pid) >= 30 && years >= 3 ? .92 : 1);
  if (wage >= want * (.95 + R() * .08)) return { ok: true, msg: `${ps(pid).sn} 接受 ${money(wage)}／週、${years} 年合約。` };
  return { ok: false, dem, msg: `${ps(pid).sn} 想要大約 ${money(dem)}／週。` };
}
function completeSigning(pid, fee, wage, years) {
  const me = G.mgr.cid;
  transfer(pid, me, fee, wage, years);
  mail(`簽入 ${ps(pid).sn}`, `${esc(ps(pid).name)} 正式加盟，轉會費 ${money(fee)}，週薪 ${money(wage)}，合約至 ${G.season + years} 年 6 月。`);
}
function renewContract(pid, wage, years) {
  const d = pd(pid), dem = Math.max(d.w, roundMoney(wageFor(d.sk, G.clubs[d.c].lg) * 1.05 / 10) * 10);
  if (wage >= dem * (.95 + R() * .08)) { d.w = wage; d.ct = G.season + years; return { ok: true, msg: `${ps(pid).sn} 續約 ${years} 年，週薪 ${money(wage)}。` }; }
  return { ok: false, dem, msg: `${ps(pid).sn} 想要大約 ${money(dem)}／週先肯續約。` };
}
function releasePlayer(pid) {
  const d = pd(pid), comp = Math.round(d.w * 52 * Math.max(0, d.ct - G.season) * .5);
  fin(d.c, 'tout', -comp); movePlayer(pid, 'free');
  return `已解約 ${ps(pid).sn}，賠償 ${money(comp)}。`;
}

/* ---------- scout gacha (抽卡球探) ---------- */
const GRATES = [['UR', .6], ['SSR', 4], ['SR', 14], ['R', 33], ['C', 48.4]];
const PULLCOST = { eng1: 5e5, eng2: 2.5e5, eng3: 1e5, eng4: 5e4, sco1: 1.5e5, esp1: 5e5, ita1: 5e5, ger1: 4e5, fra1: 3e5, ned1: 2.5e5, por1: 2e5, tur1: 2e5, bel1: 1.5e5 };
const pullCost = n => { const c = PULLCOST[G.clubs[G.mgr.cid].lg] || 2e5; return n === 10 ? c * 9 : c; };
function gachaPool() {
  const me = G.mgr.cid, pool = { UR: [], SSR: [], SR: [], R: [], C: [] };
  for (const pid in G.pl) { const d = G.pl[pid]; if (d.c === me || d.c === 'ret' || ps(pid).yth) continue; pool[GRADE(d.sk)].push(pid); }
  return pool;
}
function gachaPull(n) {
  const me = G.mgr.cid, cost = pullCost(n);
  if (!G.inf && G.clubs[me].cash < cost) return { err: `要 ${money(cost)}，球會而家得 ${money(G.clubs[me].cash)}。` };
  fin(me, 'scout', -cost);
  const pool = gachaPool(), sc = G.clubs[me].st.scout, out = [];
  for (let k = 0; k < n; k++) {
    const r = R() * 100;
    let acc = 0, g = 'C';
    const rates = GRATES.map(([gr, p]) => [gr, gr === 'C' ? p - sc * 1.5 : gr === 'SR' ? p + sc * 1.5 : p]);
    for (const [gr, p] of rates) { acc += p; if (r < acc) { g = gr; break; } }
    if (n === 10 && k === 9 && !out.some(x => ['SR', 'SSR', 'UR'].includes(x.g))) g = R() < .03 ? 'UR' : R() < .23 ? 'SSR' : 'SR';
    let list = pool[g].filter(p => !out.some(o => o.pid === p));
    if (!list.length) list = pool.C;
    const pid = pick(list), from = pd(pid).c;
    out.push({ pid, g, from });
  }
  for (const o of out) {
    if (roster(me).length >= 45) { o.full = 1; fin(me, 'scout', Math.round(pullCost(1) * .25)); continue; }
    transfer(o.pid, me, 0, Math.round(wageFor(pd(o.pid).sk, G.clubs[me].lg) * 1.05 / 10) * 10, ri(2, 4));
  }
  G.stats.pulls += n;
  return { out, cost };
}

/* ---------- season set-up & rollover ---------- */
function setupSeason(s) {
  G.season = s; const o = off(s);
  G.fx = []; G.comp = {}; FXD = new Map();
  for (const cid of GCL()) { const c = G.clubs[cid]; c.fin.s = {}; }
  createEurope(s, o);
  for (const lid of PLG()) createLeague(lid, o);
  createCups(s, o);
  resolveClashes();
  for (const lid of PLG()) byRep(G.lgm[lid]).forEach((c, i) => { G.clubs[c].exp = i + 1; });
  for (const cid of GCL()) if (!isUser(cid)) autoPick(cid);
  const me = G.mgr.cid;
  if (me) {
    const c = G.clubs[me], n = G.lgm[c.lg].length;
    const goal = c.exp <= 1 ? '爭奪聯賽冠軍' : c.exp <= 4 ? '打入前四' : c.exp <= n / 2 ? '前半部完成' : c.exp <= n - 4 ? '安全護級' : '避免降班';
    c.goal = goal;
    mail(`${s}/${String(s + 1).slice(2)} 球季開始`, `董事局對今季嘅目標係：<b>${goal}</b>（預期第 ${c.exp} 名）。<br>轉會市場開放至 3 月 28 日。祝你好運！`);
  }
}
function leagueFinished(comp) {
  comp.done = true; comp.fin = standings(comp.tab).map(x => x.c);
  const champ = comp.fin[0];
  news(`🏆 ${clubName(champ)} 成為${comp.nm}冠軍`);
  G.trophies.push({ s: G.season, c: comp.id, nm: comp.nm, w: champ });
  // English play-offs
  const PO = { eng2: ['po2', [2, 5]], eng3: ['po3', [2, 5]], eng4: ['po4', [3, 6]] }[comp.id];
  if (PO) {
    const [id, [a, b]] = PO, f = comp.fin;
    const last = Math.max(...G.fx.filter(x => x.c === comp.id).map(x => x.d));
    createKO(id, [{ n: '準決賽', d: [last + 7, last + 11], legs: 2, seeded: [[f[b], f[a]], [f[b - 1], f[a + 1]]] }, { n: '決賽', d: [last + 22], neu: 1, fin: 1, ven: '千禧球場' }], { nm: LG[comp.id].name + '升級附加賽' }); // named after the league (英甲 in 2001, 英冠 from 2004)
    G.comp[id].alive = [];
  }
  const me = G.mgr.cid;
  if (me && comp.cl.includes(me)) {
    const pos = comp.fin.indexOf(me) + 1, c = G.clubs[me];
    mail(`${comp.nm}完結：第 ${pos} 名`, `你今季喺${comp.nm}排第 <b>${pos}</b> 名，董事局預期係第 ${c.exp} 名。`);
  }
}
function rollover() {
  const s = G.season, me = G.mgr.cid;
  // league prize money & board review
  for (const lid of PLG()) {
    const comp = G.comp[lid]; if (!comp.fin) comp.fin = standings(comp.tab).map(x => x.c);
    const n = comp.fin.length;
    comp.fin.forEach((cid, i) => fin(cid, 'prize', Math.round((n - i) * 5.5e5 * (TIERF[lid] || .7) ** 2)));
  }
  // awards
  const aw = [];
  for (const lid of PLG()) {
    const pl = G.lgm[lid].flatMap(c => roster(c));
    const ts = pl.sort((a, b) => pd(b).s.gl - pd(a).s.gl)[0];
    const bp = pl.filter(p => pd(p).s.ap >= 15).sort((a, b) => pd(b).s.rt / pd(b).s.ap - pd(a).s.rt / pd(a).s.ap)[0];
    aw.push({ lg: lid, top: ts && [ts, pd(ts).s.gl, pd(ts).c], best: bp && [bp, +(pd(bp).s.rt / pd(bp).s.ap).toFixed(2), pd(bp).c] });
  }
  G.hist.push({ s, champs: Object.fromEntries(PLG().map(l => [l, G.comp[l].fin[0]])), cups: Object.fromEntries(Object.values(G.comp).filter(c => c.t !== 'L').map(c => [c.id, c.win])), aw, me: me && { cid: me, lg: G.clubs[me].lg, pos: G.comp[G.clubs[me].lg].fin.indexOf(me) + 1 } });
  // qualification for next season's Europe
  const top = (l, a, b) => G.comp[l].fin.slice(a, b);
  const ql = PLG().filter(l => QSPOTS[l]);
  const cl = ql.flatMap(l => top(l, 0, QSPOTS[l][0]));
  const ue = [...top('eng1', 4, 6), G.comp.fac.win, G.comp.lc.win, ...ql.filter(l => l !== 'eng1').flatMap(l => top(l, QSPOTS[l][0], QSPOTS[l][0] + QSPOTS[l][1]))].filter(c => c && !cl.includes(c) && G.clubs[c].lg !== 'eng2' || (c && G.lgm.eng1.includes(c) && !cl.includes(c)));
  G.qual = { cl, uefa: [...new Set(ue)] };
  // board verdict
  if (me) {
    const c = G.clubs[me], pos = G.comp[c.lg].fin.indexOf(me) + 1;
    c.conf = clamp(c.conf + (c.exp - pos) * 4 + 5, 0, 100);
    G.mgr.rep = clamp(G.mgr.rep + (c.exp - pos) * 1.5 + (G.trophies.filter(t => t.s === s && t.w === me).length * 4), 1, 100);
    if (c.conf < 15) sackManager('董事局對今季表現極度失望，決定即時解除你嘅職務。');
  }
  // promotion / relegation (England only — the other leagues have no lower division in the game)
  const move = (up, dn2, nUp, nDn, po) => {
    const down = G.comp[up].fin.slice(-nDn), upc = G.comp[dn2].fin.slice(0, nUp);
    const pw = G.comp[po]?.win || G.comp[dn2].fin[nUp];
    upc.push(pw);
    G.lgm[up] = G.lgm[up].filter(c => !down.includes(c)).concat(upc);
    G.lgm[dn2] = G.lgm[dn2].filter(c => !upc.includes(c)).concat(down);
    upc.forEach(c => { G.clubs[c].lg = up; news(`⬆ ${clubName(c)} 升上${LG[up].name}`); });
    down.forEach(c => { G.clubs[c].lg = dn2; news(`⬇ ${clubName(c)} 降落${LG[dn2].name}`); });
  };
  move('eng3', 'eng4', 3, 4, 'po4'); move('eng2', 'eng3', 2, 3, 'po3'); move('eng1', 'eng2', 2, 3, 'po2');
  // players: development, retirement, contracts
  const ns = s + 1;
  for (const pid in G.pl) {
    const d = G.pl[pid]; if (d.c === 'ret') continue;
    const a = ns - ps(pid).by, f = d.fm.length ? sum(d.fm) / d.fm.length : 6.5;
    const dv = a <= 19 ? ri(1, 6) : a <= 22 ? ri(0, 5) : a <= 25 ? ri(-1, 3) : a <= 29 ? ri(-2, 2) : a <= 31 ? ri(-4, 1) : a <= 33 ? ri(-5, 0) : ri(-7, -1);
    d.sk = clamp(d.sk + dv + (f >= 7.2 ? 1 : 0), 25, 97);
    if (a >= 39 || (a >= 34 && R() < .2 + (a - 34) * .15)) { if (d.sk >= 80) news(`${ps(pid).sn} 宣佈退休`); if (isUser(d.c)) mail(`${ps(pid).sn} 退休`, `${esc(ps(pid).name)} 決定掛靴。`); movePlayer(pid, 'ret'); continue; }
    if (d.ct <= s) {
      if (isUser(d.c)) { mail(`${ps(pid).sn} 約滿離隊`, `${esc(ps(pid).name)} 嘅合約已經完結，以自由身離開。`); movePlayer(pid, 'free'); }
      else if (d.c !== 'free') { const avg = lineAvg(d.c)[lineOf(ps(pid).pos)]; if (R() < (d.sk >= avg - 8 ? .8 : .35)) d.ct = ns + ri(1, 3); else movePlayer(pid, 'free'); }
    }
    if (d.c !== 'free') d.w = Math.max(d.w, Math.round(wageFor(d.sk, G.clubs[d.c].lg) * .9 / 10) * 10);
    d.s = newStats(); d.fm = []; d.cond = 100; d.sus = 0;
  }
  // new real players for the new season, if a data patch exists
  const patch = FM.seasons?.[ns] && (FM.seasons[ns].era || 2001) === (G.era || 2001) ? FM.seasons[ns] : null;
  if (patch) for (const [ck, rows] of Object.entries(patch.clubs || {})) rows.forEach((r, i) => { const pid = `s${ns}.${ck}.${i}`; const cid = G.clubs[ck] ? ck : 'free'; G.pl[pid] = newPl(cid, r[5], ns + ri(1, 4), r[0]); (ROS[cid] = ROS[cid] || []).push(pid); });
  // youth intake
  for (const cid of GCL()) { if (!isUser(cid)) { for (let k = 0; k < ri(0, 2); k++) mkYouth(cid, pick(['CD', 'CM', 'ST', 'RM', 'LB', 'GK']), clamp(Math.round(lineAvg(cid).M - 14 + ri(-3, 4)), 32, 70)); } fillYouth(cid, isUser(cid) ? 16 : 20, 10); }
  ALLP = null;
  G.off = [];
  setupSeason(ns);
  if (G.mgr.cid) jobOffers(2);
}
function sackManager(why) {
  const me = G.mgr.cid; if (!me) return;
  mail('你被解僱', esc(why) + '<br>可以喺「董事局」頁面揀新工作。');
  news(`${clubName(me)} 解僱領隊 ${G.mgr.name}`);
  G.mgr.cid = null; G.mgr.rep = clamp(G.mgr.rep - 10, 1, 100);
  autoPick(me);
  jobOffers(3);
}
function jobOffers(n) {
  const r = G.mgr.rep, me = G.mgr.cid;
  const cand = shuffle(GCL().filter(c => c !== me && G.clubs[c].lg !== 'eur' && G.clubs[c].rep <= r + 18 && G.clubs[c].rep >= r - 30));
  G.jobs = cand.slice(0, me ? (R() < .5 ? 1 : 0) : n).map(c => ({ c, exp: G.day + 30 }));
  if (G.jobs.length) mail('工作邀請', G.jobs.map(j => esc(clubName(j.c))).join('、') + ' 想請你做領隊，可以喺「董事局」頁面考慮。');
}
function takeJob(cid) {
  const old = G.mgr.cid;
  if (old) autoPick(old);
  G.mgr.cid = cid; G.jobs = [];
  const c = G.clubs[cid]; c.conf = 60;
  autoPick(cid);
  mail(`成為 ${clubName(cid)} 領隊`, `你正式接手 ${esc(clubName(cid))}。董事局希望你達到預期（第 ${c.exp} 名）。`);
}

/* ---------- new game ---------- */
function newGame(name, cid, slot) {
  const s0 = ERA.y;
  G = { v: 2, era: s0, plg: [...PLAY_LG], slot, mgr: { name, cid, rep: clamp(CL[cid].rep - 5, 20, 80) }, season: s0, day: CAL.start + off(s0), inf: false, clubs: {}, pl: {}, y: {}, comp: {}, fx: [], nfx: 1, nid: 1, mail: [], news: [], off: [], tlog: [], hist: [], trophies: [], jobs: [], lgm: null, qual: null, stats: { pulls: 0 } };
  G.lgm = Object.fromEntries(Object.values(LG).map(L => [L.id, [...L.cids]]));
  for (const id of CLUBS) {
    const c = CL[id];
    G.clubs[id] = { lg: c.lg0, cash: Math.round(c.bank * 1e6), cap: c.cap, price: DEFPRICE[c.lg0] || 18, rep: c.rep, form: aiForm(id), sty: { ment: 1, pass: 1, tempo: 1, mark: 0, trap: 0 }, xi: [], sb: [], ord: {}, tr: { int: 1, foc: 'bal' }, st: { coach: 2, physio: 2, scout: 1 }, conf: 65, exp: 10, build: null, fin: { w: {}, s: {} } };
  }
  for (const pid in PS) {
    if (/^s\d{4}\./.test(pid)) continue;
    const p = PS[pid], c = pid.split('.').slice(0, 2).join('.'), a = s0 - p.by;
    G.pl[pid] = newPl(c, p.sk, s0 + ri(1, a < 24 ? 5 : a < 30 ? 4 : 2), p.no);
  }
  reindex();
  for (const cid of CLUBS) fillYouth(cid, 18);
  for (const cid of CLUBS) { const used = new Set(); for (const p of roster(cid)) { const d = pd(p); if (!d.no || used.has(d.no)) d.no = 0; used.add(d.no); } for (const p of roster(cid)) if (!pd(p).no) pd(p).no = squadNo(cid); }
  setupSeason(s0);
  autoPick(cid);
  mail('歡迎嚟到 ' + clubName(cid), `${esc(name)}，董事局歡迎你出任 <b>${esc(clubName(cid))}</b> 領隊。<br>撳右上角「下一日」推進日子；有比賽嘅日子會自動入比賽畫面。季前可以先去「球員搜尋」或者「球探抽卡」補強。`);
}

/* ---------- daily loop ---------- */
const todayFx = () => (FXD.get(G.day) || []).filter(f => f.hg == null);
const userFxToday = () => todayFx().find(f => isUser(f.h) || isUser(f.a));
function playToday() {
  for (const f of todayFx()) { if (!G.clubs[f.h] || !G.clubs[f.a]) { f.hg = f.ag = 0; continue; } simFx(f); }
}
function nextDay() {
  playToday();
  G.day++;
  const d = G.day;
  // recovery & injuries
  const rec = {};
  for (const cid of GCL()) { const c = G.clubs[cid]; rec[cid] = [7, 6, 4.5][c.tr.int] + c.st.physio * .4; }
  for (const pid in G.pl) {
    const p = G.pl[pid]; if (p.c === 'ret') continue;
    p.cond = Math.min(100, p.cond + (rec[p.c] || 7));
    if (p.inj > 0 && --p.inj === 0) { p.injn = ''; if (isUser(p.c)) mail(`${ps(pid).sn} 傷癒復出`, `${esc(ps(pid).name)} 已經完全康復，可以上陣。`); }
  }
  if (wday(d) === 1) { weekly(); training(); }
  if (inWindow(d)) { aiMarket(); aiOffers(); }
  for (const id in G.comp) { const c = G.comp[id]; if (c.t !== 'L') maybeDraw(c, d); }
  for (const j of G.jobs) if (j.exp < d) G.jobs = G.jobs.filter(x => x !== j);
  if (!G.mgr.cid && R() < .05 && !G.jobs.length) jobOffers(2);
  const me = G.mgr.cid;
  if (me && dd(d).getUTCDate() === 1) monthly(me);
  if (d >= CAL.roll + off(G.season)) rollover();
}
function training() {
  for (const cid of GCL()) {
    const c = G.clubs[cid], g = [.55, 1, 1.4][c.tr.int] * (.7 + c.st.coach * .15);
    for (const pid of roster(cid)) {
      const d = pd(pid), a = ageOf(pid);
      if (a <= 23 && R() < .035 * g) d.sk = Math.min(97, d.sk + 1);
      else if (a >= 31 && R() < .03 / g) d.sk = Math.max(25, d.sk - 1);
      if (c.tr.int === 2 && R() < .004) { d.inj = ri(3, 12); d.injn = '訓練受傷'; if (isUser(cid)) mail(`${ps(pid).sn} 訓練受傷`, `${esc(ps(pid).name)} 喺高強度訓練中受傷，要休息 ${d.inj} 日。`); }
    }
  }
}
function monthly(me) {
  const c = G.clubs[me], comp = G.comp[c.lg];
  if (!comp || comp.done) return;
  const pos = standings(comp.tab).findIndex(x => x.c === me) + 1;
  if (comp.pl > comp.n * .2) {
    const diff = c.exp - pos;
    c.conf = clamp(c.conf + clamp(diff, -6, 6), 0, 100);
    if (c.cash < -2e6 && !G.inf) { c.conf = clamp(c.conf - 6, 0, 100); mail('董事局關注財政', `球會而家欠 ${money(-c.cash)}，董事局要求你減少開支或者賣人。`); }
    if (c.conf <= 0) sackManager('成績同財政都令董事局失去耐性。');
    else if (c.conf < 25) mail('董事局警告', `董事局對你嘅信心跌到 ${Math.round(c.conf)}%。如果成績唔改善，你隨時會被炒。`);
  }
  // contract reminders in January
  if (dd(G.day).getUTCMonth() === 0) {
    const exp = roster(me).filter(p => pd(p).ct <= G.season && !ps(p).yth);
    if (exp.length) mail('合約即將到期', '以下球員合約今季完結：' + exp.map(p => esc(ps(p).sn)).join('、') + '。去「合約」頁面續約，唔係 7 月 1 日就會自由身離隊。');
  }
}

/* ---------- match result bookkeeping (called by the match engine) ---------- */
function recordResult(f) {
  const comp = G.comp[f.c];
  const h = f.hg, a = f.ag;
  const upd = (tab, c, gf, ga) => { const t = tab[c]; if (!t) return; t[0]++; t[4] += gf; t[5] += ga; if (gf > ga) t[1]++; else if (gf === ga) t[2]++; else t[3]++; };
  if (comp.t === 'L') { upd(comp.tab, f.h, h, a); upd(comp.tab, f.a, a, h); comp.pl++; if (comp.pl >= comp.n) leagueFinished(comp); }
  else if (comp.t === 'G' && f.g != null) { upd(comp.gtab, f.h, h, a); upd(comp.gtab, f.a, a, h); comp.gpl++; if (comp.gpl >= comp.gn) groupsDone(comp); }
  else {
    const t = comp.ties.find(x => x.fx.includes(f.i));
    if (t && (f.ko === 1 || f.ko === 2)) {
      if (f.ko === 1) t.w = h > a ? f.h : a > h ? f.a : (f.ph > f.pa ? f.h : f.a);
      else { const l1 = fxById(t.fx[0]); const th = h + l1.ag, ta = a + l1.hg; t.agg = [th, ta];
        t.w = th > ta ? f.h : ta > th ? f.a : a > l1.ag ? f.a : l1.ag > a ? f.h : f.ph != null ? (f.ph > f.pa ? f.h : f.a) : f.h; }
      if (isUser(t.a) || isUser(t.b)) { const won = isUser(t.w); mail(`${comp.nm}${comp.rd[t.r].n}：${won ? '晉級！' : '出局'}`, won ? `你淘汰咗 ${esc(clubName(isUser(t.a) ? t.b : t.a))}。` : `${esc(clubName(t.w))} 淘汰咗你。`); }
    }
  }
  // gate & TV
  const neu = f.n, hc = G.clubs[f.h];
  if (hc && !neu) { const att = attendance(f.h, f.a, f.c); f.att = att; fin(f.h, 'gate', att * hc.price); }
  if (neu) { const att = 50000 + ri(0, 25000); f.att = att; fin(f.h, 'gate', att * 12); fin(f.a, 'gate', att * 12); }
  const tv = comp.t === 'L' ? TV[f.c] || 1e5 : f.c === 'cl' ? 5e5 : f.c === 'uefa' ? 1.5e5 : 6e4;
  fin(f.h, 'tv', tv); fin(f.a, 'tv', tv);
  if (f.c === 'cl') { if (h > a) fin(f.h, 'prize', 3e5); else if (a > h) fin(f.a, 'prize', 3e5); }
  // board mood after the user's games
  for (const side of ['h', 'a']) {
    const cid = f[side]; if (!isUser(cid)) continue;
    const gf = side === 'h' ? h : a, ga = side === 'h' ? a : h, c = G.clubs[cid];
    c.conf = clamp(c.conf + (gf > ga ? 1.5 : gf === ga ? 0 : -1.8), 0, 100);
    G.mgr.rep = clamp(G.mgr.rep + (gf > ga ? .15 : gf < ga ? -.1 : 0), 1, 100);
  }
}
function groupsDone(comp) {
  comp.gdone = true;
  const thirds = [];
  comp.grp.forEach(g => { const st = standings(Object.fromEntries(g.map(c => [c, comp.gtab[c]]))); thirds.push(st[2].c); });
  const ue = G.comp.uefa; if (ue) ue.rd[2].ent.push(...thirds);
  const me = G.mgr.cid;
  if (me && comp.grp.flat().includes(me)) {
    const g = comp.grp.find(x => x.includes(me)), st = standings(Object.fromEntries(g.map(c => [c, comp.gtab[c]]))), pos = st.findIndex(x => x.c === me) + 1;
    mail('歐聯分組賽完結', pos <= 2 ? `你以小組第 ${pos} 名出線，晉身十六強！` : pos === 3 ? '小組第三，轉戰歐洲足協盃第三圈。' : '小組包尾，歐洲之旅完結。');
  }
}

/* ---------- save / load (compact) ---------- */
const SKEY = s => 'xifm-fm-' + s;
function pack() {
  const pl = {}; for (const pid in G.pl) { const d = G.pl[pid]; if (d.c === 'ret') continue; const st = d.s; pl[pid] = [d.c, d.no, d.sk, Math.round(d.cond), d.fm.join('|'), d.inj, d.injn, d.sus, d.w, d.ct, d.list, st.ap, st.gl, st.as, st.yc, st.rc, st.mom, Math.round(st.rt * 10)]; }
  const fx = G.fx.map(f => [f.i, f.d, f.c, f.r, f.h, f.a, f.hg, f.ag, f.ko || 0, f.n || 0, f.g ?? -1, f.ph ?? -1, f.pa ?? -1, f.et || 0, f.att || 0, f.sc || 0]);
  return JSON.stringify(Object.assign({}, G, { pl, fx, packed: 1 }));
}
function unpack(str) {
  const g = JSON.parse(str);
  const pl = {};
  for (const pid in g.pl) { const a = g.pl[pid]; pl[pid] = { c: a[0], no: a[1], sk: a[2], cond: a[3], fm: a[4] ? a[4].split('|').map(Number) : [], inj: a[5], injn: a[6], sus: a[7], w: a[8], ct: a[9], list: a[10], s: { ap: a[11], gl: a[12], as: a[13], yc: a[14], rc: a[15], mom: a[16], rt: a[17] / 10 } }; }
  g.fx = g.fx.map(a => { const f = { i: a[0], d: a[1], c: a[2], r: a[3], h: a[4], a: a[5], hg: a[6], ag: a[7] }; if (a[8]) f.ko = a[8]; if (a[9]) f.n = 1; if (a[10] >= 0) f.g = a[10]; if (a[11] >= 0) { f.ph = a[11]; f.pa = a[12]; } if (a[13]) f.et = 1; if (a[14]) f.att = a[14]; if (a[15]) f.sc = a[15]; return f; });
  g.pl = pl; delete g.packed;
  G = g; reindex(); reindexFx(); ALLP = null;
}
function saveGame() {
  try { localStorage.setItem(SKEY(G.slot), pack()); const m = loadMeta(); m[G.slot] = { mgr: G.mgr.name, cid: G.mgr.cid, cn: G.mgr.cid ? clubName(G.mgr.cid) : '', era: G.era || 2001, day: G.day, season: G.season }; localStorage.setItem('xifm-fm-meta', JSON.stringify(m)); return true; }
  catch (e) { return false; }
}
function loadMeta() { try { return JSON.parse(localStorage.getItem('xifm-fm-meta')) || {}; } catch (e) { return {}; } }
function loadGame(slot) { try { const s = localStorage.getItem(SKEY(slot)); if (!s) return false; unpack(s); G.slot = slot; return true; } catch (e) { return false; } }
function deleteSave(slot) { try { localStorage.removeItem(SKEY(slot)); const m = loadMeta(); delete m[slot]; localStorage.setItem('xifm-fm-meta', JSON.stringify(m)); } catch (e) { } }

// data already present (headless tools bundle it before core): index it now; the page loads an era later and calls indexEra itself
if (FM.leagues.length) indexEra(FM.era || 2001);

if (typeof module !== 'undefined') module.exports = { get G() { return G; } };
