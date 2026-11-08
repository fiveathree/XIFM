/* =====================================================================
   CLUB LIFE screens (logic in fm/life.js): 訓練 (team building, individual training), 職員 (hiring),
   傳媒 (press conference, statements), 宣傳 (club and player promotion, stars). Loaded after ui.js.
   ===================================================================== */
const starTag = pid => { const s = starOf(pid); return s ? `<span class="tag t-star${s}" title="人氣 ${popOf(pid)}：${s === 2 ? '巨星' : '明星'}帶嚟額外商品收入同入場人數，但要求高人工，冇得踢會唔開心">${s === 2 ? '★★ 巨星' : '★ 明星'}</span>` : ''; };
const pbar = v => `<span class="cbar"><i style="width:${clamp(v, 0, 100)}%;background:${v >= 85 ? 'var(--sel)' : v >= 70 ? 'var(--warn)' : 'var(--mute, #889)'}"></i></span>`;
const cdTxt = d => d ? `<span class="mute">${d} 日後</span>` : '';

/* ---------- 訓練 ---------- */
SCREENS.training = () => {
  const c = myClub(), me = myCid(), ros = roster(me).slice().sort((a, b) => POSORD.indexOf(ps(a).pos) - POSORD.indexOf(ps(b).pos) || pd(b).sk - pd(a).sk);
  const avgC = ros.length ? Math.round(sum(ros.map(p => pd(p).cond)) / ros.length) : 0, low = ros.filter(p => pd(p).cond < 70).length, inj = ros.filter(p => pd(p).inj || pd(p).lin).length;
  const tfSel = pid => { const t = tfOf(pid), cur = t.k === 'pos' ? 'pos:' + t.pos : t.k;
    return `<select class="inp" data-ch="tf" data-a="${pid}" aria-label="個人訓練">${[['', '跟大隊'], ['grow', '加操'], ['rest', '休養'], ...canLearn(pid).map(q => ['pos:' + q, `學踢 ${POSN[q]}`])].map(([v, t2]) => opt(v, t2, cur)).join('')}</select>`; };
  main(`${hdr('訓練')}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto auto minmax(0,1fr)">
      ${pan(`強度 ${info('重訓練：後生球員進步快啲，但體能回復慢，仲有少量受傷風險。輕訓練：回復快，進步慢。每個星期一計一次。')}`, `<div class="row">${chips([[0, '輕'], [1, '中'], [2, '重']], c.tr.int, 'trint')}</div>`)}
      ${pan(`重點 ${info('進攻／防守／戰術：比賽中對應能力有少量加成。均衡：冇加成。')}`, `<div class="row">${chips([['bal', '均衡'], ['att', '進攻'], ['def', '防守'], ['tac', '戰術']], c.tr.foc, 'trfoc')}</div>`)}
      ${pan(`團隊建設 ${info('默契越高，比賽時全隊表現越好（默契 100 大約 +2.7%，30 大約 −2%）。簽新球員會令默契跌少少；默契平時會慢慢返去 70 左右。每項活動用完要等一段時間先可以再做。')}`,
        `<table><tbody>${Object.entries(TEAMB).map(([k, T]) => { const cd = cdLeft(c, k); return `<tr><td class="nm">${T.n} ${info(T.d)}</td><td class="n">${money(tierCost(c, T.cost))}</td><td>${cd ? cdTxt(cd) : `<button class="btn sm" data-act="teamb" data-a="${k}">舉辦</button>`}</td></tr>`; }).join('')}</tbody></table>`)}
      ${pan('球隊狀況', `<dl class="kv"><dt>默契 ${info('球員之間嘅默契，影響比賽表現。')}</dt><dd>${Math.round(cohOf(c))}${cbar(cohOf(c))}</dd><dt>平均體能</dt><dd>${avgC}${cbar(avgC)}</dd><dt>體能低過 70</dt><dd>${low} 人</dd><dt>傷兵</dt><dd>${inj} 人</dd><dt>每日回復</dt><dd>約 ${([7, 6, 4.5][c.tr.int] + c.st.physio * .4 + stLv(c, 'fit') * .3).toFixed(1)} 體能</dd></dl>`, { t: 1 })}
    </div>
    ${pan(`個人訓練 ${info('跟大隊：同全隊一樣。加操：28 歲或以下進步快啲，但每星期體能 −6，有少少拉傷風險（體能教練可以減低）。休養：每星期多回復 8 體能。學新位置：每星期累積進度（教練越好越快，後生快啲、相近位置快好多），夠 100% 就變成次位置，踢嗰個位唔會扣能力。')}`,
      `<table><thead><tr><th class="n">位</th><th>球員</th><th class="stc">明星</th><th class="n">歲</th><th class="n">能力</th><th>體能</th><th>訓練</th><th class="n">進度</th></tr></thead><tbody>${ros.map(p => { const t = tfOf(p); return `<tr><td class="n">${ps(p).pos}</td><td class="nm">${pl(p)}${pos2P(p).length ? ` <span class="mute">(${pos2P(p).join('/')})</span>` : ''}</td><td class="stc">${starTag(p)}</td><td class="n">${ageOf(p)}</td><td class="n">${pd(p).sk}</td><td>${Math.round(pd(p).cond)}${cbar(pd(p).cond)}</td><td>${tfSel(p)}</td><td class="n">${t.k === 'pos' ? t.pr + '%' : ''}</td></tr>`; }).join('')}</tbody></table>`, { t: 1, st: 'min-height:0' })}
  </div>`);
};

