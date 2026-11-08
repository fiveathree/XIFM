/* ---------- club business (商業, with fm/shop.js): sponsor deals, pre-season tours, cup & European prize money ----------
   Sponsors: your club has four slots c.deals = { shirt 胸前, kit 球衣供應商, sleeve 袖口 (2017/18 on), stadium 球場冠名 }.
   A deal = { b: brand, y: £ a season (paid weekly), end: last season, t: bonus target or null, bv: bonus £, tier: kit brand 1–3 }.
   Empty slots get three offers (c.offers[slot]); deals end after their last season (mail + new offers). Brands are made up.
   Value: V0 = the old all-in sponsorship (.002·rep⁴ a week) × fame (fans, stars, Europe). Small local sponsors keep paying
   a quarter of it; the four slots together are worth about the rest, the stadium name extra (but fans don't like it).
   AI clubs keep the old formula. Bonuses are paid at the end of the season if the target was met. */
const DEALS = {
  shirt: { n: '胸前贊助', w: .32, d: '球衣正面嘅大贊助商，最值錢。' },
  kit: { n: '球衣供應商', w: .28, d: '整球衣嗰間運動品牌。大品牌令球衣更好賣（每級 +5%）。' },
  sleeve: { n: '袖口贊助', w: .08, d: '球衣袖口嘅小贊助（2017/18 季起先有）。', from: 2017 },
  stadium: { n: '球場冠名', w: .22, d: '球場改用贊助商個名。錢多，但傳統球迷唔鍾意：球迷人氣 −4。' },
};
const BRANDS = {
  main: ['Skyward 航空', 'Orbit 電訊', 'Valor 銀行', 'Zenko 汽車', 'Lumen 能源', 'Hexa 科技', 'Pacifica 保險', 'Nimbus 雲端', 'Aurum 金融', 'Velo 物流', 'Kaito 電子', 'Solace 酒店', 'Meridian 航運', 'Crest 啤酒', 'Polar 飲品'],
  kit: [['Strider', 3], ['Vanta', 3], ['Kestrel', 2], ['Apex Sport', 2], ['Norte', 2], ['Fieldcraft', 1], ['Rallye', 1], ['Moro', 1]],
};
const DTGT = { title: '聯賽冠軍', top4: '聯賽前四', half: '聯賽前半部', stay: '護級成功' };
function bizFame(cid) {
  const c = G.clubs[cid], stars = roster(cid).filter(p => typeof starOf === 'function' && starOf(p)).length;
  const eu = G.comp.cl && (G.comp.cl.cl || []).includes(cid) ? .1 : 0;
  return clamp(.75 + (typeof fansOf === 'function' ? fansOf(c) : c.rep) / 250 + stars * .03 + eu, .6, 1.6);
}
const bizV0 = cid => .002 * 52 * G.clubs[cid].rep ** 4 * bizFame(cid);
const slotsNow = () => Object.keys(DEALS).filter(k => !DEALS[k].from || G.season >= DEALS[k].from);
function dealTarget(cid) {
  const c = G.clubs[cid], n = (G.lgm[c.lg] || []).length || 20, e = c.exp || 10;
  return e <= 1 ? 'title' : e <= 4 ? 'top4' : e <= n / 2 ? 'half' : 'stay';
}
function makeOffer(cid, slot, kind) {
  const V = bizV0(cid) * DEALS[slot].w, r100 = v => Math.round(v / 1e4) * 1e4;
  let b, tier = 0;
  if (slot === 'kit') { const k = pick(BRANDS.kit); b = k[0]; tier = k[1]; } else b = pick(BRANDS.main);
  const tf = slot === 'kit' ? .8 + .15 * tier : 1;
  if (kind === 'steady') return { b, tier, y: r100(V * tf * (.9 + R() * .15)), yrs: ri(3, 5), t: null, bv: 0, kind };
  if (kind === 'bonus') { const y = r100(V * tf * .75); return { b, tier, y, yrs: ri(2, 4), t: dealTarget(cid), bv: r100(V * tf * .6), kind }; }
  return { b, tier, y: r100(V * tf * 1.12), yrs: ri(1, 2), t: null, bv: 0, kind };
}
function dealsOf(cid) {
  const c = G.clubs[cid];
  if (!c.deals) {   // a new club: shirt and kit deals already running, the other slots open
    c.deals = {};
    for (const s of ['shirt', 'kit']) { const o = makeOffer(cid, s, 'steady'); c.deals[s] = { b: o.b, tier: o.tier, y: o.y, end: G.season + ri(0, 2), t: null, bv: 0 }; }
  }
  c.offers = c.offers || {};
  for (const s of slotsNow()) if (!c.deals[s] && (!c.offers[s] || c.offers[s].s !== G.season)) c.offers[s] = { s: G.season, o: ['steady', 'bonus', 'short'].map(k => makeOffer(cid, s, k)) };
  return c.deals;
}
function signDeal(cid, slot, i) {
  const c = G.clubs[cid], D = dealsOf(cid), of = c.offers[slot] && c.offers[slot].o[i]; if (!of || D[slot]) return '揀唔到';
  D[slot] = { b: of.b, tier: of.tier, y: of.y, end: G.season + of.yrs - 1, t: of.t, bv: of.bv };
  if (slot === 'stadium') { D[slot].nm = of.b.split(' ')[0] + ' Arena'; c.fans = clamp((c.fans ?? c.rep) - 4, 1, 100); }
  delete c.offers[slot];
  return null;
}
// a week of sponsorship for your club: local sponsors + the deals
function dealsWeek(cid) {
  const D = dealsOf(cid), small = bizV0(cid) * .25 / 52;
  return Math.round(small + sum(Object.values(D).map(d => d.y / 52)));
}
const kitTier = cid => { const c = G.clubs[cid]; return (c.deals && c.deals.kit && c.deals.kit.tier) || 0; };
const namingOf = cid => { const c = G.clubs[cid], d = c && c.deals && c.deals.stadium; return d && d.nm ? d.nm : null; };
// end of season (rollover, before the new season): bonuses and expiries
function dealsSeasonEnd(cid, pos, n) {
  const c = G.clubs[cid]; if (!c.deals) return;
  const met = { title: pos === 1, top4: pos <= 4, half: pos <= n / 2, stay: pos <= n - 3 };
  for (const [s, d] of Object.entries(c.deals)) {
    if (d.t && met[d.t]) { fin(cid, 'spon', d.bv); mail('贊助獎金', `${esc(d.b)}（${DEALS[s].n}）：達成「${DTGT[d.t]}」，獎金 ${money(d.bv)}。`); }
    if (d.end <= G.season) { delete c.deals[s]; mail('贊助合約完結', `同 ${esc(d.b)} 嘅${DEALS[s].n}合約完咗。去「商業 → 贊助」揀新贊助商。`); }
  }
}

