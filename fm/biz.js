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
const bizV0 = cid => .002 * MS * 52 * G.clubs[cid].rep ** 4 * bizFame(cid);
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

/* ---------- pre-season tour (季前巡迴): once a season, between 1 July and the first league game ----------
   You build a trip of 1–5 stops (TDEST). Each stop is a few days and one friendly. Every stop pays an appearance fee
   (club fame × stars × the place; summer invitations pay 30% more) and changes:
   · condition (體能): long flights, jet lag between continents and heat cost condition; training camps give it back
   · pre-season fitness (季前體能 c.psf, this season): camps build it, heat and long trips cost it; it adds to daily recovery
   · cohesion (默契) for every stop, more at camps; new signings settle in (their days at the club count ~25 more per stop)
   · overseas fans: shirt sales this season +% for each market visited (c.tmkt)
   · players' mood: a short trip lifts it, a long one (over 18 days) wears it down
   · injuries: each friendly can bring a knock (more in heat and after long flights)
   The trip takes its days on the calendar (the screen runs them). */
const TDEST = {
  home: { n: '本地熱身賽', r: '本地', fee: .12, dist: 0, heat: 0, camp: 1, days: 3, opp: 'small', d: '同本地細會踢，唔使飛，最輕鬆。' },
  aut: { n: '奧地利訓練營', r: '歐洲', fee: .1, dist: 1, heat: 0, camp: 3, days: 6, opp: 'small', d: '山區訓練營，天氣涼，設施好：體能同默契升得最多，錢最少。' },
  sui: { n: '瑞士阿爾卑斯訓練營', r: '歐洲', fee: .1, dist: 1, heat: 0, camp: 3, days: 6, opp: 'small', d: '高原訓練，季前體能大升。' },
  ger: { n: '慕尼黑邀請賽', r: '歐洲', fee: .55, dist: 1, heat: 0, camp: 1, days: 3, opp: 'big', d: '四隊邀請賽，對手係歐洲豪門，有獎盃。' },
  ned: { n: '阿姆斯特丹邀請賽', r: '歐洲', fee: .45, dist: 1, heat: 0, camp: 1, days: 3, opp: 'big', d: '歐洲傳統夏季邀請賽。' },
  alg: { n: '葡萄牙阿爾加維', r: '歐洲', fee: .3, dist: 1, heat: 1, camp: 2, days: 5, opp: 'mid', d: '海邊訓練營加熱身賽，有少少熱。' },
  usae: { n: '美國東岸（紐約、華盛頓）', r: '美洲', fee: .9, dist: 2, heat: 1, camp: 2, days: 6, opp: 'big', mkt: 'usa', d: '大球場、大贊助商，美國球迷市場。' },
  usaw: { n: '美國西岸（洛杉磯、三藩市）', r: '美洲', fee: .85, dist: 2, heat: 1, camp: 2, days: 6, opp: 'big', mkt: 'usa', d: '大學球場訓練設施好，同豪門踢表演賽。' },
  jpn: { n: '日本（東京、大阪）', r: '亞洲', fee: .8, dist: 2, heat: 1, camp: 1, days: 5, opp: 'local', mkt: 'asia', d: '球迷熱情，濕熱，時差大。' },
  kor: { n: '韓國首爾', r: '亞洲', fee: .7, dist: 2, heat: 1, camp: 1, days: 4, opp: 'local', mkt: 'asia', d: '對 K 聯賽明星隊。' },
  chn: { n: '中國（上海、北京）', r: '亞洲', fee: .95, dist: 2, heat: 2, camp: 0, days: 5, opp: 'local', mkt: 'asia', d: '最大嘅市場、最高出場費，但好熱，行程密。' },
  hkg: { n: '香港', r: '亞洲', fee: .7, dist: 2, heat: 2, camp: 0, days: 4, opp: 'local', mkt: 'asia', d: '大球場表演賽，又熱又濕。' },
  sgp: { n: '新加坡', r: '亞洲', fee: .7, dist: 2, heat: 2, camp: 1, days: 4, opp: 'big', mkt: 'asia', d: '國際冠軍盃式表演賽，對手係豪門。' },
  tha: { n: '泰國曼谷', r: '亞洲', fee: .6, dist: 2, heat: 2, camp: 0, days: 4, opp: 'local', mkt: 'asia', d: '球迷多，好熱。' },
  aus: { n: '澳洲（墨爾本、悉尼）', r: '澳洲', fee: .85, dist: 3, heat: 0, camp: 2, days: 6, opp: 'big', mkt: 'asia', d: '冬天涼爽好訓練，但係最遠，時差最大。' },
  mde: { n: '中東（杜拜、利雅得）', r: '中東', fee: 1, dist: 2, heat: 2, camp: 1, days: 4, opp: 'big', mkt: 'mde', d: '出場費最高，但極熱。' },
};
const TMKT = { usa: '美國', asia: '亞洲', mde: '中東' };
const LOCALXI = { jpn: 'J 聯賽明星隊', kor: 'K 聯賽明星隊', chn: '中超明星隊', hkg: '港超明星隊', tha: '泰超明星隊' };
function tourDays(cid) {   // days free before the first league game (2 to rest at the end)
  const c = G.clubs[cid], first = G.fx.filter(f => f.c === c.lg && (f.h === cid || f.a === cid) && f.hg == null).sort((a, b) => a.d - b.d)[0];
  return first ? first.d - G.day - 2 : 0;
}
function tourOpen(cid) { const c = G.clubs[cid]; return c.tour !== G.season && tourDays(cid) >= 3; }
// summer invitations: three places that pay 30% more this season (mailed when the season starts)
function tourInvites(cid) {
  const c = G.clubs[cid];
  if (!c.tinv || c.tinv.s !== G.season) { const ks = Object.keys(TDEST).filter(k => k !== 'home'); const pickN = []; while (pickN.length < 3) { const k = pick(ks); if (!pickN.includes(k)) pickN.push(k); } c.tinv = { s: G.season, k: pickN }; }
  return c.tinv.k;
}
const tourFee = (cid, k) => Math.round(bizV0(cid) * .07 * TDEST[k].fee * (typeof shopHype === 'function' ? shopHype(cid).starF : 1) * (tourInvites(cid).includes(k) ? 1.3 : 1) * (TDEST[k].opp === 'big' ? 1.15 : 1) / 1e4) * 1e4;
// what a plan would do (no randomness: the screen shows it before you go)
function tourPlanFx(cid, plan) {
  const c = G.clubs[cid], out = { pay: 0, days: 0, cond: 0, psf: 0, coh: 0, mkt: {}, inj: 0, mood: 0, legs: [] };
  let prev = null;
  for (const k of plan) {
    const T = TDEST[k], jet = prev && T.dist >= 2 && TDEST[prev].r !== T.r ? 1 : 0, fly = !prev ? T.dist : TDEST[prev].r === T.r ? 0 : Math.max(T.dist, TDEST[prev].dist);
    const travel = fly >= 2 ? 1 : 0;
    out.days += T.days + travel; out.pay += tourFee(cid, k);
    out.cond += -Math.round(fly ** 1.5 * 2.5) - T.heat * 2 - jet * 4 + T.camp * 1.5;
    out.psf += T.camp * 1.2 - T.heat * .6 - (fly >= 2 ? .6 : 0);
    out.coh += 2 + T.camp;
    if (T.mkt) out.mkt[T.mkt] = Math.min(.15, (out.mkt[T.mkt] || 0) + T.fee * .05);
    out.inj += .04 + T.heat * .03 + fly * .015;
    out.legs.push({ k, travel, jet });
    prev = k;
  }
  if (prev && TDEST[prev].dist >= 2) out.days += 1;   // the flight home
  out.mood = plan.length && out.days <= 12 ? 1 : out.days > 18 ? -1 : 0;
  out.cond = Math.round(clamp(out.cond, -30, 12)); out.psf = Math.round(clamp(out.psf, -4, 10) * 10) / 10; out.coh = Math.min(20, Math.round(out.coh));
  out.inj = Math.min(.9, out.inj);
  return out;
}
const clubStr = cid => { const s = roster(cid).filter(p => !pd(p).yt).map(p => pd(p).sk).sort((a, b) => b - a).slice(0, 11); return s.length ? sum(s) / s.length : 50; };
function tourOpp(cid, k) {
  const T = TDEST[k], me = G.clubs[cid];
  if (T.opp === 'local') return { n: LOCALXI[k] || '當地明星隊', s: 58 + me.rep * .1 };
  const pool = GCL().filter(x => x !== cid && G.clubs[x].lg !== 'eur' && (T.opp === 'big' ? G.clubs[x].rep >= 82 : T.opp === 'mid' ? G.clubs[x].rep >= 60 && G.clubs[x].rep < 80 : G.clubs[x].lg === me.lg.replace(/\d$/, '') + '3' || G.clubs[x].lg === me.lg.replace(/\d$/, '') + '4' || G.clubs[x].rep < 50));
  const o = pool.length ? pick(pool) : null;
  return o ? { n: clubName(o), s: clubStr(o) } : { n: '當地球會', s: 55 };
}
// back home after the trip: tired legs (or fresh ones from a camp) — applied on the day you return
function tourReturn(cid) {
  const c = G.clubs[cid], b = c.tourBack; if (!b || G.day < b.d) return;
  for (const p of roster(cid)) if (!pd(p).yt) pd(p).cond = clamp(pd(p).cond + b.cond, 45, 100);
  c.tourBack = null;
}
// go: money, condition, fitness, cohesion, new signings, markets, mood, friendlies and knocks. Returns the summary.
function doTourPlan(cid, plan) {
  const c = G.clubs[cid];
  if (!plan.length || plan.length > 5) return { err: '揀 1 至 5 站' };
  if (!tourOpen(cid)) return { err: '今季已經去過巡迴，或者聯賽就嚟開波' };
  const F = tourPlanFx(cid, plan); if (F.days > tourDays(cid)) return { err: `行程要 ${F.days} 日，開波前得 ${tourDays(cid)} 日` };
  fin(cid, 'spon', F.pay);
  const pl = roster(cid).filter(p => !pd(p).yt);
  for (const p of pl) { const d = pd(p); if (F.mood && R() < .5) d.arw = clamp((d.arw ?? 2) + F.mood, 0, 4); if (d.jd != null && G.day - d.jd < 364) d.jd -= 25 * plan.length; }
  c.coh = clamp((c.coh ?? 60) + F.coh, 0, 100);
  c.psf = F.psf; c.psfS = G.season;
  c.tmkt = { s: G.season, b: sum(Object.values(F.mkt)), m: F.mkt };
  c.fans = clamp((c.fans ?? c.rep) + (plan.some(k => TDEST[k].dist <= 1) ? 1 : 0), 1, 100);
  // the friendlies
  const res = [], hurt = [], my = clubStr(cid);
  for (const k of plan) {
    const o = tourOpp(cid, k), gap = (my - o.s) / 8, gf = Math.max(0, Math.round(1.3 + gap * .6 + (R() - .5) * 2.4)), ga = Math.max(0, Math.round(1.1 - gap * .5 + (R() - .5) * 2.2));
    res.push({ k, o: o.n, gf, ga });
    if (R() < .04 + TDEST[k].heat * .03 + TDEST[k].dist * .015) { const p = pick(pl.filter(x => !pd(x).inj)); if (p) { pd(p).lin = Math.max(pd(p).lin || 0, ri(4, 12)); pd(p).injn = '季前友誼賽撞傷'; hurt.push(p); } }
  }
  const w = res.filter(r => r.gf > r.ga).length; if (w >= Math.ceil(res.length / 2)) c.fans = clamp(c.fans + 1, 1, 100);
  c.tour = G.season; c.tourLog = { s: G.season, plan, res, hurt, F }; c.tourBack = { d: G.day + F.days, cond: F.cond };
  mail('季前巡迴完成', `${plan.map(k => TDEST[k].n).join(' → ')}（${F.days} 日）<br>${res.map(r => `${esc(TDEST[r.k].n)}：對 ${esc(r.o)} <b>${r.gf}-${r.ga}</b>`).join('<br>')}<br>出場費 ${money(F.pay)} · 體能 ${F.cond > 0 ? '+' : ''}${F.cond} · 季前體能 ${F.psf > 0 ? '+' : ''}${F.psf} · 默契 +${F.coh}${Object.keys(F.mkt).length ? ` · 球衣銷量 ${Object.entries(F.mkt).map(([m, v]) => `${TMKT[m]} +${Math.round(v * 100)}%`).join('、')}` : ''}${hurt.length ? `<br>受傷：${hurt.map(p => esc(ps(p).sn)).join('、')}（輕傷）` : ''}`);
  return { F, res, hurt };
}

