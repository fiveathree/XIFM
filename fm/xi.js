/* =====================================================================
   傳奇十一人 × 經理生涯: the card side of the main game, brought into career mode.
   Loaded after life.js, before ui.js (also by tools/fm-sim.js).
   • Card grade from ability (GRADE in core.js); card level d.clv 0–5 from duplicate scout cards, +1 rating each
   • Collection 卡冊: G.cards { pid: copies } — every player you scout or have in your squad
   • Chemistry 默契加成: nationality links inside the eleven (all clubs)
   • Tactic styles 戰術風格: the main game's seven tactics; each sets the sliders and gives a bonus that depends on
     how well the players suit it (c.tac, user club only)
   ===================================================================== */
const CLVMAX = 5;
const clvOf = pid => (G.pl[pid] && G.pl[pid].clv) || 0;
const cardR = pid => pd(pid).sk + clvOf(pid);
const owns = pid => (G.cards && G.cards[pid]) || 0;
function cardsInit() {   // old saves: the squad counts as collected
  G.cards = G.cards || {};
  if (G.mgr.cid) for (const p of roster(G.mgr.cid)) { if (!G.cards[p]) G.cards[p] = 1; if (typeof skTrack === 'function') skTrack(p); }
}
const DUPF = { C: .1, R: .3, SR: 1.2, SSR: 5, UR: 30 }, UPF = { C: .2, R: .4, SR: 1, SSR: 3, UR: 10 };
const dupValue = pid => Math.round(pullCost(1) * DUPF[gradeOf(pid)] / 1e3) * 1e3;
function upInfo(pid) { const l = clvOf(pid), need = l + 1; return { l, need, spare: owns(pid) - 1, cost: Math.round(pullCost(1) * UPF[gradeOf(pid)] * need / 1e3) * 1e3 }; }
function cardUpgrade(pid) {
  const u = upInfo(pid), me = G.mgr.cid;
  if (u.l >= CLVMAX) return '已經升到最高級';
  if (pd(pid).c !== me) return '只可以升級自己球隊嘅球員';
  if (u.spare < u.need) return `要 ${u.need} 張重複卡（而家 ${Math.max(0, u.spare)} 張）`;
  if (!G.inf && G.clubs[me].cash < u.cost) return '資金唔夠';
  fin(me, 'scout', -u.cost); G.cards[pid] -= u.need; pd(pid).clv = u.l + 1;
  return null;
}
function cardSell(pid, all) {
  const n = all ? owns(pid) - 1 : 1; if (owns(pid) - 1 < n || n < 1) return 0;
  const v = dupValue(pid) * n; G.cards[pid] -= n; fin(G.mgr.cid, 'tin', v); return v;
}

/* ---------- chemistry: links to team-mates of the same nation (the main game also counted same club) ---------- */
function chemMap(pids) {
  const out = {}, nat = {};
  for (const p of pids) { const n = ps(p).nat; nat[n] = (nat[n] || 0) + 1; }
  for (const p of pids) { const l = nat[ps(p).nat] - 1; out[p] = l >= 6 ? 2 : l >= 3 ? 1 : 0; }
  return out;
}

