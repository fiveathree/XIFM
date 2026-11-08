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
  if (G.mgr.cid) { for (const p of roster(G.mgr.cid)) { if (!G.cards[p]) G.cards[p] = 1; if (typeof skTrack === 'function') skTrack(p); } if (seedYouth(G.mgr.cid)) mail('真實青年軍名單', `${esc(clubName(G.mgr.cid))} 嘅 U18 / U21 而家用返真實球員名單（${roster(G.mgr.cid).filter(p => ps(p).real).length} 人），原本虛構嘅新秀已經移除。去「青年軍」頁睇。`); }
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

/* chemistry: see "chemistry 2" further down */

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
  G.pl[pid] = newPl(cid, sk, G.season + 3, 0); G.pl[pid].yt = 1; G.pl[pid].w = Math.max(150, Math.round(wageFor(sk, c.lg, cid) * .3 / 10) * 10);
  (ROS[cid] = ROS[cid] || []).push(pid);
  G.cards = G.cards || {}; G.cards[pid] = 1; if (typeof skTrack === 'function') skTrack(pid);
  return pid;
}
function youthIntake(cid, n) {
  const got = []; for (let k = 0; k < n; k++) got.push(makeProspect(cid));
  const best = got.slice().sort((a, b) => potSeen(b) - potSeen(a))[0];
  mail('青訓新秀加入', `${got.length} 個青訓新秀加入咗青年軍：<br>${got.map(p => `${esc(ps(p).name)}（${ps(p).pos} · ${ageOf(p)} 歲 · 能力 ${pd(p).sk} · 潛力 ${'★'.repeat(potStars(potSeen(p)))}）`).join('<br>')}<br>青訓教練最睇好 <b>${esc(ps(best).sn)}</b>。去「青年軍」頁睇。`);
}
/* youth competitions for your club: U18 league, U21 league (round robin against the youth sides of your league)
   and the 青年足總盃 (U18 knockout against clubs of your country). Each team has its own line-up c.yl[t] = { form, xi }.
   c.yc = { s, wk, u18: { tab, log }, u21: { tab, log }, cup: { rd, out, won, log } }; c.yap = { pid: youth games this season } */
