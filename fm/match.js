/* =====================================================================
   XIFM 經理生涯 — match engine (minute by minute, same engine for every game)
   ===================================================================== */
'use strict';

const INJN = ['腿筋拉傷', '腳踝扭傷', '膝傷', '腹股溝拉傷', '小腿拉傷', '大腿撞傷', '背傷', '腳趾骨裂', '肩膊脫臼', '十字韌帶撕裂'];
const SEG = [{ b: 0, len: 45 }, { b: 45, len: 45 }, { b: 90, len: 15 }, { b: 105, len: 15 }];

const MAXSUBS = 5;   // substitutions per side per match
function buildSide(cid, key) {
  const c = G.clubs[cid];
  if (!isUser(cid) || lineupProblems(cid).length) { if (!isUser(cid)) autoPick(cid); else patchLineup(cid); }
  const slots = FORMS[c.form];
  const on = c.xi.map((pid, i) => ({ pid: pid && avail(pid) ? pid : null, slot: slots[i][0], x: slots[i][1], y: slots[i][2] }));
  const used = new Set(on.map(o => o.pid).filter(Boolean));
  return { cid, key, on, sp: { ...(c.sp || {}) }, bench: c.sb.filter(p => p && avail(p) && !used.has(p)), subs: 0, form: c.form, sty: { ...c.sty }, ord: { ...c.ord },
    g: 0, sh: 0, sot: 0, co: 0, fo: 0, yc: 0, rc: 0, pos: 0, susStart: roster(cid).filter(p => pd(p).sus > 0) };
}
// user lineup with an injured/suspended player: replace with the best available, keep the rest
function patchLineup(cid) {
  const c = G.clubs[cid], slots = FORMS[c.form];
  const used = new Set(c.xi.filter(p => p && avail(p)));
  c.xi = c.xi.map((p, i) => {
    if (p && avail(p)) return p;
    const best = roster(cid).filter(x => avail(x) && !used.has(x)).sort((a, b) => effOf(b, slots[i][0]) - effOf(a, slots[i][0]))[0];
    if (best) used.add(best); return best || null;
  });
  c.sb = c.sb.filter(p => p && avail(p) && !used.has(p));
  for (const p of roster(cid).filter(x => avail(x) && !used.has(x) && !c.sb.includes(x)).sort((a, b) => pd(b).sk - pd(a).sk)) { if (c.sb.length >= 5) break; c.sb.push(p); }
}
function newMatch(f, live) {
  const M = { f, live: !!live, h: buildSide(f.h, 'h'), a: buildSide(f.a, 'a'), seg: 0, k: 0, st: [ri(0, 3), ri(1, 5), 0, ri(0, 2)], ev: [], rt: {}, gl: {}, as: {}, yc: {}, app: new Set(), done: false, pause: null, ball: [50, 50], auto: !live };
  for (const S of [M.h, M.a]) S.on.forEach(o => o.pid && (M.app.add(o.pid), M.rt[o.pid] = 0));
  M.ko = f.ko || 0;
  M.u = isUser(f.h) ? 'h' : isUser(f.a) ? 'a' : null;
  return M;
}
const minLabel = M => { const s = SEG[M.seg]; return M.k <= s.len ? String(s.b + M.k) : `${s.b + s.len}+${M.k - s.len}`; };
function sideRatings(S, M) {
  const L = { G: [], D: [], M: [], A: [] };
  let fw = 0, hd = 0;
  for (const o of S.on) {
    if (!o.pid) { L[slotLine(o.slot)].push(28); continue; }
    L[slotLine(o.slot)].push(effOf(o.pid, o.slot));
    const od = S.ord[o.pid]; if (od === 'fw') fw++; if (od === 'hd') hd++;
  }
  const capF = S.on.some(o => o.pid && o.pid === taker(S, 'cap')) ? 1.01 : 1, av = a => (a.length ? sum(a) / a.length : 35) * capF;
  const gk = L.G[0] ?? 25, d = av(L.D), m = av(L.M), a = L.A.length ? av(L.A) : m * .85;
  const nD = L.D.length, nM = L.M.length, nA = L.A.length;
  const st = S.sty, tr = G.clubs[S.cid].tr.foc;
  let att = a * .55 + m * .45 + (nA - 2) * 1.6 + (nM - 4) * .4 + (st.ment - 1) * 3 + fw * .6 - hd * .4 + (st.pass === 0 ? -.4 : st.pass === 2 ? .8 : 0) + (tr === 'att' ? 1 : 0);
  let def = d * .5 + gk * .25 + m * .25 + (nD - 4) * 1.6 + (nM - 4) * .4 - (st.ment - 1) * 3 - fw * .5 + hd * .6 + st.mark * .8 + st.trap * 1.2 + (tr === 'def' ? 1 : 0);
  let mid = m + (nM - 4) * 1.8 - (nA - 2) * .5 + (st.pass === 0 ? 1.5 : st.pass === 2 ? -1.5 : 0) + (tr === 'tac' ? 1 : 0);
  const reds = S.on.filter(o => !o.pid).length; att -= reds * 2.5; def -= reds * 2.5; mid -= reds * 2;
  if (typeof lifeF === 'function') { const lf = lifeF(S, M); att *= lf; def *= lf; mid *= lf; }   // cohesion + press-conference motivation (fm/life.js)
  const pace = av(S.on.filter(o => o.pid && lineOf(o.slot) === 'A').map(o => attrs(o.pid)[0]));
  return { att, def, mid, gk, t: [.86, 1, 1.13][st.tempo], pace };
}
function wOn(S, fn) { const ps2 = S.on.filter(o => o.pid); return wpick(ps2, ps2.map(fn)); }
const POSW = { ST: 3.2, CF: 2.9, AM: 2.4, RW: 2.3, LW: 2.3, RM: 1.9, LM: 1.9, RWB: .8, LWB: .8, CM: 1.5, DM: .6, RB: .5, LB: .5, CD: .55, GK: .01 };
function rate(M, pid, v) { if (pid && M.rt[pid] != null) M.rt[pid] += v; }
function ev(M, t, side, p, p2, x) { const e = { m: minLabel(M), t, s: side, p, p2, x }; M.ev.push(e); return e; }

