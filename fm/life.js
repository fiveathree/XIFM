/* =====================================================================
   CLUB LIFE: staff hiring, individual training, team building, media (press conferences, statements),
   club promotion, player promotion, star players.
   Loaded after match.js, before ui.js. Uses core.js / match.js globals.

   Club fields (stored as is in the save; missing on old saves → defaults at read time):
     c.st.<role>   staff levels 0–5 (coach physio scout from core; fit gk yth pr added here)
     c.staff       { role: { n: name, nat, lv } }  the person in each job (user club only)
     c.cand        { d: day made, l: { role: [candidate…] } }  job applicants, refreshed monthly
     c.coh         team cohesion 0–100 (default 60 = no effect)
     c.fans        fan popularity 0–100 (default = club rep = no effect)
     c.cd          { action: day it can be used again }  cooldowns
     c.promo       [{ k, end, pid? }]  running campaigns
     c.idle        { pid: weeks without a game }  for unhappy stars
     c.lap         { pid: appearances at last check }
   Player fields (packed 20–22): d.pop 人氣 0–100, d.p2x learned positions 'CM|AM', d.tf individual training 'pos:CM:40' | 'grow' | 'rest'
   G.mot = { i: fixture id, h: %, a: % }  pre-match motivation from the press conference
   ===================================================================== */

/* ---------- popularity & stars ---------- */
function basePop(pid) {
  const d = pd(pid), c = G.clubs[d.c];
  return clamp(Math.round((d.sk - 60) * 2.2 + (c ? c.rep : 30) * .35 - 12), 1, 99);
}
const popOf = pid => { const d = pd(pid); return Math.round(d.pop ?? basePop(pid)); };
const STARN = ['', '明星', '巨星'];
const starOf = pid => { const p = popOf(pid); return p >= 85 ? 2 : p >= 70 ? 1 : 0; };
const fansOf = c => c.fans ?? c.rep;
const cohOf = c => c.coh ?? 60;

/* ---------- learned positions ---------- */
const learned = pid => { const d = pd(pid); return d && d.p2x ? d.p2x.split('|').filter(Boolean) : []; };
const pos2P = pid => [...new Set([...pos2Of(ps(pid)), ...learned(pid)])].filter(x => x !== ps(pid).pos);

/* ---------- match effect: cohesion + press-conference motivation ---------- */
function lifeF(S, M) {
  const c = G.clubs[S.cid]; let f = 1 + (cohOf(c) - 60) / 1500;
  if (G.mot && M.f && G.mot.i === M.f.i) f += (G.mot[S.key] || 0) / 100;
  return f;
}

