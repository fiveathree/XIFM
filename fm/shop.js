/* ---------- club commerce (商業): prices and sales of tickets, food, shirts, souvenirs and parking ----------
   c.price = ticket price (attendance() in core.js). c.pr = { food, shirt, souv, park } (missing = the default price).
   Matchday (each home game, core.js gate code → shopMatchday): food, souvenirs and parking, sold to the crowd.
   Weekly (core.js weekly → shopWeek): shirts, sold to all fans; each sale goes to a player's name (c.shirt[pid] this season).
   Demand: fans and stars (lifeMerch, fm/life.js), promotions (kit / shirt campaigns), recent results (shopForm), and the
   price: units = base units × (default price / price)^e. Each item has a unit cost, so too cheap loses money too. */
const SHOPK = {
  food: { n: '小食部', m: .2, e: 1.5, cost: .4, unit: '份', per: '每場' },
  souv: { n: '紀念品', m: .5, e: 2, cost: .5, unit: '件', per: '每場' },
  park: { n: '停車場', m: .4, e: 1.2, cost: .1, unit: '個車位', per: '每場' },
  shirt: { n: '球衣', m: 1.8, e: 2, cost: .5, unit: '件', per: '每週' },
};
const nicePrice = v => v >= 20 ? Math.round(v) : Math.round(v * 2) / 2;
const shopBase = (c, k) => nicePrice((DEFPRICE[c.lg] || 18) * SHOPK[k].m);
const shopPrice = (c, k) => (c.pr && c.pr[k]) || shopBase(c, k);
// the price that makes the most money: cost × e / (e − 1) for this demand curve (parking is capped by spaces)
const shopBest = (c, k) => nicePrice(shopBase(c, k) * SHOPK[k].cost * SHOPK[k].e / (SHOPK[k].e - 1));
// last five games: points per game → 0.85 … 1.15
function shopForm(cid) {
  const fx = G.fx.filter(f => f.hg != null && (f.h === cid || f.a === cid)).sort((a, b) => b.d - a.d).slice(0, 5);
  if (!fx.length) return 1;
  const pts = sum(fx.map(f => { const us = f.h === cid ? f.hg : f.ag, them = f.h === cid ? f.ag : f.hg; return us > them ? 3 : us === them ? 1 : 0; })) / fx.length;
  return clamp(1 + (pts - 1.5) / 10, .85, 1.15);
}
// everything that moves demand, for the screen
function shopHype(cid) {
  const c = G.clubs[cid], lm = typeof lifeMerch === 'function' ? lifeMerch(cid) : { f: 1, star: 0, boost: 0 };
  const stars = roster(cid).filter(p => typeof starOf === 'function' && starOf(p));
  const starF = 1 + sum(stars.map(p => starOf(p) === 2 ? .07 : .03));
  return { fans: lm.f, stars, starF, promo: 1 + lm.boost, form: shopForm(cid), all: lm.f * starF * (1 + lm.boost) * shopForm(cid), lm };
}
const shopUnits = (c, k, base, p) => base * (shopBase(c, k) / Math.max(.5, p)) ** SHOPK[k].e;
// expected sales of one item for a crowd of att (matchday items) or for a week (shirts)
function shopEst(cid, k, p, att) {
  const c = G.clubs[cid], H = shopHype(cid), K = SHOPK[k], base = shopBase(c, k);
  let u;
  if (k === 'food') u = shopUnits(c, k, att * .45 * (.9 + .1 * H.form), p);
  else if (k === 'souv') u = shopUnits(c, k, att * .08 * H.all, p);
  else if (k === 'park') u = Math.min(Math.round(c.cap * .06), shopUnits(c, k, att * .15, p));
  else { const M0 = .0034 * c.rep ** 4 * H.lm.f * (1 + H.lm.boost) + H.lm.star; u = shopUnits(c, k, M0 / (base * K.cost) * H.form * H.starF ** .5 * (1 + .05 * (typeof kitTier === 'function' ? kitTier(cid) : 0)), p); }
  u = Math.max(0, Math.round(u));
  return { u, rev: Math.round(u * p), net: Math.round(u * (p - base * K.cost)) };
}
// a home game: food, souvenirs, parking (core.js calls this after the gate)
function shopMatchday(cid, att, f) {
  const c = G.clubs[cid], md = { d: f.d, opp: f.a, att, tk: att * c.price };
  for (const k of ['food', 'souv', 'park']) { const e = shopEst(cid, k, shopPrice(c, k), att); md[k] = [e.u, e.rev, e.net]; fin(cid, k === 'souv' ? 'merch' : k, e.net); }
  if (isUser(cid)) c.mday = md;
}
// a week of shirt sales, shared out over the squad by popularity (shirt campaigns double a player's share)
function shopWeek(cid) {
  const c = G.clubs[cid], e = shopEst(cid, 'shirt', shopPrice(c, 'shirt'), 0);
  fin(cid, 'merch', e.net);
  if (!isUser(cid)) return;
  if (c.shirtS !== G.season) { c.shirt = {}; c.shirtS = G.season; c.shirtTot = 0; }
  const pl = roster(cid).filter(p => !pd(p).yt), camp = new Set((c.promo || []).filter(x => x.k === 'shirt').map(x => x.pid));
  const w = pl.map(p => (typeof popOf === 'function' ? popOf(p) : 30) ** 3 * (camp.has(p) ? 2 : 1) * (.8 + .4 * clamp(form(p) / 10, 0, 1)));
  const tw = sum(w) || 1; let left = e.u;
  pl.forEach((p, i) => { const n = i === pl.length - 1 ? left : Math.round(e.u * w[i] / tw); if (n > 0) { c.shirt[p] = (c.shirt[p] || 0) + n; left -= n; } });
  c.shirtTot = (c.shirtTot || 0) + e.u; c.shirtW = { u: e.u, rev: e.rev, net: e.net };
}