function step(M) {
  if (M.done || M.pause) return;
  const seg = SEG[M.seg];
  M.k++;
  if (M.k > seg.len + M.st[M.seg]) return endSegment(M);
  const H = M.h, A = M.a, rh = sideRatings(H, M), ra = sideRatings(A, M);
  if (!M.f.n) { rh.att *= 1.035; rh.mid *= 1.02; rh.def *= 1.01; }
  const ph = clamp(rh.mid ** 3 / (rh.mid ** 3 + ra.mid ** 3), .25, .75);
  const hAtt = R() < ph;
  const S = hAtt ? H : A, O = hAtt ? A : H, rs = hAtt ? rh : ra, ro = hAtt ? ra : rh;
  S.pos++;
  let p = .141 * clamp(rs.att / Math.max(20, ro.def), .6, 1.7) ** 2 * (rs.t + ro.t) / 2;
  if (O.sty.trap && rs.pace > 72 && R() < .25) p *= 1.25;
  p = clamp(p, .03, .34);
  M.ball = [hAtt ? 70 + R() * 20 : 10 + R() * 20, 15 + R() * 70];
  if (R() < p) attack(M, S, O, rs, ro);
  for (const [X, Y] of [[H, A], [A, H]]) if (R() < .11 * (X.sty.mark ? 1.2 : 1) * (X.sty.tempo === 2 ? 1.1 : 1)) foul(M, X, Y);
  for (const S2 of [H, A]) wear(M, S2);
  if (M.k % 6 === 0) for (const S2 of [H, A]) aiSubs(M, S2);
}
// the chosen taker if on the pitch, else the best one on the pitch
function taker(S, role) { const on = S.on.map(o => o.pid).filter(Boolean); return S.sp && on.includes(S.sp[role]) ? S.sp[role] : bestFor(role, on); }
function aimer(S, not) { const c = S.on.filter(o => o.pid && o.pid !== not && o.slot !== 'GK'); return c.length ? wpick(c, c.map(o => (attrs(o.pid)[6] / 70) ** 3 * (['CD', 'ST', 'CF'].includes(o.slot) ? 1.6 : 1))) : null; }
// a corner: the left or right taker swings it in, someone attacks it in the air
function corner(M, S, O) {
  S.co++;
  const tk = taker(S, R() < .5 ? 'cl' : 'cr'), tg = tk && aimer(S, tk); if (!tg) return;
  const gko = O.on.find(o => o.slot === 'GK' && o.pid), gq = gko ? attrs(gko.pid)[3] : 40;
  const p = .022 * (attrs(tk)[4] / 72) ** 2 * (attrs(tg.pid)[6] / 72) ** 2 * clamp(70 / gq, .8, 1.25);
  if (R() < .3) { S.sh++; if (R() < p / .3) { S.sot++; goal(M, S, O, tg.pid, tk, 'co'); } else ev(M, 'miss', S.key, tg.pid, null, 'hd'); }
}
// a free kick within range: short = a shot by the short free-kick taker, long = a ball into the box
function freeKick(M, S, O) {
  const gko = O.on.find(o => o.slot === 'GK' && o.pid), gq = gko ? (attrs(gko.pid)[0] + attrs(gko.pid)[1]) / 2 : 40;
  if (R() < .5) {
    const tk = taker(S, 'fks'); if (!tk) return; const a = attrs(tk); S.sh++;
    if (R() > .42) return ev(M, 'miss', S.key, tk, null, 'fk');
    S.sot++; if (R() < clamp(.13 * ((a[5] + a[4]) / 2 / Math.max(30, gq)) ** 2, .04, .3)) goal(M, S, O, tk, null, 'fk'); else ev(M, 'save', S.key, tk, gko && gko.pid, 'fk');
  } else {
    const tk = taker(S, 'fkl'), tg = tk && aimer(S, tk); if (!tg) return;
    if (R() < .02 * (attrs(tk)[4] / 72) ** 2 * (attrs(tg.pid)[6] / 72) ** 2) { S.sh++; S.sot++; goal(M, S, O, tg.pid, tk, 'fkh'); }
  }
}
function attack(M, S, O, rs, ro) {
  const ordW = o => S.ord[o.pid] === 'ls' ? 1.5 : S.ord[o.pid] === 'fw' ? 1.25 : S.ord[o.pid] === 'hd' ? .5 : 1;
  const sh = wOn(S, o => (POSW[o.slot] || 1) * (attrs(o.pid)[ps(o.pid).pos === 'GK' ? 0 : 5] / 70) * ordW(o));
  if (!sh) return;
  const others = S.on.filter(o => o.pid && o.pid !== sh.pid);
  const crossers = others.filter(o => S.ord[o.pid] === 'cr' || ['RM', 'LM', 'RB', 'LB', 'RW', 'LW', 'RWB', 'LWB'].includes(o.slot));
  const as = others.length ? wpick(others, others.map(o => (attrs(o.pid)[4] / 70) ** 2 * (S.ord[o.pid] === 'cr' ? 1.8 : 1) * (S.ord[o.pid] === 'dr' ? 1.2 : 1))) : null;
  const gko = O.on.find(o => o.slot === 'GK' && o.pid);
  const gq = gko ? (attrs(gko.pid)[0] + attrs(gko.pid)[1]) / 2 * clamp(.78 + .22 * (pd(gko.pid).cond - 40) / 52, .7, 1) : 30;
  const a = attrs(sh.pid);
  const longShot = (S.ord[sh.pid] === 'ls' && R() < .55) || (lineOf(sh.slot) !== 'A' && R() < .3);
  const header = !longShot && as && crossers.includes(as) && R() < .45;
  const dribble = !longShot && !header && S.ord[sh.pid] === 'dr' && R() < .5;
  const q = header ? a[6] : a[5];
  S.sh++;
  rate(M, sh.pid, .05);
  if (dribble && R() < .3) { ev(M, 'tackle', S.key, sh.pid, null); return; }
  const onT = longShot ? .34 : header ? .4 : .45;
  if (R() > onT) {
    ev(M, 'miss', S.key, sh.pid, null, longShot ? 'ls' : header ? 'hd' : '');
    if (R() < .35) corner(M, S, O);
    return;
  }
  S.sot++;
  const base = longShot ? .14 : header ? .3 : dribble ? .4 : .34;
  const pg = clamp(base * clamp(q / Math.max(25, gq), .7, 1.4) ** 1.1, .06, .6);
  if (R() < pg) goal(M, S, O, sh.pid, as ? as.pid : null, longShot ? 'ls' : header ? 'hd' : dribble ? 'dr' : '');
  else { if (gko) rate(M, gko.pid, .15); ev(M, 'save', S.key, sh.pid, gko && gko.pid, longShot ? 'ls' : header ? 'hd' : ''); if (R() < .3) corner(M, S, O); }
}
function goal(M, S, O, scorer, assist, kind) {
  S.g++;
  M.gl[scorer] = (M.gl[scorer] || 0) + 1;
  rate(M, scorer, lineOf(ps(scorer).pos) === 'A' ? 1 : 1.2);
  if (assist && kind !== 'pen') { M.as[assist] = (M.as[assist] || 0) + 1; rate(M, assist, .6); }
  for (const o of O.on) if (o.pid && ['G', 'D'].includes(lineOf(o.slot))) rate(M, o.pid, o.slot === 'GK' ? -.35 : -.2);
  M.ball = [S.key === 'h' ? 97 : 3, 50];
  ev(M, 'goal', S.key, scorer, kind === 'pen' ? null : assist, kind);
}
function foul(M, X, Y) {
  X.fo++;
  const f = wOn(X, o => ({ CD: 3, DM: 3, RB: 2, LB: 2, CM: 2 }[o.slot] || 1) * (X.ord[o.pid] === 'mm' ? 1.6 : 1));
  if (!f) return;
  const pid = f.pid;
  if (['CD', 'RB', 'LB', 'GK'].includes(f.slot) && R() < .045) { // penalty
    const tk = taker(Y, 'pk');
    if (tk) { Y.sh++; Y.sot++; if (R() < clamp(.6 + (attrs(tk)[5] + attrs(tk)[7] - 140) * .004, .62, .88)) goal(M, Y, X, tk, null, 'pen'); else { const gk = X.on.find(o => o.slot === 'GK' && o.pid); if (gk) rate(M, gk.pid, .8); ev(M, 'pmiss', Y.key, tk, gk && gk.pid); } }
  }
  else if (R() < .09) freeKick(M, Y, X);
  if (R() < .004) return card(M, X, f, 'rc');
  if (R() < .13) { if (M.yc[pid]) return card(M, X, f, 'rc2'); M.yc[pid] = 1; X.yc++; rate(M, pid, -.4); ev(M, 'yc', X.key, pid); }
}
function card(M, X, o, k) {
  X.rc++; rate(M, o.pid, -1.5);
  ev(M, k === 'rc2' ? 'rc2' : 'rc', X.key, o.pid);
  M.red = M.red || {}; M.red[o.pid] = k;
  o.pid = null;
}
function wear(M, S) {
  const tempo = [.85, 1, 1.18][S.sty.tempo];
  for (const o of S.on) {
    if (!o.pid) continue;
    const d = pd(o.pid);
    if (o.slot === 'GK') d.cond = Math.max(0, d.cond - .08);
    else d.cond = Math.max(0, d.cond - clamp(.3 - (attrs(o.pid)[1] - 60) * .004, .12, .4) * tempo);
    const risk = .00008 * (d.cond >= 75 ? 1 : d.cond >= 60 ? 1.8 : d.cond >= 45 ? 3.5 : 6) * (d.lin ? 2.5 : 1);
    if (R() < risk) injure(M, S, o);
    else if (d.lin && R() < .0018) injure(M, S, o, true);   // playing on with a knock: it can get worse
  }
}
// a light knock (輕傷): plays on, weaker, can get worse; a serious one (重傷): off and out for days. An existing knock always turns serious.
function injure(M, S, o, worse) {
  const pid = o.pid, d = pd(pid), ph = G.clubs[S.cid].st.physio;
  if (!worse && !d.lin && R() < .55) { d.lin = Math.max(2, Math.round(ri(3, 9) * (1.2 - ph * .08))); d.injn = INJN[ri(0, 3)]; ev(M, 'inj', S.key, pid, null, d.injn + '（輕傷，繼續比賽）'); return; }
  const n = worse || d.lin ? (d.injn || INJN[1]) : INJN[Math.min(INJN.length - 1, Math.floor(R() ** 2.2 * INJN.length))];
  d.inj = Math.max(4, Math.round((INJN.indexOf(n) + 1) * ri(3, 7) * (1.2 - ph * .08)) + (d.lin || 0)); d.injn = n; d.lin = 0;
  ev(M, 'inj', S.key, pid, null, `${n}（重傷，休息 ${d.inj} 日）`);
  const sub = bestSub(S, o.slot);
  if (sub && S.subs < MAXSUBS) doSub(M, S, o, sub);
  else o.pid = null;
}
function bestSub(S, slot) { return S.bench.filter(p => avail(p)).sort((a, b) => effOf(b, slot) - effOf(a, slot))[0]; }
function doSub(M, S, o, inPid) {
  const out = o.pid;
  S.bench = S.bench.filter(p => p !== inPid);
  o.pid = inPid; S.subs++;
  M.app.add(inPid); if (M.rt[inPid] == null) M.rt[inPid] = 0;
  ev(M, 'sub', S.key, inPid, out);
}
function aiSubs(M, S) {
  const tm = SEG[M.seg].b + M.k;
  if ((M.u === S.key && !M.auto) || S.subs >= MAXSUBS || tm < 58) return;
  const tired = S.on.filter(o => o.pid && o.slot !== 'GK' && (pd(o.pid).cond < 62 || M.rt[o.pid] < -.6)).sort((a, b) => pd(a.pid).cond - pd(b.pid).cond)[0];
  if (!tired) return;
  const sub = bestSub(S, tired.slot);
  if (sub && effOf(sub, tired.slot) > effOf(tired.pid, tired.slot) * .9) doSub(M, S, tired, sub);
}
function needWinner(M) {
  const f = M.f, h = M.h.g, a = M.a.g;
  if (M.ko === 1) return h === a;
  if (M.ko === 2) { const l1 = fxById(G.comp[f.c].ties.find(t => t.fx.includes(f.i)).fx[0]); const th = h + l1.ag, ta = a + l1.hg; return th === ta && a === l1.ag; }
  return false;
}
function endSegment(M) {
  if (M.seg === 0) { M.seg = 1; M.k = 0; ev(M, 'ht', null); M.pause = M.live ? 'ht' : null; return; }
  if (M.seg === 1 || M.seg === 3) {
    if ((M.seg === 1) && needWinner(M)) { M.seg = 2; M.k = 0; M.f.et = 1; ev(M, 'et', null); M.pause = M.live ? 'et' : null; return; }
    if (M.seg === 3 && needWinner(M)) return penalties(M);
    return finish(M);
  }
  if (M.seg === 2) { M.seg = 3; M.k = 0; return; }
}
function penalties(M) {
  const take = S => S.on.filter(o => o.pid).sort((a, b) => attrs(b.pid)[5] - attrs(a.pid)[5]);
  const th = take(M.h), ta = take(M.a);
  let ph = 0, pa = 0;
  for (let i = 0; i < 20; i++) {
    const kh = th[i % th.length], ka = ta[i % ta.length];
    if (R() < .7 + attrs(kh.pid)[5] / 1000) ph++;
    if (i < 5 && (ph > pa + (5 - i - 1) + 1)) break;
    if (R() < .7 + attrs(ka.pid)[5] / 1000) pa++;
    if (i < 5 && (Math.abs(ph - pa) > 5 - i - 1)) break;
    if (i >= 4 && ph !== pa) break;
  }
  M.f.ph = ph; M.f.pa = pa;
  ev(M, 'pens', null, null, null, `${ph}-${pa}`);
  finish(M);
}
function finish(M) {
  M.done = true; M.pause = null;
  const f = M.f; f.hg = M.h.g; f.ag = M.a.g;
  ev(M, 'ft', null);
  // ratings, stats, form
  let mom = null, mv = -9;
  const res = { h: Math.sign(M.h.g - M.a.g), a: Math.sign(M.a.g - M.h.g) };
  for (const S of [M.h, M.a]) {
    const won = res[S.key];
    for (const pid of M.app) {
      if (pd(pid).c !== S.cid) continue;
      const r = clamp(6 + M.rt[pid] + won * .3 + (R() - .5) * .8, 3, 10);
      const rr = Math.round(r * 10) / 10;
      const d = pd(pid), s = d.s;
      s.ap++; s.rt += rr; s.gl += M.gl[pid] || 0; s.as += M.as[pid] || 0;
      d.fm.push(rr); if (d.fm.length > 5) d.fm.shift();
      if (rr > mv) { mv = rr; mom = pid; }
      M.rt[pid] = rr;
    }
    // suspensions served by this match
    for (const pid of S.susStart) if (pd(pid).sus > 0) pd(pid).sus--;
  }
  for (const pid in M.yc) { const s = pd(pid).s; s.yc++; if (s.yc % 5 === 0) pd(pid).sus += s.yc / 5; }
  for (const pid in (M.red || {})) { const s = pd(pid).s; s.rc++; pd(pid).sus += M.red[pid] === 'rc' ? ri(2, 3) : 1; }
  if (mom) pd(mom).s.mom++;
  M.mom = mom;
  if (isUser(f.h) || isUser(f.a)) f.sc = M.ev.filter(e => e.t === 'goal').map(e => [e.m, e.s, ps(e.p).sn, e.x || '']);
  recordResult(f);
}
function runToEnd(M) { M.auto = true; M.pause = null; let g = 0; while (!M.done && g++ < 400) { M.pause = null; step(M); } }
function simFx(f) { const M = newMatch(f, false); M.auto = true; runToEnd(M); return M; }
// user substitution during a live match
function userSub(M, outPid, inPid) {
  const S = M[M.u]; const o = S.on.find(x => x.pid === outPid);
  if (!o || S.subs >= MAXSUBS || !S.bench.includes(inPid)) return false;
  doSub(M, S, o, inPid); return true;
}
function userSwap(M, a, b) { const S = M[M.u]; const oa = S.on.find(x => x.pid === a), ob = S.on.find(x => x.pid === b); if (oa && ob) { oa.pid = b; ob.pid = a; } }
function userForm(M, form) {
  const S = M[M.u], slots = FORMS[form];
  const pids = S.on.map(o => o.pid);
  S.form = form; S.on = slots.map((s, i) => ({ pid: pids[i], slot: s[0], x: s[1], y: s[2] }));
}

if (typeof module !== 'undefined') module.exports = {};