/* prize money (獎金): Europe pays to take part, per result and per round reached; domestic cups per round reached.
   League prize by position is paid at the end of the season (core.js rollover); TV money per game (core.js TV). */
const PRIZE = {
  cl: { part: 1.5e6 * MS, w: 3e5 * MS, d: 1e5 * MS, rd: [9e5 * MS, 1.1e6 * MS, 1.4e6 * MS], win: 2.5e6 * MS },   // rd: winning each of the last knockout rounds before the final
  uefa: { part: 3e5 * MS, w: 1e5 * MS, d: 5e4 * MS, rd: [1.5e5 * MS, 2e5 * MS, 3e5 * MS, 4e5 * MS], win: 8e5 * MS },
};
const cupPrizeF = comp => { const lg = comp.id === 'fac' || comp.id === 'lc' ? 'eng1' : (comp.id || '').replace(/_c$/, '1'); return (TIERF[lg] || .8) * (comp.id === 'lc' ? .5 : 1); };
const cupRoundPrize = (comp, r) => PRIZE[comp.id] ? (PRIZE[comp.id].rd[Math.max(0, PRIZE[comp.id].rd.length - (comp.rd.length - 1 - r))] || 0) : Math.round(4e4 * MS * 1.6 ** r * cupPrizeF(comp) / 1e3) * 1e3;
const cupWinPrize = comp => PRIZE[comp.id] ? PRIZE[comp.id].win : Math.round(1e6 * MS * cupPrizeF(comp) / 1e3) * 1e3;
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