/* ---------- staff ---------- */
const STAFFR = {
  coach: ['教練', '提升訓練效果，所有球員進步快啲，學新位置都快啲。'],
  fit: ['體能教練', '每日多回復少少體能，訓練受傷機會低啲。'],
  physio: ['物理治療師', '傷癒快啲，每日體能回復多啲。'],
  gk: ['守門員教練', '門將進步快啲（30 歲或以下）。'],
  yth: ['青訓教練', '21 歲或以下嘅球員進步快啲。'],
  scout: ['球探', '抽卡時 SR 機率上升、C 機率下降（每級 ±1.5%）。'],
  pr: ['公關主任', '記者會、新聞稿同宣傳活動嘅正面效果大啲。'],
};
const stLv = (c, k) => (c.st && c.st[k]) || 0;
const SNAMES = {
  ENG: [['John', 'Steve', 'Gary', 'Paul', 'Mark', 'Kevin', 'Brian', 'Tony', 'Mike', 'Chris', 'Jack', 'Harry', 'Oliver', 'James', 'Callum', 'Ryan', 'Lewis', 'Jordan', 'Tom', 'Ben', 'Sam', 'Luke', 'Dan', 'Kyle'], ['Taylor', 'Walker', 'Clarke', 'Hughes', 'Wright', 'Turner', 'Barnes', 'Fletcher', 'Mills', 'Cooper', 'Bennett', 'Harris', 'Ward', 'Morgan', 'Price', 'Russell', 'Holmes', 'Shaw', 'Lloyd', 'Hunt', 'Palmer', 'Webb', 'Riley', 'Spencer', 'Bailey', 'Foster', 'Marsh', 'Chapman']],
  ESP: [['Carlos', 'José', 'Javier', 'Luis', 'Miguel', 'Pablo', 'Rafael', 'Andrés'], ['García', 'Martínez', 'López', 'Sánchez', 'Fernández', 'Ruiz', 'Moreno', 'Navarro']],
  ITA: [['Marco', 'Luca', 'Giovanni', 'Paolo', 'Roberto', 'Stefano', 'Andrea', 'Fabio'], ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Ricci', 'Conti', 'Galli']],
  GER: [['Thomas', 'Michael', 'Stefan', 'Jürgen', 'Andreas', 'Markus', 'Uwe', 'Ralf'], ['Müller', 'Schmidt', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter']],
  FRA: [['Pierre', 'Jean', 'Laurent', 'Didier', 'Olivier', 'Christophe', 'Philippe', 'Éric'], ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Lefèvre', 'Roux', 'Fournier']],
  NED: [['Jan', 'Pieter', 'Ruud', 'Frank', 'Marco', 'Erik', 'Dennis', 'Ronald'], ['de Jong', 'Jansen', 'de Vries', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Mulder']],
  POR: [['João', 'Rui', 'Nuno', 'Paulo', 'Pedro', 'Tiago', 'Hugo', 'Bruno'], ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Costa', 'Oliveira', 'Rodrigues', 'Sousa']],
  SCO: [['Alex', 'Craig', 'Ally', 'Gordon', 'Kenny', 'Walter'], ['McLeish', 'Smith', 'Brown', 'Stewart', 'Robertson', 'Campbell']],
};
function staffName(nat) { const L = SNAMES[nat] || SNAMES.ENG; return pick(L[0]) + ' ' + pick(L[1]); }
const staffFee = (lv, c) => Math.round(lv * lv * 4e4 * (TIERF[c.lg] || .7) / 1e3) * 1e3;
const staffWage = (lv, c) => Math.round(lv * lv * 350 * (TIERF[c.lg] || .7));
function staffNat(c) { const n = (CL[myCid()] || {}).country; return SNAMES[n] && R() < .65 ? n : pick(Object.keys(SNAMES)); }
function staffOf(c, k) {   // the person in a job (old saves had levels only: give them a name)
  c.staff = c.staff || {};
  const lv = stLv(c, k); if (!lv) { delete c.staff[k]; return null; }
  if (!c.staff[k] || c.staff[k].lv !== lv) { const nat = staffNat(c); c.staff[k] = { n: staffName(nat), nat, lv }; }
  return c.staff[k];
}
function staffCands(c) {
  if (!c.cand || G.day - c.cand.d >= 28) {
    const l = {};
    for (const k in STAFFR) {
      const cur = stLv(c, k), top = clamp(Math.round(c.rep / 20) + 1, 2, 5);   // big clubs attract better staff
      l[k] = [0, 1, 2].map(() => { const lv = clamp(ri(Math.max(1, cur - 1), Math.max(cur + 1, top)), 1, 5), nat = staffNat(c); return { n: staffName(nat), nat, lv }; })
        .sort((a, b) => b.lv - a.lv);
    }
    c.cand = { d: G.day, l };
  }
  return c.cand.l;
}
function hireStaff(k, i) {
  const c = myClub(), cand = staffCands(c)[k][i]; if (!cand) return '搵唔到呢個人';
  const fee = staffFee(cand.lv, c), old = stLv(c, k), comp = old ? Math.round(staffFee(old, c) / 2) : 0;
  if (!G.inf && c.cash < fee + comp) return '資金唔夠';
  fin(myCid(), 'staff', -(fee + comp));
  c.st[k] = cand.lv; c.staff = c.staff || {}; c.staff[k] = cand;
  c.cand.l[k] = c.cand.l[k].filter(x => x !== cand);
  mail(`${STAFFR[k][0]}上任`, `${esc(cand.n)}（${esc(natName(cand.nat))}，${'★'.repeat(cand.lv)}）正式出任${STAFFR[k][0]}。簽約費 ${money(fee)}${comp ? `，賠償前任 ${money(comp)}` : ''}。`);
  return null;
}
function fireStaff(k) {
  const c = myClub(), lv = stLv(c, k); if (!lv) return;
  const comp = Math.round(staffFee(lv, c) / 2);
  fin(myCid(), 'staff', -comp); c.st[k] = 0; if (c.staff) delete c.staff[k];
  return comp;
}

/* ---------- individual training ---------- */
const TFN = { '': '跟大隊', grow: '加操', rest: '休養', pos: '學新位置' };
function tfOf(pid) { const s = pd(pid).tf || ''; const [k, pos, pr] = s.split(':'); return { k: k || '', pos: pos || null, pr: +pr || 0 }; }
function setTf(pid, k, pos) { const d = pd(pid); d.tf = k === 'pos' ? `pos:${pos}:${tfOf(pid).k === 'pos' && tfOf(pid).pos === pos ? tfOf(pid).pr : 0}` : k; if (!d.tf) delete d.tf; }
const canLearn = pid => Object.keys(POSN).filter(q => q !== 'GK' && ps(pid).pos !== 'GK' && !pos2P(pid).includes(q) && q !== ps(pid).pos);

/* ---------- weekly: training extras, popularity, cohesion, stars, campaigns ---------- */
function lifeWeekly() {
  const me = G.mgr.cid;
  for (const cid of GCL()) {
    const c = G.clubs[cid], gk = stLv(c, 'gk'), yth = stLv(c, 'yth'), coach = stLv(c, 'coach');
    for (const pid of roster(cid)) {
      const d = pd(pid), a = ageOf(pid);
      if (gk && ps(pid).pos === 'GK' && a <= 30 && R() < .012 * gk) d.sk = Math.min(97, d.sk + 1);
      if (yth && a <= 21 && R() < .01 * yth * (d.yt ? 1.5 : 1)) d.sk = Math.min(97, d.sk + 1);
      // popularity drifts towards what skill, club and recent games suggest
      const f = form(pid), tgt = clamp(basePop(pid) + (f ? (f - 6.6) * 8 : 0) + Math.min(12, (d.s.gl || 0) * .6 + (d.s.mom || 0) * 1.5), 1, 99);
      d.pop = Math.round((popOf(pid) + (tgt - popOf(pid)) * .08) * 10) / 10;
      if (!d.tf) continue;
      const t = tfOf(pid);
      if (t.k === 'grow') { if (a <= 28 && R() < .025 + coach * .004) d.sk = Math.min(97, d.sk + 1); d.cond = Math.max(40, d.cond - 6); if (R() < .006 * (1 - stLv(c, 'fit') * .12)) { d.lin = ri(3, 7); d.injn = '加操拉傷'; if (cid === me) mail(`${ps(pid).sn} 加操拉傷`, `${esc(ps(pid).name)} 加操時拉傷，${d.lin} 日內表現受影響。`); } }
      else if (t.k === 'rest') d.cond = Math.min(100, d.cond + 8);
      else if (t.k === 'pos' && t.pos) {
        const pr = t.pr + Math.round(6 + coach * 2 + (a <= 23 ? 3 : a >= 31 ? -3 : 0) + (NEARP[ps(pid).pos] && NEARP[ps(pid).pos][t.pos] >= .9 ? 4 : 0));
        if (pr >= 100) { d.p2x = [...learned(pid), t.pos].join('|'); delete d.tf; if (cid === me) mail(`${ps(pid).sn} 學識踢${POSN[t.pos]}`, `${esc(ps(pid).name)} 完成位置訓練，${POSN[t.pos]}（${t.pos}）而家係佢嘅次位置，踢呢個位唔會扣能力。`); }
        else d.tf = `pos:${t.pos}:${pr}`;
      }
    }
  }
  if (!me) return;
  const c = G.clubs[me];
  // cohesion: settles slowly towards 70; team building pushes it higher for a while
  c.coh = clamp(cohOf(c) + (cohOf(c) < 70 ? .8 : -1), 0, 100);
  c.fans = clamp(fansOf(c) + (c.rep - fansOf(c)) * .02, 1, 100);
  // campaigns
  c.promo = (c.promo || []).filter(p => {
    const P = PROMO[p.k] || PPROMO[p.k]; if (P && P.wk) P.wk(c, p);
    if (G.day >= p.end) { if (P) mail(`${P.n}完結`, `「${P.n}」${p.pid ? `（${esc(ps(p.pid).sn)}）` : ''}已經完結。`); return false; }
    return true;
  });
  // stars want to play
  c.idle = c.idle || {}; c.lap = c.lap || {};
  for (const pid of roster(me)) {
    const d = pd(pid), ap = d.s.ap || 0;
    c.idle[pid] = ap > (c.lap[pid] ?? ap) || d.inj ? 0 : (c.idle[pid] || 0) + 1; c.lap[pid] = ap;
    if (starOf(pid) && c.idle[pid] >= 3 && c.idle[pid] % 2 === 1) {
      d.arw = Math.max(0, (d.arw ?? 2) - 1); d.pop = Math.max(1, popOf(pid) - 2); c.coh = clamp(cohOf(c) - 2, 0, 100);
      mail(`${ps(pid).sn} 唔滿冇得踢`, `${STARN[starOf(pid)]} ${esc(ps(pid).name)} 已經 ${c.idle[pid]} 個星期冇上陣，公開表示不滿。狀態同球隊默契都受影響。${c.idle[pid] >= 7 ? '佢話再冇得踢就要求轉會。' : ''}`);
    }
  }
  for (const k in c.idle) if (!G.pl[k] || pd(k).c !== me) { delete c.idle[k]; delete c.lap[k]; }
}
// extra weekly merchandise from fans and stars (core's weekly() calls this per club)
function lifeMerch(cid) {
  const c = G.clubs[cid], f = clamp(1 + (fansOf(c) - c.rep) / 120, .6, 1.6);
  let star = 0; for (const pid of roster(cid)) { const p = popOf(pid); if (p > 65) star += (p - 65) ** 2 * 60; }
  let boost = 0; for (const p of c.promo || []) if (p.k === 'kit') boost += .3; else if (p.k === 'shirt' && G.pl[p.pid] && pd(p.pid).c === cid) star += popOf(p.pid) ** 2 * 8;
  return { f, star: Math.round(star), boost };
}
const lifeGate = cid => { const c = G.clubs[cid]; return (fansOf(c) - c.rep) / 250 + roster(cid).filter(p => starOf(p)).length * .008; };

/* ---------- team building ---------- */
const TEAMB = {
  dinner: { n: '球隊聚餐', cost: 2e4, cd: 14, d: '默契 +4，三成球員狀態升一級。', go(c, me) { c.coh = clamp(cohOf(c) + 4, 0, 100); moodAll(me, .3, 1); } },
  bond: { n: '戶外拓展訓練', cost: 1.5e5, cd: 45, d: '默契 +10，全隊體能 −5。', go(c, me) { c.coh = clamp(cohOf(c) + 10, 0, 100); for (const p of roster(me)) pd(p).cond = Math.max(40, pd(p).cond - 5); } },
  camp: { n: '海外集訓營', cost: 6e5, cd: 120, d: '默契 +15，六成球員狀態升一級，全隊體能 −8；後生球員有機會進步。', go(c, me) { c.coh = clamp(cohOf(c) + 15, 0, 100); moodAll(me, .6, 1); for (const p of roster(me)) { pd(p).cond = Math.max(40, pd(p).cond - 8); if (ageOf(p) <= 23 && R() < .25) pd(p).sk++; } } },
  charity: { n: '社區慈善日', cost: 5e4, cd: 30, d: '球迷人氣 +3，領隊聲望 +1，默契 +3。', go(c, me) { c.fans = clamp(fansOf(c) + 3 * prF(c), 1, 100); G.mgr.rep = clamp(G.mgr.rep + 1, 1, 100); c.coh = clamp(cohOf(c) + 3, 0, 100); } },
};
const tierCost = (c, v) => Math.round(v * (TIERF[c.lg] || .7) / 1e3) * 1e3;
const prF = c => 1 + stLv(c, 'pr') * .1;
function moodAll(cid, share, step) { for (const p of roster(cid)) if (R() < share) pd(p).arw = clamp((pd(p).arw ?? 2) + step, 0, 4); }
const cdLeft = (c, k) => Math.max(0, ((c.cd || {})[k] || 0) - G.day);
function doTeamB(k) {
  const c = myClub(), T = TEAMB[k], cost = tierCost(c, T.cost);
  if (cdLeft(c, k)) return `仲要等 ${cdLeft(c, k)} 日`;
  if (!G.inf && c.cash < cost) return '資金唔夠';
  fin(myCid(), 'pr', -cost); T.go(c, myCid()); c.cd = c.cd || {}; c.cd[k] = G.day + T.cd;
  return null;
}

/* ---------- club promotion ---------- */
const PROMO = {
  local: { n: '本地宣傳', cost: 1e5, wks: 4, d: '4 個星期，每星期球迷人氣 +1。', wk(c) { c.fans = clamp(fansOf(c) + 1 * prF(c), 1, 100); } },
  social: { n: '社交媒體推廣', cost: 2.5e5, wks: 6, d: '6 個星期，每星期球迷人氣 +1.2，人氣最高三個球員人氣上升。', wk(c) { c.fans = clamp(fansOf(c) + 1.2 * prF(c), 1, 100); for (const p of roster(myCid()).sort((a, b) => popOf(b) - popOf(a)).slice(0, 3)) pd(p).pop = Math.min(99, popOf(p) + .8); } },
  kit: { n: '新球衣發佈', cost: 3e5, wks: 8, d: '8 個星期，商品收入 +30%。' },
  tour: { n: '海外巡迴賽', cost: 0, wks: 0, d: '只可以喺 7 月季前做，每季一次：即收出場費，球迷人氣 +6，默契 +4，但全隊體能 −10。', once: 1 },
};
function doPromo(k) {
  const c = myClub(), P = PROMO[k], cost = tierCost(c, P.cost);
  if (k === 'tour') {
    if (dd(G.day).getUTCMonth() !== 6) return '海外巡迴賽只可以喺 7 月做';
    if ((c.cd || {}).tour === G.season) return '今季已經去過巡迴';
    const fee = Math.round(c.rep ** 2 * 150 * (1 + starTotal(myCid()) * .1) / 1e4) * 1e4;
    fin(myCid(), 'spon', fee); c.fans = clamp(fansOf(c) + 6 * prF(c), 1, 100); c.coh = clamp(cohOf(c) + 4, 0, 100);
    for (const p of roster(myCid())) pd(p).cond = Math.max(40, pd(p).cond - 10);
    c.cd = c.cd || {}; c.cd.tour = G.season;
    mail('海外巡迴賽完成', `球隊完成季前海外巡迴，收到出場費 ${money(fee)}，多咗好多海外球迷。`); return null;
  }
  if ((c.promo || []).some(p => p.k === k)) return '呢個宣傳仲做緊';
  if (!G.inf && c.cash < cost) return '資金唔夠';
  fin(myCid(), 'pr', -cost); (c.promo = c.promo || []).push({ k, end: G.day + P.wks * 7 });
  return null;
}
const starTotal = cid => roster(cid).reduce((s, p) => s + starOf(p), 0);

/* ---------- player promotion ---------- */
const PPROMO = {
  ad: { n: '商業代言', s: '代言', d: '球會即收代言費（分成按人氣計），人氣 +3，球員開心（狀態升一級），但體能 −5。每個球員 60 日一次。', cd: 60 },
  feat: { n: '專訪特輯', s: '專訪', cost: 3e4, d: '人氣 +6。每個球員 30 日一次。', cd: 30 },
  shirt: { n: '球衣主打', s: '球衣', cost: 1e5, wks: 8, d: '8 個星期，佢件球衣帶嚟額外商品收入（人氣越高越多），人氣 +2。全隊同一時間得一個。', cd: 60 },
};
function doPPromo(pid, k) {
  const c = myClub(), P = PPROMO[k], d = pd(pid), key = k + ':' + pid, cost = tierCost(c, P.cost || 0);
  if (cdLeft(c, key)) return `${ps(pid).sn} 仲要等 ${cdLeft(c, key)} 日`;
  if (k === 'shirt' && (c.promo || []).some(p => p.k === 'shirt')) return '已經有球員做緊球衣主打';
  if (!G.inf && c.cash < cost) return '資金唔夠';
  if (cost) fin(myCid(), 'pr', -cost);
  if (k === 'ad') { const fee = Math.round(popOf(pid) ** 2 * 60 * prF(c) / 1e3) * 1e3; fin(myCid(), 'spon', fee); d.pop = Math.min(99, popOf(pid) + 3); d.arw = clamp((d.arw ?? 2) + 1, 0, 4); d.cond = Math.max(40, d.cond - 5); mail(`${ps(pid).sn} 拍廣告`, `${esc(ps(pid).name)} 接咗一個代言，球會分到 ${money(fee)}。`); }
  if (k === 'feat') d.pop = Math.min(99, popOf(pid) + 6 * prF(c));
  if (k === 'shirt') { d.pop = Math.min(99, popOf(pid) + 2); (c.promo = c.promo || []).push({ k, pid, end: G.day + P.wks * 7 }); }
  c.cd = c.cd || {}; c.cd[key] = G.day + P.cd;
  return null;
}

/* ---------- media: press conference before each competitive match ---------- */
// effects: m team mood (share of players whose form arrow moves), f fans, b board confidence, r manager reputation,
//          s our motivation % for this match, o opponent motivation %, p { pid, arw, pop }, c cohesion
function pressFx() {   // the next user fixture a press conference can be held for (from 3 days before)
  const me = G.mgr.cid; if (!me) return null;
  const f = nextFx(me); if (!f || f.d - G.day > 3 || f.hg != null) return null;
  const c = G.clubs[me]; if ((c.press || 0) === f.i) return null;
  return f;
}
function pressQs(f) {
  const me = G.mgr.cid, c = G.clubs[me], opp = f.h === me ? f.a : f.h, oc = G.clubs[opp], on = esc(clubName(opp));
  const big = oc.rep >= c.rep + 5, weak = oc.rep <= c.rep - 12;
  const res = clubFx(me).filter(x => x.hg != null).slice(-3).map(x => resOf(x, me)), losing = res.filter(r => r === 'L').length >= 2, winning = res.length === 3 && res.every(r => r === 'W');
  const star = roster(me).filter(p => avail(p)).sort((a, b) => popOf(b) - popOf(a))[0];
  const Q = [];
  Q.push(big ? { q: `${on} 實力喺你哋之上，你有冇信心？`, a: [
      ['我哋唔怕任何人，一定係去贏。', { s: 1.5, o: 1, f: 2, m: [.3, 1] }],
      ['佢哋係熱門，我哋盡力爭取分數。', { s: .5, b: 1 }],
      ['邊個贏都唔出奇，足球係圓嘅。', { r: .5 }]] }
    : weak ? { q: `今場對手 ${on} 紙面上弱過你哋，會唔會輕敵？`, a: [
      ['唔會，每場都當決賽咁踢。', { s: 1, c: 2 }],
      ['我哋實力明顯好啲，應該贏。', { s: .5, o: 1.5, f: 1 }],
      ['我會輪換俾後備機會。', { m: [.25, 1], s: -.5 }]] }
    : { q: `你點睇今場對 ${on}？`, a: [
      ['勢均力敵，細節決定勝負。', { s: .5 }],
      ['我哋喺主場／作客都要攞三分。', { s: 1, b: 1, o: .5 }],
      ['佢哋有幾個好危險嘅球員，我哋要小心。', { o: -.5, r: .5 }]] });
  Q.push(losing ? { q: '最近成績唔好，你會唔會擔心份工？', a: [
      ['我對球隊有信心，好快會扭轉局面。', { b: 2, m: [.3, 1], f: 1 }],
      ['我會負全責，球員已經盡力。', { m: [.4, 1], c: 3, b: -1 }],
      ['有啲球員表現未達標，要反省。', { m: [.4, -1], b: 1, s: 1 }]] }
    : winning ? { q: '連勝之下，你哋係咪爭標熱門？', a: [
      ['我哋目標就係冠軍。', { f: 3, b: 2, o: 1, s: .5 }],
      ['一場一場嚟，唔想諗咁遠。', { c: 2, r: .5 }],
      ['我哋仲有好多要改善。', { s: 1, m: [.2, -1] }]] }
    : { q: '球迷對今季有咩可以期待？', a: [
      ['我哋會踢得好睇，贏多啲波。', { f: 2, b: 1 }],
      ['我哋喺建立緊一支有競爭力嘅球隊，要時間。', { b: -1, c: 2, r: .5 }],
      ['唔好俾太大壓力球員。', { m: [.3, 1] }]] });
  if (star) Q.push({ q: `${esc(ps(star).sn)} 最近好受注目，你點評價佢？`, a: [
      ['佢係世界級球員，係我哋嘅核心。', { p: { pid: star, arw: 1, pop: 3 }, c: -1, f: 1 }],
      ['佢係好球員，但足球係團隊運動。', { c: 2, p: { pid: star, pop: -1 } }],
      ['佢仲有進步空間，我對佢要求好高。', { p: { pid: star, arw: R() < .5 ? 1 : -1 }, r: .5 }]] });
  return Q;
}
function pressApply(f, picks) {
  const me = G.mgr.cid, c = G.clubs[me], key = f.h === me ? 'h' : 'a', ok = key === 'h' ? 'a' : 'h';
  const k = prF(c), mot = { i: f.i, h: 0, a: 0 }, out = [];
  for (const e of picks) {
    if (e.s) mot[key] += e.s * (e.s > 0 ? k : 1); if (e.o) mot[ok] += e.o;
    if (e.f) c.fans = clamp(fansOf(c) + e.f * (e.f > 0 ? k : 1), 1, 100);
    if (e.b) c.conf = clamp(c.conf + e.b * (e.b > 0 ? k : 1), 0, 100);
    if (e.r) G.mgr.rep = clamp(G.mgr.rep + e.r * k, 1, 100);
    if (e.c) c.coh = clamp(cohOf(c) + e.c * (e.c > 0 ? k : 1), 0, 100);
    if (e.m) moodAll(me, e.m[0], e.m[1]);
    if (e.p && G.pl[e.p.pid]) { const d = pd(e.p.pid); if (e.p.arw) d.arw = clamp((d.arw ?? 2) + e.p.arw, 0, 4); if (e.p.pop) d.pop = clamp(popOf(e.p.pid) + e.p.pop, 1, 99); }
  }
  mot.h = clamp(mot.h, -3, 4); mot.a = clamp(mot.a, -3, 4); G.mot = mot; c.press = f.i;
  if (mot[key]) out.push(`球員鬥志 ${mot[key] > 0 ? '+' : ''}${mot[key].toFixed(1)}%`);
  if (mot[ok]) out.push(`對手鬥志 ${mot[ok] > 0 ? '+' : ''}${mot[ok].toFixed(1)}%`);
  return out;
}

/* ---------- media: statements (新聞稿), one every 14 days ---------- */
const STATE = {
  back: { n: '公開力撐一位球員', d: '揀一位球員：佢狀態升兩級、人氣 +3；其他球員有少少妒忌（默契 −1）。', pid: 1 },
  crit: { n: '公開批評一位球員', d: '揀一位球員：佢狀態跌一級；其餘球員有警惕（四成人狀態升一級）。明星球員會好唔開心。', pid: 1 },
  aim: { n: '宣布衝擊更高目標', d: '董事局預期名次提高一級（更難達標），但董事局信心 +4、球迷人氣 +4。' },
  calm: { n: '降低外界期望', d: '董事局信心 −2，但球員壓力細咗：默契 +4，三成人狀態升一級。' },
  fans: { n: '多謝球迷支持', d: '球迷人氣 +2。' },
};
function doStatement(k, pid) {
  const c = myClub(), me = myCid(), kf = prF(c);
  if (cdLeft(c, 'state')) return `下一份新聞稿要等 ${cdLeft(c, 'state')} 日`;
  if (STATE[k].pid && !pid) return '揀一位球員先';
  if (k === 'back') { const d = pd(pid); d.arw = clamp((d.arw ?? 2) + 2, 0, 4); d.pop = clamp(popOf(pid) + 3 * kf, 1, 99); c.coh = clamp(cohOf(c) - 1, 0, 100); }
  if (k === 'crit') { const d = pd(pid); d.arw = clamp((d.arw ?? 2) - 1, 0, 4); moodAll(me, .4, 1); if (starOf(pid)) { d.pop = clamp(popOf(pid) - 3, 1, 99); c.coh = clamp(cohOf(c) - 4, 0, 100); mail(`${ps(pid).sn} 唔滿被批評`, `${STARN[starOf(pid)]} ${esc(ps(pid).name)} 對你公開批評佢好唔滿，更衣室氣氛緊張。`); } }
  if (k === 'aim') { c.exp = Math.max(1, c.exp - 1); c.conf = clamp(c.conf + 4 * kf, 0, 100); c.fans = clamp(fansOf(c) + 4 * kf, 1, 100); }
  if (k === 'calm') { c.conf = clamp(c.conf - 2, 0, 100); c.coh = clamp(cohOf(c) + 4 * kf, 0, 100); moodAll(me, .3, 1); }
  if (k === 'fans') c.fans = clamp(fansOf(c) + 2 * kf, 1, 100);
  c.cd = c.cd || {}; c.cd.state = G.day + 14;
  news(`${clubName(me)} 發表聲明：${STATE[k].n}${pid ? `（${ps(pid).sn}）` : ''}`);
  return null;
}

/* ---------- ability record and lasting injuries ----------
   Tracked for players who have been in your squad (keeps the save small):
   d.skc = { a: ability at the start of the tracked season, j: lost to injuries so far }
   d.skh = [[season, start, training & games, injuries, age, playing time, form, end], …] (last 15 seasons) */
function skTrack(pid) { const d = pd(pid); if (d && !d.skc) d.skc = { a: d.sk, j: 0 }; }
// a long injury can leave a mark: from about 4 weeks out, more likely the longer and the older; a better physio helps
function injuryToll(pid, days, physio) {
  if (days < 25) return 0;
  const d = pd(pid), a = ageOf(pid);
  if (R() > clamp((days - 18) / 45, .12, .85) * (1 - (physio || 0) * .1)) return 0;
  const loss = (days >= 45 ? ri(1, 3) : 1) + (a >= 30 && R() < .5 ? 1 : 0);
  d.sk = Math.max(25, d.sk - loss);
  if (d.skc) d.skc.j += loss;
  if (isUser(d.c)) mail(`${ps(pid).sn} 傷勢影響能力`, `${esc(ps(pid).name)} 嘅${esc(d.injn || '傷勢')}好嚴重，要休息 ${days} 日。醫療團隊估計就算傷癒，佢嘅能力都會永久下跌 ${loss}（而家 ${d.sk}）。`);
  return loss;
}
// end of season: playing time decides how much a young player (23 or under next season) grows
function playBonus(pid, a, share) {
  if (a > 23 || pd(pid).c === 'free') return 0;
  const yap = (G.clubs[pd(pid).c]?.yap || {})[pid] || 0;   // U18 / U21 / youth cup games count as football too
  if (pd(pid).yt || yap >= 15) share = Math.max(share, .4); else if (yap >= 8) share = Math.max(share, .2);
  return share >= .6 ? 2 : share >= .35 ? 1 : share < .1 ? -1 : 0;
}