const YT = { u18: { n: 'U18 聯賽', age: 18, base: 40, k: .15 }, u21: { n: 'U21 聯賽', age: 21, base: 44, k: .17 } };
const YCUP = { n: '青年足總盃', wk: [8, 14, 20, 26, 32], rd: ['第三圈', '第四圈', '八強', '四強', '決賽'] };
const yEligible = (cid, t) => roster(cid).filter(p => ageOf(p) <= YT[t].age && !pd(p).inj && !pd(p).sus && !pd(p).xs);
function yLine(c, t) { c.yl = c.yl || {}; return c.yl[t] = c.yl[t] || { form: '4-4-2', xi: Array(11).fill(null) }; }
function yAuto(cid, t, keep) {
  const c = G.clubs[cid], L = yLine(c, t), slots = FORMS[L.form] || FORMS['4-4-2'], el = new Set(yEligible(cid, t));
  if (!keep) L.xi = Array(11).fill(null);
  L.xi = slots.map((s, k) => L.xi[k] && el.has(L.xi[k]) ? L.xi[k] : null);
  const used = new Set(L.xi.filter(Boolean));
  // best pairs first; a place stays with an unnamed academy kid when nobody named would do better there
  const fill = yFill(c), pairs = [];
  for (let k = 0; k < slots.length; k++) if (!L.xi[k]) for (const p of el) if (!used.has(p)) pairs.push([pd(p).sk * fitP(p, slots[k][0]), k, p]);
  pairs.sort((a, b) => b[0] - a[0]);
  for (const [v, k, p] of pairs) if (!L.xi[k] && !used.has(p) && v > fill) { L.xi[k] = p; used.add(p); }
}
const yFill = c => 34 + yaOf(c) * 2 + c.rep * .12;
function yStrength(cid, t) {
  const L = yLine(G.clubs[cid], t), slots = FORMS[L.form] || FORMS['4-4-2'];
  const c = G.clubs[cid], fill = yFill(c);   // an empty place is taken by an unnamed academy kid
  return slots.reduce((a, s, k) => a + (L.xi[k] ? pd(L.xi[k]).sk * fitP(L.xi[k], s[0]) : fill), 0) / slots.length;
}
const yOpp = (cid, t, extra = 0) => clamp(YT[t].base + G.clubs[cid].rep * YT[t].k + extra + ri(-4, 4), 36, 72);
const yPois = l => { let k = 0, p = Math.exp(-l), s = p; const u = R(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; };
const yLam = (a, b) => clamp(1.4 * Math.exp((a - b) / 18), .3, 4);
function yNew(c, me) {
  const cl = G.lgm[c.lg] || [me], tab = () => Object.fromEntries(cl.map(x => [x, [0, 0, 0, 0, 0, 0]]));
  return { s: G.season, wk: 0, cl: [...cl], u18: { tab: tab(), log: [] }, u21: { tab: tab(), log: [] }, cup: { rd: 0, out: false, won: false, log: [] } };
}
function yRec(T, a, b, ga, gb) { const x = T[a], y = T[b]; if (!x || !y) return; x[0]++; y[0]++; x[4] += ga; x[5] += gb; y[4] += gb; y[5] += ga; if (ga > gb) { x[1]++; y[3]++; } else if (ga < gb) { y[1]++; x[3]++; } else { x[2]++; y[2]++; } }
function yPlayed(c, t, gf, ga) {   // ratings and youth appearances for the eleven who played
  c.yap = c.yap || {};
  for (const p of yLine(c, t).xi.filter(Boolean)) { const d = pd(p); d.fm.push(clamp(6.4 + (gf - ga) * .25 + (R() - .5) * 1.6, 4.5, 9.5)); if (d.fm.length > 5) d.fm.shift(); c.yap[p] = (c.yap[p] || 0) + 1; }
}
function youthWeek() {
  const me = G.mgr.cid; if (!me) return;
  const c = G.clubs[me]; if (!c.yc || c.yc.s !== G.season) c.yc = yNew(c, me);
  const Y = c.yc, wk = Y.wk++, rr = roundRobin(Y.cl.length), rounds = [...rr, ...rr.map(r => r.map(([a, b]) => [b, a]))];
  for (const t of ['u18', 'u21']) {
    if (wk < rounds.length) for (const [a, b] of rounds[wk]) {
      const A = Y.cl[a], B = Y.cl[b];
      const sa = A === me ? (yAuto(me, t, true), yStrength(me, t)) : yOpp(A, t), sb = B === me ? (yAuto(me, t, true), yStrength(me, t)) : yOpp(B, t);
      const ga = yPois(yLam(sa + 1, sb)), gb = yPois(yLam(sb, sa + 1));
      yRec(Y[t].tab, A, B, ga, gb);
      if (A === me || B === me) { const gf = A === me ? ga : gb, gc = A === me ? gb : ga; Y[t].log.unshift([G.day, A === me ? B : A, gf, gc, A === me]); if (Y[t].log.length > 12) Y[t].log.length = 12; yPlayed(c, t, gf, gc); }
    }
  }
  // cup round
  const r = YCUP.wk.indexOf(wk);
  if (r >= 0 && !Y.cup.out && !Y.cup.won && Y.cup.rd === r) {
    const pool = Object.values(LG).filter(L => L.country === LG[c.lg].country).flatMap(L => G.lgm[L.id] || []).filter(x => x !== me);
    const opp = pick(pool.length ? pool : Y.cl.filter(x => x !== me)); yAuto(me, 'u18', true);
    const sm = yStrength(me, 'u18'), so = yOpp(opp, 'u18', r * 2);
    let gf = yPois(yLam(sm, so)), ga = yPois(yLam(so, sm)), pen = '';
    if (gf === ga) { const w = R() < .5; pen = w ? '（互射十二碼勝）' : '（互射十二碼負）'; if (w) gf += .1; else ga += .1; }
    const won = gf > ga; Y.cup.log.unshift([G.day, opp, Math.floor(gf), Math.floor(ga), YCUP.rd[r] + pen]); yPlayed(c, 'u18', gf, ga);
    if (won) { Y.cup.rd++; if (Y.cup.rd >= YCUP.rd.length) { Y.cup.won = true; c.fans = clamp(fansOf(c) + 3, 1, 100); G.mgr.rep = clamp(G.mgr.rep + 1, 1, 100); (G.trophies = G.trophies || []); mail('青年足總盃冠軍！', `你嘅 U18 喺決賽贏咗 ${esc(clubName(opp))}，捧走${YCUP.n}！球迷人氣 +3。`); } else mail(`${YCUP.n}：晉級${YCUP.rd[Y.cup.rd]}`, `U18 贏咗 ${esc(clubName(opp))} ${Math.floor(gf)}-${Math.floor(ga)}${pen}。`); }
    else { Y.cup.out = true; mail(`${YCUP.n}：${YCUP.rd[r]}出局`, `U18 輸咗俾 ${esc(clubName(opp))} ${Math.floor(gf)}-${Math.floor(ga)}${pen}。`); }
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
  const c = G.clubs[me]; c.yc = yNew(c, me); c.yap = {};
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

/* ---------- player preferences: a favourite tactic style and formation each (+1 rating each when the team uses it) ----------
   A player's attributes are his overall + a position profile + a fixed personal tilt (attrs in core.js); the style he
   likes is the one his strongest tilt suits. The formation comes from his position (a winger likes 4-3-3, a wing-back 3-5-2…). */
const PREFF = {
  GK: [], CD: ['4-4-2', '3-5-2', '5-3-2', '4-3-3'], RB: ['4-4-2', '4-3-3', '4-2-3-1'], LB: ['4-4-2', '4-3-3', '4-2-3-1'], RWB: ['3-5-2', '5-3-2', '3-4-3'], LWB: ['3-5-2', '5-3-2', '3-4-3'],
  DM: ['4-2-3-1', '4-1-2-1-2', '4-3-3'], CM: ['4-3-3', '4-4-2', '4-5-1'], RM: ['4-4-2', '4-5-1', '4-4-1-1'], LM: ['4-4-2', '4-5-1', '4-4-1-1'], AM: ['4-2-3-1', '4-1-2-1-2', '4-4-1-1'],
  RW: ['4-3-3', '4-2-3-1', '3-4-3'], LW: ['4-3-3', '4-2-3-1', '3-4-3'], CF: ['4-4-1-1', '4-2-3-1', '3-5-2'], ST: ['4-4-2', '3-5-2', '4-3-3'],
};
const PREFC = new Map();
function prefOf(pid) {
  if (PREFC.has(pid)) return PREFC.get(pid);
  const p = ps(pid), pos = p.pos, t = k => (hsh(p.name + '#' + k) % 11) - 5, L = lineOf(pos), wide = /^[RL]/.test(pos);
  const cand = pos === 'GK' ? [] : L === 'D' ? [['pos', t(4)], ['press', (t(0) + t(1)) / 2], ['bus', (t(3) + t(2)) / 2]]
    : L === 'M' ? [['pos', t(4)], ['press', (t(0) + t(1)) / 2], [wide ? 'wing' : 'counter', t(0)]]
    : [['counter', t(0)], ['wing', wide ? t(0) - .5 : t(6)], ['allout', t(5)], ['press', (t(0) + t(1)) / 2 - .5]];
  const best = cand.sort((a, b) => b[1] - a[1])[0];
  const fl = (PREFF[pos] || []).filter(f => FORMS[f]), form = fl.length ? fl[hsh(p.name + '@f') % fl.length] : null;
  const r = { tac: best && best[1] > 0 ? best[0] : 'bal', form };
  PREFC.set(pid, r); return r;
}
// per-player bonus in a match side: +1 his style, +1 his formation
function prefBonus(S, pid) {
  const c = G.clubs[S.cid], pr = prefOf(pid); let b = 0;
  if (c.tac && c.tac === pr.tac) b++;
  if (pr.form && S.form === pr.form) b++;
  return b;
}

/* ---------- chemistry 2: same nation, old team-mates, time together ----------
   For each player in the eleven, count links to the other ten: same nation +1, and a bond +1 if they came from the same
   club (the club in the season data) or have been at this club together for a year. 3+ links → +1, 6+ → +2, 9+ → +3. */
const origin = pid => /^[a-z]+\d?\.[a-z0-9]+\.\d+$/.test(pid) ? pid.replace(/\.\d+$/, '') : null;
const longHere = pid => { const d = pd(pid); return d.jd == null || G.day - d.jd >= 364; };
function chemLinks(pid, pids) {
  let nat = 0, bond = 0; const n = ps(pid).nat, o = origin(pid), lh = longHere(pid);
  for (const q of pids) { if (q === pid) continue; if (ps(q).nat === n) nat++; if ((o && origin(q) === o) || (lh && longHere(q))) bond++; }
  return { nat, bond, n: nat + bond };
}
function chemMap(pids) {
  const out = {};
  for (const p of pids) { const l = chemLinks(p, pids).n; out[p] = l >= 9 ? 3 : l >= 6 ? 2 : l >= 3 ? 1 : 0; }
  return out;
}

/* ---------- real youth squads (fm/data/<era>/youth.js, tools/fm-tm-youth.js) ----------
   A club with a real youth list gets those players in its youth team (U18 / U21) instead of made-up prospects.
   Old saves: the first load replaces the made-up prospects who never left the youth team. c.yseed marks it done. */
function seedYouth(cid) {
  const c = G.clubs[cid], rows = (FM.YOUTH || {})[cid]; if (!rows || c.yseed) return false;
  for (const p of roster(cid).filter(p => ps(p).pro && !ps(p).real && !ps(p).gacha && pd(p).yt)) {   // made-up prospects go
    ROS[cid] = roster(cid).filter(x => x !== p); delete G.pl[p]; delete G.y[p]; if (G.cards) delete G.cards[p];
    for (const t in c.yl || {}) c.yl[t].xi = c.yl[t].xi.map(x => x === p ? null : x);
  }
  const have = new Set(Object.values(G.y).map(y => y.name));
  rows.forEach(([name, pos, nat, by, sk, pot, team, no], k) => {
    if (have.has(name)) return;
    const pid = 'yr.' + cid + '.' + k;
    G.y[pid] = { no: 0, name, pos, nat, by, sk, sn: shortName(name), yth: 1, pro: 1, real: 1, pot, yteam: team };
    G.pl[pid] = newPl(cid, sk, G.season + 2, no || 0); G.pl[pid].yt = 1; G.pl[pid].w = Math.max(150, Math.round(wageFor(sk, c.lg, cid) * .25 / 10) * 10);
    (ROS[cid] = ROS[cid] || []).push(pid); G.cards = G.cards || {}; G.cards[pid] = 1; if (typeof skTrack === 'function') skTrack(pid);
  });
  c.yseed = 1;
  for (const t of ['u18', 'u21']) yAuto(cid, t, false);
  return true;
}

/* ---------- youth scout pool (球探抽卡 · 青年軍) ----------
   Each card is a 15–17-year-old who joins your youth team. Most are made-up prospects (the grade is their potential);
   a few are a legend as a teenager ('J<legend index>', potential = his legend rating), one of each at most.
   The card grade of a gacha youngster is the pulled grade (G.y[pid].gg) until his ability grade passes it. */
const YGPOT = { UR: [90, 96], SSR: [85, 89], SR: [78, 84], R: [70, 77], C: [60, 69] };
const YGLEG = .3;   // chance that an SR / SSR / UR youth card is a young legend (when one is left in the pool)
const YGNAT = ['ENG', 'ENG', 'ESP', 'ITA', 'GER', 'FRA', 'NED', 'POR', 'SCO'];
const GRANK = { C: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
const yLegIds = () => legendIds().map(id => 'J' + id.slice(1));
const yLegRow = jid => FM.LEGENDS[+jid.slice(1)];
// young legends left to pull, by grade (o.line / o.nat filter)
function yLegPool(o = {}) {
  const pool = { UR: [], SSR: [], SR: [], R: [], C: [] };
  for (const j of yLegIds()) { const L = yLegRow(j); if (G.y[j]) continue; if ((o.line && lineOf(L[1]) !== o.line) || (o.nat && L[2] !== o.nat)) continue; pool[gradeP(L[3], L[1])].push(j); }
  return pool;
}
function yJoin(pid, me, sk) {
  G.pl[pid] = newPl(me, sk, G.season + 3, 0); G.pl[pid].yt = 1; G.pl[pid].jd = G.day;
  G.pl[pid].w = Math.max(150, Math.round(wageFor(sk, G.clubs[me].lg, me) * .3 / 10) * 10);
  (ROS[me] = ROS[me] || []).push(pid); if (typeof skTrack === 'function') skTrack(pid);
}
function makeYouthCard(g, o, me) {
  const [lo, hi] = YGPOT[g], pot = ri(lo, hi), nat = o.nat || pick(YGNAT);
  let pos = pick(YPOS); for (let k = 0; k < 20 && o.line && lineOf(pos) !== o.line; k++) pos = pick(YPOS);
  const age = ri(15, 17), sk = clamp(pot - ri(22, 32) + (age - 15) * 2, 38, 66);
  const pid = 'y' + G.nid++, name = youthName(nat);
  G.y[pid] = { no: 0, name, pos, nat, by: G.season - age, sk, sn: shortName(name), yth: 1, pro: 1, gacha: 1, pot, gg: g };
  yJoin(pid, me, sk); return pid;
}
function makeYoungLegend(j, me) {
  const L = yLegRow(j), age = ri(16, 17), sk = clamp(L[3] - ri(20, 26), 45, 74);
  G.y[j] = { no: 0, name: L[0], pos: L[1], nat: L[2], by: G.season - age, sk, sn: L[6] || shortName(L[0]), yth: 1, pro: 1, gacha: 1, yl: 1, pot: Math.min(L[3], 99), gg: gradeP(L[3], L[1]), ls: L[4], lc: L[5] };
  yJoin(j, me, sk); return j;
}
// real youth players of other clubs (fm/data/<era>/youth.js), 18 or under this season, by the grade of their potential
const potGrade = pot => pot >= 90 ? 'UR' : pot >= 85 ? 'SSR' : pot >= 78 ? 'SR' : pot >= 70 ? 'R' : 'C';
const YGREAL = .45;   // chance that a youth card is a real youth player of that grade (eras with youth.js)
function yRealPool(o = {}) {
  const pool = { UR: [], SSR: [], SR: [], R: [], C: [] }, me = G.mgr.cid, have = new Set(Object.values(G.y).map(y => y.name));
  for (const [cid, rows] of Object.entries(FM.YOUTH || {})) {
    if (cid === me || !G.clubs[cid]) continue;
    rows.forEach(([name, pos, nat, by, sk, pot], k) => {
      if (G.season - by > 18 || have.has(name) || G.y['yr.' + cid + '.' + k]) return;
      if ((o.line && lineOf(pos) !== o.line) || (o.nat && nat !== o.nat)) return;
      pool[potGrade(pot)].push(cid + '|' + k);
    });
  }
  return pool;
}
function makeRealYouth(key, me) {
  const [cid, k] = key.split('|'), [name, pos, nat, by, sk, pot] = FM.YOUTH[cid][+k], pid = 'yr.' + cid + '.' + k;
  G.y[pid] = { no: 0, name, pos, nat, by, sk, sn: shortName(name), yth: 1, pro: 1, real: 1, gacha: 1, pot, gg: potGrade(pot), yfrom: cid };
  yJoin(pid, me, sk); return pid;
}
function youthPull(n, o, cost) {
  const me = G.mgr.cid, sc = G.clubs[me].st.scout, out = [], lp = yLegPool(o), rp = yRealPool(o);
  fin(me, 'scout', -cost);
  for (let k = 0; k < n; k++) {
    const r = R() * 100; let acc = 0, g = 'C';
    for (const [gr, p] of GRATES) { acc += gr === 'C' ? p - sc * 1.5 : gr === 'SR' ? p + sc * 1.5 : p; if (r < acc) { g = gr; break; } }
    if (n === 10 && k === 9 && !out.some(x => GRANK[x.g] >= 2)) g = R() < .03 ? 'UR' : R() < .23 ? 'SSR' : 'SR';
    const left = lp[g].filter(j => !G.y[j]);
    const real = rp[g].filter(x => !out.some(q => q.key === x));
    let pid, key = null;
    if (GRANK[g] >= 2 && left.length && R() < YGLEG) pid = makeYoungLegend(pick(left), me);
    else if (real.length && R() < YGREAL) { key = pick(real); pid = makeRealYouth(key, me); }
    else pid = makeYouthCard(g, o, me);
    G.cards = G.cards || {}; G.cards[pid] = (G.cards[pid] || 0) + 1;
    out.push({ pid, g, from: 'yth', n: 1, yl: !!G.y[pid].yl, key, rf: G.y[pid].yfrom || null });
  }
  G.stats.pulls += n;
  return { out, cost };
}