/* pre-season tours (季前熱身): once a season, before the first league game. Money (more with stars) vs tired legs. */
const TOURS = {
  asia: { n: '亞洲巡迴', m: 1, cond: -10, coh: 2, fans: 3, d: '去亞洲踢 3 場表演賽。收入高，球迷人氣上升，但長途機好攰。' },
  usa: { n: '美國巡迴', m: 1.25, cond: -12, coh: 2, fans: 2, d: '美國大球場表演賽，收入最高，最攰。' },
  eur: { n: '歐洲邀請賽', m: .55, cond: -6, coh: 4, fans: 1, d: '同歐洲球會踢邀請賽：中等收入，默契上升。' },
  home: { n: '本地熱身賽', m: .12, cond: 6, coh: 6, fans: 1, d: '同本地細會踢熱身：收入少，但體能同默契最好。' },
};
function tourOpen(cid) {
  const c = G.clubs[cid]; if (c.tour === G.season) return false;
  const first = G.fx.filter(f => f.c === c.lg && (f.h === cid || f.a === cid)).sort((a, b) => a.d - b.d)[0];
  return !first || G.day < first.d;
}
const tourPay = (cid, k) => Math.round(bizV0(cid) * .25 * TOURS[k].m * (typeof shopHype === 'function' ? shopHype(cid).starF : 1) / 1e4) * 1e4;
function doTour(cid, k) {
  const c = G.clubs[cid], T = TOURS[k]; if (!tourOpen(cid)) return '今季已經做過季前熱身，或者聯賽已經開咗波';
  const pay = tourPay(cid, k); fin(cid, 'spon', pay);
  for (const p of roster(cid)) if (!pd(p).yt) pd(p).cond = clamp(pd(p).cond + T.cond, 40, 100);
  c.coh = clamp((c.coh ?? 60) + T.coh, 0, 100); c.fans = clamp((c.fans ?? c.rep) + T.fans, 1, 100); c.tour = G.season;
  mail(T.n, `季前熱身完成：收入 ${money(pay)}，全隊體能 ${T.cond > 0 ? '+' : ''}${T.cond}，默契 +${T.coh}，球迷人氣 +${T.fans}。`);
  return null;
}