/* ---------- tactic styles (傳奇十一人 TAC) ---------- */
const TACP = {
  bal: { n: '均衡', d: '攻守平均，唔睇球員特性。', sty: { ment: 1, pass: 1, tempo: 1 } },
  pos: { n: '控球傳導', d: '靠中場傳球控制節奏，穩陣。睇全隊傳球。', sty: { ment: 1, pass: 0, tempo: 0 } },
  press: { n: '高位壓迫', d: '前場搶波，節奏快，體力消耗大。睇全隊速度同體力。', sty: { ment: 2, pass: 1, tempo: 2 } },
  counter: { n: '快速反擊', d: '退守再打身後。睇前場球員速度。', sty: { ment: 0, pass: 2, tempo: 2 } },
  wing: { n: '邊路傳中', d: '翼鋒同閘位推上傳中，前鋒頂頭槌。睇邊路速度同前鋒頭球。', sty: { ment: 1, pass: 2, tempo: 1 } },
  bus: { n: '擺大巴', d: '全隊退守，防守大增但好難入波。', sty: { ment: 0, pass: 2, tempo: 0 } },
  allout: { n: '全力進攻', d: '壓上搶攻，入球多但後防空虛。', sty: { ment: 2, pass: 1, tempo: 2 } },
};
// how well the players on the pitch suit the style: k in [-4, 4]; att/def are added to the match ratings
function tacFit(key, on) {
  const pl = on.filter(o => o.pid && ps(o.pid).pos !== 'GK');
  // each attribute compared with the player's own overall, so a style suits a team's strengths (not just good teams);
  // centres and spreads measured over all clubs of an era: about −2…+2 for most teams
  const av = (arr, k) => arr.length ? arr.reduce((t, o) => t + attrs(o.pid)[k] - pd(o.pid).sk, 0) / arr.length : null;
  const z = (v, m, sd) => v == null ? 0 : clamp((v - m) / sd * 1.6, -4, 4), L = o => lineOf(o.slot);
  const fwd = pl.filter(o => L(o) === 'A'), wide = pl.filter(o => ['LW', 'RW', 'LM', 'RM', 'LB', 'RB', 'LWB', 'RWB'].includes(o.slot)), st = pl.filter(o => ['ST', 'CF'].includes(o.slot));
  let k = 0, att = 0, def = 0;
  switch (key) {
    case 'pos': k = z(av(pl, 4), -3.3, 1.5); att = k * .35; def = k * .25; break;
    case 'press': k = z(pl.length ? (av(pl, 0) + av(pl, 1)) / 2 : null, -.25, 1.15); att = .4 + k * .35; def = k * .2; break;
    case 'counter': k = z(av(fwd, 0), 3.65, 2.6); att = k * .4; def = .8; break;
    case 'wing': k = z(wide.length && st.length ? (av(wide, 0) + av(st, 6)) / 2 : null, 1.8, 2.8); att = .3 + k * .35; def = -.3; break;
    case 'bus': att = -1.5; def = 1.5; break;
    case 'allout': att = 1.5; def = -1.5; break;
  }
  const fit = ['bus', 'allout', 'bal'].includes(key) ? null : k >= 1.5 ? '好適合' : k >= 0 ? '適合' : k >= -1.5 ? '一般' : '唔適合';
  return { k, att, def, fit };
}
function xiTac(S) { const c = G.clubs[S.cid]; return c.tac && TACP[c.tac] ? tacFit(c.tac, S.on) : null; }
function setTac(key) { const c = myClubX(); c.tac = key; Object.assign(c.sty, TACP[key].sty); }
const myClubX = () => G.clubs[G.mgr.cid];

/* ---------- youth team (青年軍) for your club: d.yt = 1 ----------
   Players 21 or under can be sent down: they leave first-team selection but play youth football (counts as regular
   playing time for season-end growth) and get the youth coach's training. Promote them back any time. */
const YTAGE = 21;
const inYouth = pid => !!(G.pl[pid] && G.pl[pid].yt);
function sendDown(pid) {
  const d = pd(pid), c = G.clubs[d.c];
  if (ageOf(pid) > YTAGE) return `只可以將 ${YTAGE} 歲或以下嘅球員落青年軍`;
  d.yt = 1; c.xi = c.xi.map(p => p === pid ? null : p); c.sb = c.sb.filter(p => p !== pid);
  if (c.sp) for (const k in c.sp) if (c.sp[k] === pid) delete c.sp[k];
  return null;
}
function callUp(pid) { delete pd(pid).yt; }

/* ---------- youth academy (青訓營) for your club ----------
   c.ya   academy level 1–5 (better prospects, faster growth)
   c.yr   youth results { w, d, l, gf, ga, log: [[day, opponent, gf, ga]] }
   Prospects are made-up players in G.y with pro: 1 and a hidden potential pot (G.y[pid].pot).
   Every 1 July 3–5 prospects (15–17) join the youth team; the youth team plays a game each week. */
