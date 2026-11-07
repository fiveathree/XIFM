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
  if (G.mgr.cid) for (const p of roster(G.mgr.cid)) if (!G.cards[p]) G.cards[p] = 1;
}
const DUPF = { C: .1, R: .3, SR: 1.2, SSR: 5, UR: 30 }, UPF = { C: .2, R: .4, SR: 1, SSR: 3, UR: 10 };
const dupValue = pid => Math.round(pullCost(1) * DUPF[GRADE(pd(pid).sk)] / 1e3) * 1e3;
function upInfo(pid) { const l = clvOf(pid), need = l + 1; return { l, need, spare: owns(pid) - 1, cost: Math.round(pullCost(1) * UPF[GRADE(pd(pid).sk)] * need / 1e3) * 1e3 }; }
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