/* ---------- 職員 ---------- */
SCREENS.staff = () => {
  const c = myClub();
  const total = sum(Object.keys(STAFFR).map(k => staffWage(stLv(c, k), c)));
  main(`${hdr('職員', `<span class="mute">職員週薪合共 ${money(total)}</span>${info('撳「招聘」睇應徵者：星數越多越好，但簽約費同週薪越貴。大球會吸引到更好嘅人。應徵名單每 4 個星期更新。換人要賠前任一半簽約費；解僱都要賠。')}`)}
  ${pan('職員', `<table><thead><tr><th>職位</th><th>現任</th><th>等級</th><th class="hm">作用</th><th class="n">週薪</th><th></th></tr></thead><tbody>${Object.entries(STAFFR).map(([k, [n, d]]) => { const s = staffOf(c, k), l = stLv(c, k);
    return `<tr><td class="nm">${n}</td><td class="nm">${s ? `${esc(s.n)} <span class="mute">${esc(natName(s.nat))}</span>` : '<span class="mute">懸空</span>'}</td><td class="num" style="color:var(--sel)">${'★'.repeat(l)}${'☆'.repeat(5 - l)}</td><td class="hm">${d}</td><td class="n">${money(staffWage(l, c))}</td><td class="nowrap"><button class="btn sm" data-act="staffc" data-a="${k}">招聘</button>${l ? ` <button class="btn sm" data-act="stafff" data-a="${k}">解僱</button>` : ''}</td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
};
function staffModal(k) {
  const c = myClub(), l = staffCands(c)[k], old = stLv(c, k), comp = old ? Math.round(staffFee(old, c) / 2) : 0;
  modal(`招聘${STAFFR[k][0]}`, `<p class="note">${STAFFR[k][1]}${old ? ` 而家嘅${STAFFR[k][0]}係 ${'★'.repeat(old)}，換人要賠 ${money(comp)}。` : ''}</p>
    <table><thead><tr><th>應徵者</th><th>國籍</th><th>等級</th><th class="n">簽約費</th><th class="n">週薪</th><th></th></tr></thead><tbody>${l.length ? l.map((s, i) => `<tr><td class="nm">${esc(s.n)}</td><td>${esc(natName(s.nat))}</td><td class="num" style="color:var(--sel)">${'★'.repeat(s.lv)}${'☆'.repeat(5 - s.lv)}</td><td class="n">${money(staffFee(s.lv, c))}</td><td class="n">${money(staffWage(s.lv, c))}</td><td><button class="btn sm y" data-act="hire" data-a="${k}" data-i="${i}">請佢</button></td></tr>`).join('') : '<tr><td colspan="6" class="mute">暫時冇人應徵，下個月再嚟睇。</td></tr>'}</tbody></table>`);
}

/* ---------- 傳媒 ---------- */
SCREENS.media = () => {
  const c = myClub(), f = pressFx(), nf = nextFx(myCid()), cd = cdLeft(c, 'state');
  const press = f ? `<p>${esc(clubName(f.h))} 對 ${esc(clubName(f.a))}（${fdate(f.d, 'm')}）之前嘅記者會。</p><div class="row"><button class="btn y" data-act="press">🎤 出席記者會</button></div>`
    : `<p class="note">${nf && nf.hg == null && c.press === nf.i ? '下場比賽嘅記者會已經開完。' : nf ? `比賽前 3 日先有記者會（下場：${fdate(nf.d, 'm')}）。` : '今季已經冇比賽。'}</p>`;
  const mine = roster(myCid()).slice().sort((a, b) => popOf(b) - popOf(a));
  main(`${hdr('傳媒', info('記者會：每場正式比賽前 3 日內可以出席一次，答 3 條問題。你嘅答案會影響球員鬥志、對手鬥志（只計嗰場）、球員狀態、球迷人氣、董事局信心同領隊聲望。唔出席就冇任何效果。新聞稿：每 14 日可以發一份。公關主任越好，正面效果越大。'))}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan('賽前記者會', press)}
      ${pan(`新聞稿 ${cd ? `<span class="mute">（${cd} 日後先可以再發）</span>` : ''}`, `<div class="row" style="margin-bottom:6px"><span class="mute">有關球員</span><select class="inp" id="stp" aria-label="揀球員"><option value="">（唔使揀）</option>${mine.map(p => `<option value="${p}">${esc(ps(p).sn)} · ${ps(p).pos} · 人氣 ${popOf(p)}</option>`).join('')}</select></div>
        <table><tbody>${Object.entries(STATE).map(([k, S]) => `<tr><td class="nm">${S.n}${S.pid ? ' <span class="mute">（要揀球員）</span>' : ''} ${info(S.d)}</td><td>${cd ? '' : `<button class="btn sm" data-act="stmt" data-a="${k}">發出</button>`}</td></tr>`).join('')}</tbody></table>`)}
      ${pan('球隊形象', `<dl class="kv"><dt>球迷人氣</dt><dd>${Math.round(fansOf(c))}${pbar(fansOf(c))}</dd><dt>董事局信心</dt><dd>${Math.round(c.conf)}%</dd><dt>領隊聲望</dt><dd>${Math.round(G.mgr.rep)}</dd><dt>默契</dt><dd>${Math.round(cohOf(c))}</dd></dl>`, { t: 1 })}
    </div>
    ${pan('新聞', G.news.length ? `<div class="res">${G.news.slice(0, 30).map(n => `<div>${esc(n)}</div>`).join('')}</div>` : '<p class="note">暫時冇新聞。</p>', { t: 1 })}
  </div>`);
};
function pressModal() {
  const f = pressFx(); if (!f) return toast('而家冇記者會');
  if (!UI.press || UI.press.i !== f.i) UI.press = { i: f.i, q: pressQs(f), pick: [] };
  const P = UI.press, done = P.q.every((_, i) => P.pick[i] != null);
  modal('賽前記者會', `<p class="mute">${esc(clubName(f.h))} 對 ${esc(clubName(f.a))} · ${fdate(f.d, 'm')}</p>${P.q.map((Q, i) => `<div class="lbl">記者問：${Q.q}</div><div class="cols" style="gap:4px;margin-bottom:8px">${Q.a.map(([t], j) => `<button class="chip" style="text-align:left" data-act="pq" data-a="${i}" data-i="${j}" aria-pressed="${P.pick[i] === j}">${esc(t)}</button>`).join('')}</div>`).join('')}
    <div class="row"><span class="mute">${done ? '答晒，可以完場' : `仲有 ${P.q.filter((_, i) => P.pick[i] == null).length} 條未答`}</span><span style="margin-left:auto"></span><button class="btn y" data-act="pdone" ${done ? '' : 'disabled'}>完成記者會</button></div>`, 'tall');
}

/* ---------- 宣傳 ---------- */
SCREENS.promo = () => {
  const c = myClub(), me = myCid(), lm = lifeMerch(me), ros = roster(me).slice().sort((a, b) => popOf(b) - popOf(a));
  const run = c.promo || [];
  main(`${hdr('宣傳', info('球迷人氣高過球會聲望，門票入座率、商品同贊助收入都會高啲；低過就少啲。人氣 70 或以上嘅係明星，85 或以上係巨星：佢哋每星期帶嚟額外商品收入，主場入座率都會高啲，但要求高人工，連續冇得踢會唔開心。球員人氣跟住能力、球會同近期表現慢慢變。'))}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan('球會人氣', `<dl class="kv"><dt>球迷人氣</dt><dd>${Math.round(fansOf(c))}${pbar(fansOf(c))} <span class="mute">聲望 ${c.rep}</span></dd><dt>商品收入系數</dt><dd>×${(lm.f * (1 + lm.boost)).toFixed(2)}</dd><dt>明星額外商品</dt><dd>${money(lm.star)} / 星期</dd><dt>明星 / 巨星</dt><dd>${ros.filter(p => starOf(p) === 1).length} / ${ros.filter(p => starOf(p) === 2).length}</dd></dl>`, { t: 1 })}
      ${pan('球隊宣傳', `<table><tbody>${Object.entries(PROMO).map(([k, P]) => { const r = run.find(x => x.k === k), cost = tierCost(c, P.cost);
        return `<tr><td class="nm">${P.n} ${info(P.d)}</td><td class="n">${k === 'tour' ? '收錢' : money(cost)}</td><td>${r ? `<span class="mute">做緊 · ${r.end - G.day} 日</span>` : k === 'tour' && (c.cd || {}).tour === G.season ? '<span class="mute">今季做咗</span>' : `<button class="btn sm" data-act="promo" data-a="${k}">開始</button>`}</td></tr>`; }).join('')}</tbody></table>`)}
      ${pan('進行中', run.length ? `<div class="res">${run.map(p => `<div><span>${(PROMO[p.k] || PPROMO[p.k]).n}${p.pid ? ` · ${esc(ps(p.pid).sn)}` : ''}</span><span class="mute" style="margin-left:auto">${p.end - G.day} 日</span></div>`).join('')}</div>` : '<p class="note">冇進行中嘅宣傳。</p>', { t: 1 })}
    </div>
    ${pan(`球員宣傳 ${info(Object.values(PPROMO).map(P => `${P.n}：${P.d}`).join('\n'))}`, `<table><thead><tr><th>球員</th><th class="stc">明星</th><th class="n hm">能力</th><th>人氣</th><th>宣傳</th></tr></thead><tbody>${ros.map(p => `<tr><td class="nm">${pl(p)}</td><td class="stc">${starTag(p)}</td><td class="n hm">${pd(p).sk}</td><td class="nowrap">${popOf(p)}${pbar(popOf(p))}</td><td class="nowrap">${Object.entries(PPROMO).map(([k, P]) => { const cd = cdLeft(c, k + ':' + p); return cd ? `<span class="mute" title="${P.n}：${cd} 日後先可以再做">${P.s}${cd}日</span>` : `<button class="btn sm" data-act="pp" data-a="${k}" data-i="${p}" title="${esc(P.n + (P.cost ? '（' + money(tierCost(c, P.cost)) + '）' : '') + '：' + P.d)}">${P.s}</button>`; }).join(' ')}</td></tr>`).join('')}</tbody></table>`, { t: 1 })}
  </div>`);
};

/* ---------- actions ---------- */
const lifeDo = (err, ok) => { if (err) return toast(err); save(); render(); if (ok) toast(ok); };
Object.assign(ACT, {
  teamb: el => lifeDo(doTeamB(el.dataset.a), `${TEAMB[el.dataset.a].n}搞掂！`),
  staffc: el => staffModal(el.dataset.a),
  hire: el => { const err = hireStaff(el.dataset.a, +el.dataset.i); if (err) return toast(err); closeModal(); lifeDo(null, `${STAFFR[el.dataset.a][0]}已經上任`); },
  stafff: el => { const k = el.dataset.a, n = STAFFR[k][0]; const comp = fireStaff(k); lifeDo(null, `已經解僱${n}${comp ? `，賠償 ${money(comp)}` : ''}`); },
  press: () => pressModal(),
  pq: el => { UI.press.pick[+el.dataset.a] = +el.dataset.i; pressModal(); },
  pdone: () => { const f = pressFx(); if (!f || !UI.press) return closeModal(); const out = pressApply(f, UI.press.q.map((Q, i) => Q.a[UI.press.pick[i]][1])); UI.press = null; closeModal(); lifeDo(null, '記者會完咗' + (out.length ? '：' + out.join('，') : '')); },
  stmt: el => { const pid = $('#stp') ? $('#stp').value : ''; lifeDo(doStatement(el.dataset.a, pid || null), `已經發出新聞稿：${STATE[el.dataset.a].n}`); },
  promo: el => lifeDo(doPromo(el.dataset.a), `${PROMO[el.dataset.a].n}開始！`),
  pp: el => lifeDo(doPPromo(el.dataset.i, el.dataset.a), `${ps(el.dataset.i).sn}：${PPROMO[el.dataset.a].n}`),
});
Object.assign(CH, {
  tf: el => { const v = el.value, pid = el.dataset.a; if (v.startsWith('pos:')) setTf(pid, 'pos', v.slice(4)); else setTf(pid, v); save(); render(); },
});