const YANAME = ['', '基本', '普通', '良好', '優秀', '頂級'];
const yaOf = c => c.ya || 1;
const yaCost = c => Math.round((yaOf(c) + 1) ** 2 * 5e5 * (TIERF[c.lg] || .7) / 1e4) * 1e4;
const potOf = pid => (G.y[pid] && G.y[pid].pot) || 0;
// the potential your staff can see: the better the youth coach, the closer to the truth
function potSeen(pid) {
  const pot = potOf(pid); if (!pot) return 0;
  const c = G.clubs[G.mgr.cid], err = (5 - stLv(c, 'yth')) * 2, h = hsh(pid + 'pot') % (2 * err + 1) - err;
  return clamp(pot + h, pd(pid).sk, 97);
}
const potStars = v => v >= 88 ? 5 : v >= 82 ? 4 : v >= 75 ? 3 : v >= 68 ? 2 : 1;
const YPOS = ['GK', 'CD', 'CD', 'RB', 'LB', 'DM', 'CM', 'CM', 'AM', 'RM', 'LM', 'RW', 'LW', 'ST', 'ST', 'CF'];
function youthName(nat) { return typeof staffName === 'function' ? staffName(nat) : '青年球員'; }
function makeProspect(cid) {
  const c = G.clubs[cid], ya = yaOf(c), nat = R() < .8 ? clubCountry(cid) : pick(['BRA', 'ARG', 'FRA', 'NED', 'POR', 'ESP', 'NGA', 'GHA', 'CIV', 'SEN']);
  const sk = clamp(Math.round(30 + c.rep * .22 + ya * 3 + ri(-6, 6)), 35, 70);
  const pot = clamp(sk + ri(10, 28) + ya * 2 + (R() < .04 + ya * .01 ? ri(8, 16) : 0), sk + 5, 96);
  const n = G.nid++, pid = 'y' + n, name = youthName(nat);
  G.y[pid] = { no: 0, name, pos: pick(YPOS), nat, by: G.season - ri(15, 17), sk, sn: shortName(name), yth: 1, pro: 1, pot };
  G.pl[pid] = newPl(cid, sk, G.season + 3, 0); G.pl[pid].yt = 1; G.pl[pid].w = Math.max(150, Math.round(wageFor(sk, c.lg) * .3 / 10) * 10);
  (ROS[cid] = ROS[cid] || []).push(pid);
  G.cards = G.cards || {}; G.cards[pid] = 1; if (typeof skTrack === 'function') skTrack(pid);
  return pid;
}
function youthIntake(cid, n) {
  const got = []; for (let k = 0; k < n; k++) got.push(makeProspect(cid));
  const best = got.slice().sort((a, b) => potSeen(b) - potSeen(a))[0];
  mail('青訓新秀加入', `${got.length} 個青訓新秀加入咗青年軍：<br>${got.map(p => `${esc(ps(p).name)}（${ps(p).pos} · ${ageOf(p)} 歲 · 能力 ${pd(p).sk} · 潛力 ${'★'.repeat(potStars(potSeen(p)))}）`).join('<br>')}<br>青訓教練最睇好 <b>${esc(ps(best).sn)}</b>。去「青年軍」頁睇。`);
}
// weekly youth game and growth
function youthWeek() {
  const me = G.mgr.cid; if (!me) return;
  const c = G.clubs[me], ys = roster(me).filter(p => pd(p).yt && !pd(p).inj).sort((a, b) => pd(b).sk - pd(a).sk);
  if (ys.length >= 5) {
    const str = sum(ys.slice(0, 11).map(p => pd(p).sk)) / Math.min(11, ys.length) - (11 - Math.min(11, ys.length));
    const opp = pick(G.lgm[c.lg].filter(x => x !== me)), os = clamp(40 + G.clubs[opp].rep * .15 + ri(-5, 5), 40, 68);
    const lam = (a, b) => clamp(1.4 * Math.exp((a - b) / 18), .3, 4);
    const pois = l => { let k = 0, p = Math.exp(-l), s = p; const u = R(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; };
    const gf = pois(lam(str, os)), ga = pois(lam(os, str));
    const yr = c.yr = c.yr || { w: 0, d: 0, l: 0, gf: 0, ga: 0, log: [] };
    yr[gf > ga ? 'w' : gf < ga ? 'l' : 'd']++; yr.gf += gf; yr.ga += ga; yr.log.unshift([G.day, opp, gf, ga]); if (yr.log.length > 10) yr.log.length = 10;
    for (const p of ys.slice(0, 11)) { const d = pd(p); d.fm.push(clamp(6.4 + (gf - ga) * .25 + (R() - .5) * 1.6, 4.5, 9.5)); if (d.fm.length > 5) d.fm.shift(); }
  }
  // growth: prospects grow towards their potential; everyone in the youth team gets the academy and youth coach
  const ya = yaOf(c), yc = stLv(c, 'yth');
  for (const p of roster(me).filter(x => pd(x).yt)) {
    const d = pd(p), pot = potOf(p) || Math.min(97, d.sk + 6), f = form(p) || 6.5;
    if (d.sk < pot && R() < (pot - d.sk) / 160 * (.5 + ya * .12 + yc * .06) * (f >= 7 ? 1.3 : f < 6 ? .7 : 1)) d.sk++;
  }
}
// season start: intake for your club, and a youth record reset
function youthSeason() {
  const me = G.mgr.cid; if (!me) return;
  const c = G.clubs[me]; c.yr = { w: 0, d: 0, l: 0, gf: 0, ga: 0, log: [] };
  for (const p of roster(me)) if (potOf(p) && pd(p).sk > potOf(p)) pd(p).sk = potOf(p);   // nobody outgrows his potential
  youthIntake(me, ri(3, 4) + (yaOf(c) >= 4 ? 1 : 0));
}
function yaUpgrade() {
  const c = G.clubs[G.mgr.cid], cost = yaCost(c);
  if (yaOf(c) >= 5) return '青訓設施已經係頂級';
  if (!G.inf && c.cash < cost) return '資金唔夠';
  fin(G.mgr.cid, 'build', -cost); c.ya = yaOf(c) + 1; return null;
}

/* ---------- 傳奇球星 card pool (fm/legends.js from the main game) ----------
   Card id 'L<index>'. A legend becomes a player (G.y entry with leg: 1, age 27) the first time he is pulled.
   Legends who are real players of the loaded era (same name) are left out, so nobody exists twice. */
const nrm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
let LEGIDS = null;
function legendIds() {
  if (LEGIDS) return LEGIDS;
  const here = new Set(Object.values(PS).map(p => nrm(p.name)));   // full names only: a short name like "Ronaldo" is shared by many
  LEGIDS = (FM.LEGENDS || []).map((r, i) => [r, 'L' + i]).filter(([r]) => !here.has(nrm(r[0]))).map(x => x[1]);
  return LEGIDS;
}
const legendRow = id => FM.LEGENDS[+id.slice(1)];
const isLegend = pid => !!(ps(pid) && ps(pid).leg);
function makeLegend(id) {
  const L = legendRow(id);
  G.y[id] = { no: 0, name: L[0], pos: L[1], nat: L[2], by: G.season - 27, sk: L[3], sn: L[6] || shortName(L[0]), leg: 1, ls: L[4], lc: L[5] };
  G.pl[id] = newPl('free', L[3], G.season + 3, 0); (ROS.free = ROS.free || []).push(id);
  return id;
}
// a legend that has not been pulled yet, as card data for the screens
const legendCard = id => { const L = legendRow(id); return { name: L[0], sn: L[6] || shortName(L[0]), pos: L[1], nat: L[2], sk: L[3], meta: `${L[4]} ${L[5]}` }; };