/* prize money (獎金): Europe pays to take part, per result and per round reached; domestic cups per round reached.
   League prize by position is paid at the end of the season (core.js rollover); TV money per game (core.js TV). */
const PRIZE = {
  cl: { part: 1.5e6, w: 3e5, d: 1e5, rd: [9e5, 1.1e6, 1.4e6], win: 2.5e6 },   // rd: winning each of the last knockout rounds before the final
  uefa: { part: 3e5, w: 1e5, d: 5e4, rd: [1.5e5, 2e5, 3e5, 4e5], win: 8e5 },
};
const cupPrizeF = comp => { const lg = comp.id === 'fac' || comp.id === 'lc' ? 'eng1' : (comp.id || '').replace(/_c$/, '1'); return (TIERF[lg] || .8) * (comp.id === 'lc' ? .5 : 1); };
const cupRoundPrize = (comp, r) => PRIZE[comp.id] ? (PRIZE[comp.id].rd[Math.max(0, PRIZE[comp.id].rd.length - (comp.rd.length - 1 - r))] || 0) : Math.round(4e4 * 1.6 ** r * cupPrizeF(comp) / 1e3) * 1e3;
const cupWinPrize = comp => PRIZE[comp.id] ? PRIZE[comp.id].win : Math.round(1e6 * cupPrizeF(comp) / 1e3) * 1e3;
// a team won its tie in round r of a cup: prize for reaching the next round
function prizeAdvance(comp, r, cids) {
  if (/^po\d/.test(comp.id)) return;
  const v = cupRoundPrize(comp, r); if (!v) return;
  for (const cid of cids) { fin(cid, 'prize', v); if (isUser(cid)) mail('盃賽獎金', `${esc(comp.nm)}晉級：獎金 ${money(v)}。`); }
}
function prizeWin(comp) { if (/^po\d/.test(comp.id) || !comp.win) return; fin(comp.win, 'prize', cupWinPrize(comp)); }
// a European game: taking part (first game), win / draw money
function prizeEuroGame(f, h, a) {
  const P = PRIZE[f.c]; if (!P) return;
  const comp = G.comp[f.c]; comp.part = comp.part || {};
  for (const cid of [f.h, f.a]) if (!comp.part[cid]) { comp.part[cid] = 1; fin(cid, 'prize', P.part); if (isUser(cid)) mail('歐戰參賽獎金', `參加${esc(comp.nm)}：獎金 ${money(P.part)}。`); }
  if (h > a) fin(f.h, 'prize', P.w); else if (a > h) fin(f.a, 'prize', P.w); else { fin(f.h, 'prize', P.d); fin(f.a, 'prize', P.d); }
}
