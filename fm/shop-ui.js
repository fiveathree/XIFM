/* 商業 screen: set the prices of tickets, food, souvenirs, parking and shirts; see expected and real sales, what drives
   demand (fans, stars, promotions, form) and which shirts sell best. Logic in fm/shop.js. */
TITLE.shop = '商業';
NAVG.find(g => g[0] === '球會')[1].splice(1, 0, 'shop');
NEEDCLUB.add('shop');
const SHOPROW = [['tk', '門票'], ['food', '小食部'], ['souv', '紀念品'], ['park', '停車場'], ['shirt', '球衣']];
const tkBase = c => DEFPRICE[c.lg] || 18;
// the ticket price that brings in the most on a matchday (gate + what the crowd spends inside)
function tkBest(cid) {
  const c = G.clubs[cid], keep = c.price; let best = keep, bv = -1;
  for (let p = Math.max(3, Math.round(tkBase(c) * .5)); p <= tkBase(c) * 4; p++) {
    c.price = p; const a = attendance(cid, null, c.lg);
    const v = a * p + sum(['food', 'souv', 'park'].map(k => shopEst(cid, k, shopPrice(c, k), a).net));
    if (v > bv) { bv = v; best = p; }
  }
  c.price = keep; return best;
}
function shopEstRow(cid, k, p) {
  const c = G.clubs[cid];
  if (k === 'tk') { const keep = c.price; c.price = p; const a = attendance(cid, null, c.lg); c.price = keep; return { u: a, rev: a * p, net: a * p, txt: `${a.toLocaleString()} 人（${Math.round(a / c.cap * 100)}%）` }; }
  const a = attendance(cid, null, c.lg), e = shopEst(cid, k, p, a);
  return Object.assign(e, { txt: `${e.u.toLocaleString()} ${SHOPK[k].unit}` });
}
const priceOf = (c, k) => k === 'tk' ? c.price : shopPrice(c, k);
const baseOf = (c, k) => k === 'tk' ? tkBase(c) : shopBase(c, k);
function shopPricesTab() {
  const c = myClub(), cid = myCid(), H = shopHype(cid), md = c.mday, sw = c.shirtW;
  const rows = SHOPROW.map(([k, n]) => {
    const p = priceOf(c, k), e = shopEstRow(cid, k, p), best = k === 'tk' ? tkBest(cid) : k === 'park' ? null : shopBest(c, k);
    const tone = p > baseOf(c, k) * 1.25 ? '<span class="tag t-inj">偏貴</span>' : p < baseOf(c, k) * .8 ? '<span class="tag t-ls">偏平</span>' : '';
    return `<tr><td class="nm">${n}<div class="mute" style="font-size:11px">${k === 'shirt' ? '每週' : '每場'} · 標準 £${baseOf(c, k)}</div></td>
      <td><div class="pstep"><button class="btn sm" data-act="shopst" data-a="${k}:-1" aria-label="減價">−</button><span class="pcur">£</span><input class="inp num" data-ch="shopp" data-k="${k}" value="${p}" inputmode="decimal" aria-label="${n}售價"><button class="btn sm" data-act="shopst" data-a="${k}:1" aria-label="加價">＋</button></div></td>
      <td class="n">${best != null ? `<button class="btn sm" data-act="shopbest" data-a="${k}:${best}" ${best === p ? 'disabled' : ''}>£${best}</button>` : '<span class="mute">—</span>'}</td>
      <td>${e.txt} ${tone}<div class="num" style="color:var(--win)">淨收入 ${money(e.net)}</div></td></tr>`;
  }).join('');
  const f = x => `<b class="${x > 1.005 ? 'good' : x < .995 ? 'bad' : ''}">×${x.toFixed(2)}</b>`;
  const top = Object.entries(c.shirtS === G.season ? c.shirt || {} : {}).filter(([p]) => G.pl[p]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const totS = c.shirtS === G.season ? c.shirtTot || 0 : 0;
  const S = c.fin.s, seasonRow = [['gate', '門票'], ['food', '小食部'], ['merch', '球衣紀念品'], ['park', '停車場']].map(([k, n]) => `<tr><td>${n}</td><td class="n ${(S[k] || 0) > 0 ? 'good' : ''}">${money(S[k] || 0)}</td><td class="n">${md ? money(k === 'gate' ? md.tk : k === 'merch' ? md.souv[2] : md[k] ? md[k][2] : 0) : '—'}</td></tr>`).join('');
  return `
  <div class="cols c2 m-stack shopw">
    <div class="cols" style="grid-template-rows:auto minmax(0,1fr);min-height:0">
      ${pan(`售價 ${info(`喺度定門票、小食部、紀念品、停車場同球衣嘅售價。賣得平多人買，賣得貴每件賺多啲，但太貴冇人買；小食、紀念品、球衣有成本，太平都會蝕。「最賺」係按而家情況計出嚟最多錢嘅價錢，撳一下就用。門票同小食、紀念品、停車場每場主場收一次；球衣每個星期賣（全世界球迷買），每件會印上一個球員嘅名。需求同球迷人氣、隊中明星、宣傳活動（例如「球衣宣傳」、「新球衣發佈」）同最近成績有關。預計收入係扣咗成本嘅淨收入。`)}`, `<table class="shopt"><thead><tr><th>項目</th><th>售價</th><th class="n">最賺</th><th>預計賣出 · 淨收入</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="row" style="margin-top:8px"><button class="btn" data-act="shopallbest">全部用「最賺」價</button><button class="btn" data-act="shopreset">全部還原標準價</button></div>`)}
      ${pan(`收入 <span class="r">今季 · 上一場主場</span>`, `<table><thead><tr><th></th><th class="n">今季</th><th class="n">上一場主場${md ? `（對 ${esc(clubShort(md.opp))}）` : ''}</th></tr></thead><tbody>${seasonRow}</tbody></table>`, { st: 'min-height:0' })}
    </div>
    <div class="cols" style="grid-template-rows:auto minmax(0,1fr);min-height:0">
      ${pan(`需求 ${f(H.all)}`, `<dl class="kv"><dt>球迷人氣</dt><dd>${f(H.fans)} <span class="mute">${Math.round(fansOf(c))} / 100</span></dd>
        <dt>明星球員</dt><dd>${f(H.starF)} <span class="mute">${H.stars.length ? H.stars.slice(0, 4).map(p => esc(ps(p).sn)).join('、') + (H.stars.length > 4 ? ` 等 ${H.stars.length} 人` : '') : '冇'}</span></dd>
        <dt>宣傳活動</dt><dd>${f(H.promo)} <span class="mute">${(c.promo || []).length ? (c.promo || []).map(p => esc((typeof PROMO !== 'undefined' && PROMO[p.k] && PROMO[p.k].n) || p.k)).join('、') : '冇進行中（去「宣傳」開）'}</span></dd>
        <dt>最近成績</dt><dd>${f(H.form)} <span class="mute">最近 5 場</span></dd></dl>`)}
      ${pan(`球衣銷量榜 <span class="r">今季 ${totS.toLocaleString()} 件</span>`, top.length ? `<table><tbody>${top.map(([p, u], i) => `<tr><td class="n">${i + 1}</td><td class="n num">${pd(p).no || ''}</td><td class="nm">${pl(p)} ${typeof starOf === 'function' && starOf(p) ? `<span class="tag t-star${starOf(p)}">${starOf(p) === 2 ? '巨星' : '明星'}</span>` : ''}</td><td class="n">${u.toLocaleString()} 件</td><td class="n mute">${Math.round(u / Math.max(1, totS) * 100)}%</td></tr>`).join('')}</tbody></table>` : '<p class="note">今季未有球衣銷售。每個星期一結算一次。</p>', { t: 1, st: 'min-height:0' })}
    </div>
  </div>`;
};
function shopSet(k, v) {
  const c = myClub(); v = Math.round(v * 2) / 2;
  if (k === 'tk') c.price = clamp(Math.round(v), 1, 500);
  else { c.pr = c.pr || {}; c.pr[k] = clamp(v, .5, 1000); }
}
Object.assign(ACT, {
  shopst: el => { const [k, d] = el.dataset.a.split(':'), c = myClub(), p = priceOf(c, k), s = p >= 40 ? 5 : p >= 10 ? 1 : .5; shopSet(k, p + s * +d); save(); render(); },
  shopbest: el => { const [k, v] = el.dataset.a.split(':'); shopSet(k, +v); save(); render(); toast('已改價'); },
  shopallbest: () => { const c = myClub(), cid = myCid(); for (const k of ['food', 'souv', 'shirt']) shopSet(k, shopBest(c, k)); shopSet('tk', tkBest(cid)); save(); render(); toast('已全部改做「最賺」價'); },
  shopreset: () => { const c = myClub(); c.pr = {}; c.price = tkBase(c); save(); render(); toast('已還原標準價'); },
});
Object.assign(CH, { shopp: el => { shopSet(el.dataset.k, +el.value || 1); save(); render(); } });

/* ---------- 商業 tabs: 售價 · 贊助 · 活動 · 獎金同轉播 ---------- */
UI.biz = UI.biz || 'price';
const BIZTAB = [['price', '售價'], ['spon', '贊助'], ['event', '活動'], ['prize', '獎金同轉播']];
const KINDN = { steady: '穩陣長約', bonus: '有獎金', short: '短約高價' };
function bizSponTab() {
  const cid = myCid(), c = myClub(), D = dealsOf(cid), small = Math.round(bizV0(cid) * .25), tot = small + sum(Object.values(D).map(d => d.y));
  const card = s => {
    const S = DEALS[s], d = D[s], open = !S.from || G.season >= S.from, offs = c.offers && c.offers[s] && c.offers[s].o;
    let body;
    if (!open) body = `<p class="note">${S.from}/${String(S.from + 1).slice(2)} 季起先有。</p>`;
    else if (d) body = `<div class="dealb"><b>${esc(d.b)}</b>${s === 'kit' ? ` <span class="num" style="color:var(--sel)">${'★'.repeat(d.tier)}${'☆'.repeat(3 - d.tier)}</span>` : ''}</div>
      <dl class="kv"><dt>每季</dt><dd class="num">${money(d.y)}</dd><dt>合約至</dt><dd>${d.end}/${String(d.end + 1).slice(2)} 季${d.end <= G.season ? ' <span class="tag t-inj">今季完</span>' : ''}</dd>
      ${d.t ? `<dt>獎金</dt><dd>${DTGT[d.t]} → ${money(d.bv)}</dd>` : ''}${d.nm ? `<dt>球場名</dt><dd>${esc(d.nm)}</dd>` : ''}${s === 'kit' ? `<dt>球衣銷量</dt><dd class="good">+${d.tier * 5}%</dd>` : ''}</dl>`;
    else body = `<table class="offt"><tbody>${(offs || []).map((o, i) => `<tr><td><b>${esc(o.b)}</b>${s === 'kit' ? ` <span class="num" style="color:var(--sel)">${'★'.repeat(o.tier)}</span>` : ''}<div class="mute">${KINDN[o.kind]} · ${o.yrs} 季${o.t ? ` · ${DTGT[o.t]}獎 ${money(o.bv)}` : ''}</div></td><td class="n num">${money(o.y)}<div class="mute">每季</div></td><td><button class="btn sm y" data-act="bizsign" data-a="${s}:${i}">簽</button></td></tr>`).join('')}</tbody></table>${s === 'stadium' ? '<p class="note">簽咗球場會改名，球迷人氣 −4。</p>' : ''}`;
    return pan(`${S.n} ${info(S.d)}`, body, { cls: 'dealc' });
  };
  return `<div class="cols" style="grid-template-rows:auto minmax(0,1fr);min-height:0">
    <p class="mute" style="margin:0">今季贊助總收入大約 <b class="num">${money(tot)}</b>（其中本地小贊助 ${money(small)}） ${info('贊助費跟球會聲望、球迷人氣、隊中明星同有冇踢歐聯：成績好、人氣高，下次簽約傾到更多。空咗嘅位會有三間公司出價：穩陣長約年期長；有獎金嘅底薪低啲，但達到目標季尾有獎金；短約高價錢多但好快要再簽。合約完咗會收到郵件。')}</p>
    <div class="dealg">${Object.keys(DEALS).map(card).join('')}</div></div>`;
}
function bizEventTab() {
  const cid = myCid(), c = myClub(), open = tourOpen(cid);
  const tours = Object.entries(TOURS).map(([k, T]) => `<div class="gopt"><div class="gtop"><b>${T.n}</b><span class="num">${money(tourPay(cid, k))}</span></div><div class="mute">${T.d}</div>
    <div class="row"><span class="${T.cond < 0 ? 'bad' : 'good'}">體能 ${T.cond > 0 ? '+' : ''}${T.cond}</span><span class="good">默契 +${T.coh}</span><span class="good">球迷 +${T.fans}</span><button class="btn sm y" data-act="biztour" data-a="${k}" ${open ? '' : 'disabled'} style="margin-left:auto">${open ? '出發' : c.tour === G.season ? '今季做咗' : '聯賽開咗波'}</button></div></div>`).join('');
  const pls = roster(cid).filter(p => !pd(p).yt).sort((a, b) => popOf(b) - popOf(a)).slice(0, 8);
  const ad = pls.map(p => { const fee = Math.round(popOf(p) ** 2 * 60 * prF(c) / 1e3) * 1e3, cd = cdLeft(c, 'ad:' + p); return `<tr><td class="nm">${pl(p)} ${starOf(p) ? `<span class="tag t-star${starOf(p)}">${starOf(p) === 2 ? '巨星' : '明星'}</span>` : ''}</td><td class="n">${popOf(p)}</td><td class="n num">${money(fee)}</td><td class="n">${Math.round(pd(p).cond)}</td><td><button class="btn sm" data-act="bizad" data-a="${p}" ${cd ? 'disabled' : ''}>${cd ? `${cd} 日` : '拍'}</button></td></tr>`; }).join('');
  return `<div class="cols c2 m-stack" style="min-height:0">
    ${pan(`季前熱身 ${info('每季一次，要喺第一場聯賽之前。巡迴賺得多但球員好攰，開季頭幾場會受影響；本地熱身賺少啲，但體能同默契最好。隊中明星越多，巡迴收入越高。')}`, `${open ? '' : `<p class="note">${c.tour === G.season ? '今季已經做咗季前熱身。' : '聯賽已經開咗波，下季先可以再揀。'}</p>`}<div class="gopts">${tours}</div>`, { t: 1, st: 'min-height:0' })}
    ${pan(`球員代言 ${info('球員幫品牌拍廣告：球會即收代言費（人氣越高越多），球員人氣 +3、心情變好，但體能 −5。每個球員 60 日一次。比賽前拍會影響狀態。')}`, `<table class="shopt"><thead><tr><th>球員</th><th class="n">人氣</th><th class="n">代言費</th><th class="n">體能</th><th></th></tr></thead><tbody>${ad}</tbody></table>`, { t: 1, st: 'min-height:0' })}
  </div>`;
}
function bizPrizeTab() {
  const cid = myCid(), c = myClub(), lg = c.lg, n = (G.lgm[lg] || []).length, S = c.fin.s, v = k => S[k] || 0;
  const inc = [['比賽日（門票、小食、泊車）', v('gate') + v('food') + v('park')], ['商業（球衣紀念品、贊助）', v('merch') + v('spon')], ['電視轉播', v('tv')], ['獎金', v('prize')], ['賣人', v('tin')]];
  const out = [['球員薪金', v('wage')], ['職員', v('staff')], ['營運開支', v('ops')], ['買人', v('tout')], ['球場工程', v('build')], ['球探、宣傳', v('scout') + v('pr')]];
  const row = ([nm, x]) => `<tr><td>${nm}</td><td class="n ${x > 0 ? 'good' : x < 0 ? 'bad' : ''}">${money(x)}</td></tr>`;
  const lp = i => Math.round((n - i) * 5.5e5 * (TIERF[lg] || .7) ** 2), net = sum([...inc, ...out].map(x => x[1]));
  const cups = Object.values(G.comp).filter(x => x.t !== 'L' && !PRIZE[x.id] && !/^po\d/.test(x.id) && (lg.startsWith('eng') ? ['fac', 'lc'].includes(x.id) : x.id === lg.replace(/\d$/, '_c')));
  const eu = k => { const P = PRIZE[k]; return `<dt>${k === 'cl' ? '歐聯' : '歐洲足協盃'}</dt><dd>參賽 ${money(P.part)} · 贏 ${money(P.w)} · 和 ${money(P.d)}<br>淘汰賽每贏一圈 ${P.rd.map(money).join(' → ')} · 冠軍 ${money(P.win)}</dd>`; };
  return `<div class="cols c2 m-stack" style="min-height:0">
    <div class="cols" style="grid-template-rows:auto auto;align-content:start">
      ${pan(`今季收支 ${info('一邊要賺錢（商業、賣人），一邊要保持戰績：獎金、轉播、門票、贊助獎金都同成績有關。薪金係最大支出。')}`, `<table><tbody>${inc.map(row).join('')}<tr class="me"><td>收入合計</td><td class="n">${money(sum(inc.map(x => x[1])))}</td></tr>${out.map(row).join('')}<tr class="me"><td>淨額</td><td class="n ${net >= 0 ? 'good' : 'bad'}">${money(net)}</td></tr></tbody></table>`)}
      ${pan('電視轉播', `<dl class="kv"><dt>${esc(LG[lg].name)}</dt><dd>每場 ${money(TV[lg] || 1e5)}（主客隊都有）</dd><dt>歐聯</dt><dd>每場 ${money(5e5)}</dd><dt>歐洲足協盃</dt><dd>每場 ${money(1.5e5)}</dd><dt>本國盃賽</dt><dd>每場 ${money(6e4)}</dd></dl>`)}
    </div>
    <div class="cols" style="grid-template-rows:auto auto auto;align-content:start;overflow:auto;min-height:0">
      ${pan(`聯賽排名獎金 ${info('季尾按名次派。')}`, `<dl class="kv"><dt>冠軍</dt><dd>${money(lp(0))}</dd><dt>第 4 名</dt><dd>${money(lp(3))}</dd><dt>第 ${Math.ceil(n / 2)} 名</dt><dd>${money(lp(Math.ceil(n / 2) - 1))}</dd><dt>最尾</dt><dd>${money(lp(n - 1))}</dd><dt>預期第 ${c.exp} 名</dt><dd>${money(lp((c.exp || 1) - 1))}</dd></dl>`)}
      ${pan(`歐戰獎金 ${info('參賽獎金喺第一場歐戰派；分組賽同淘汰賽每贏一場、和一場都有錢；淘汰賽每贏一圈再有晉級獎金。')}`, `<dl class="kv">${eu('cl')}${eu('uefa')}</dl>`)}
      ${pan('本國盃賽獎金', cups.length ? `<dl class="kv">${cups.map(x => `<dt>${esc(x.nm)}</dt><dd>每晉級一圈 ${x.rd.slice(0, -1).map((_, r) => money(cupRoundPrize(x, r))).join(' → ')}<br>冠軍 ${money(cupWinPrize(x))}</dd>`).join('')}</dl>` : '<p class="note">—</p>')}
    </div>
  </div>`;
}
SCREENS.shop = () => {
  const t = UI.biz, body = t === 'spon' ? bizSponTab() : t === 'event' ? bizEventTab() : t === 'prize' ? bizPrizeTab() : shopPricesTab();
  main(`${hdr('商業', `<span class="mute">資金 ${G.inf ? '∞' : money(myClub().cash)}</span>`)}
  <div class="tabs">${chips(BIZTAB, t, 'biztab')}</div>
  <div class="bizbody">${body}</div>`);
};
Object.assign(ACT, {
  biztab: el => { UI.biz = el.dataset.a; render(); },
  bizsign: el => { const [s, i] = el.dataset.a.split(':'), err = signDeal(myCid(), s, +i); if (err) return toast(err); save(); render(); toast('簽約成功！'); },
  biztour: el => { const err = doTour(myCid(), el.dataset.a); if (err) return toast(err); save(); render(); toast(`${TOURS[el.dataset.a].n}完成`); },
  bizad: el => { const err = doPPromo(el.dataset.a, 'ad'); if (err) return toast(err); save(); render(); toast('拍完廣告，代言費已入帳'); },
});
