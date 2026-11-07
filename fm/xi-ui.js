/* =====================================================================
   傳奇十一人 screens in career mode (logic in fm/xi.js, styles in fm/xi.css). Loaded after life-ui.js.
   陣容: card board on a turf pitch (drag cards between pitch, bench and list; drag onto grass to move a position)
   戰術: tactic styles + sliders + set pieces + individual orders, card pitch preview
   球探抽卡: banner + pack opening (flip, flash, NEW / duplicate badges)
   卡冊: every player of the era as a card; collected ones in colour; upgrades with duplicates in the player sheet
   ===================================================================== */
const XPITCH = `<svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".35"><rect x="2" y="2" width="64" height="96"/><line x1="2" y1="50" x2="66" y2="50"/><circle cx="34" cy="50" r="9.15"/><rect x="13.8" y="2" width="40.4" height="16.5"/><rect x="24.8" y="2" width="18.4" height="5.5"/><rect x="13.8" y="81.5" width="40.4" height="16.5"/><rect x="24.8" y="92.5" width="18.4" height="5.5"/><path d="M26.7 18.5 A9.15 9.15 0 0 0 41.3 18.5"/><path d="M26.7 81.5 A9.15 9.15 0 0 1 41.3 81.5"/></g></svg>`;
function cardHTML(pid, o = {}) {
  const d = pd(pid), p = ps(pid), g = GRADE(d.sk), lv = o.dim ? 0 : clvOf(pid);
  const where = d.c === 'free' ? '自由身' : d.c === 'ret' ? '退休' : clubShort(d.c);
  return `<div class="card g-${g} ${o.dim ? 'dim' : ''} ${o.cls || ''}" ${o.open ? `data-pl="${pid}"` : ''} title="${esc(p.name)} · ${esc(clubName(d.c))}">
  <div class="c-top"><span class="c-r">${o.dim ? d.sk : cardR(pid)}</span><span class="c-g">${g}</span></div>
  <div class="c-pos">${p.pos}${lv ? `<span class="c-lv">+${lv}</span>` : ''}</div><div class="c-nat">${p.nat}</div>
  <div class="c-name">${esc(p.sn)}</div><div class="c-meta">${ageOf(pid)}歲 · ${esc(where)}</div>${o.count > 1 ? `<span class="cnt">×${o.count}</span>` : ''}${o.badge || ''}</div>`;
}
// formation y (0 = opponent goal, 100 = own goal) → place on the board, leaving room for the cards at both ends
const YB = y => 3.5 + y * .92, YU = t => (t - 3.5) / .92;
const stCol = v => v >= 85 ? 'var(--win)' : v >= 65 ? 'var(--amber)' : 'var(--loss)';
const sbarX = v => `<i class="sbar"><b style="width:${Math.round(v)}%;background:${stCol(v)}"></b></i>`;

/* ---------- team evaluation for the board ---------- */
function boardSide(cid, form, xi) {
  const c = G.clubs[cid], f = FORMS[form || c.form]; xi = xi || c.xi;
  return { cid, key: 'h', on: f.map((s, i) => ({ pid: xi[i] && avail(xi[i]) ? xi[i] : null, slot: s[0], x: s[1], y: s[2] })), sty: c.sty, ord: c.ord || {}, sp: c.sp || {} };
}
function teamEval(cid, form, xi) {
  const S = boardSide(cid, form, xi), r = sideRatings(S, { f: null }), ch = chemMap(S.on.map(o => o.pid).filter(Boolean));
  return { att: Math.round(r.att), def: Math.round(r.def), mid: Math.round(r.mid), ovr: Math.round((r.att + r.def + r.mid) / 3), ch, chem: sum(Object.values(ch)), S };
}

/* ---------- pitch slots and bench ---------- */
function slotX(cid, xi, form, i, ch, cap, drag) {
  const pid = xi[i], [pos, x, y] = FORMS[form][i];
  const f = pid ? fitP(pid, pos) : 1, eff = pid ? Math.round(cardR(pid) * f) + (ch[pid] || 0) : 0, e = f >= 1 ? 'e1' : f >= .9 ? 'e2' : 'e3';
  const out = pid && !avail(pid) ? (pd(pid).inj ? '傷' : '停賽') : '';
  return `<div class="slot ${drag && UI.sel === 'x' + i ? 'selp' : ''}" ${drag ? `data-i="${i}"` : ''} style="left:${x}%;top:${YB(y)}%${y >= 86 ? ';transform:translate(-50%,-36%)' : ''}">
    ${pid ? `<div style="position:relative">${cardHTML(pid, { cls: out ? 'inj' : '' })}${ch[pid] ? `<span class="chem" title="默契 +${ch[pid]}（同國籍隊友）">+${ch[pid]}</span>` : ''}${pid === cap ? '<span class="capx" title="隊長">C</span>' : ''}<span class="snm">${esc(ps(pid).sn)}</span></div>` : `<div class="empty"><span><b>+</b><br>${pos}</span></div>`}
    <span class="stag">${pos}${pid ? (out ? ` <span class="e3">${out}</span>` : ` <span class="${e}" title="${f < 1 ? `踢${esc(POSN[pos])}：本位 ${cardR(pid)} × ${Math.round(f * 100)}%` : '本位'}${ch[pid] ? ` + 默契 ${ch[pid]}` : ''}">${eff}</span>`) : ''}</span>${pid && !out && pd(pid).cond < 100 ? sbarX(pd(pid).cond) : ''}</div>`;
}
function benchX(c, i) {
  const pid = c.sb[i], sel = UI.sel === 'b' + i ? 'selp' : '';
  if (!pid) return `<button class="bslot ${sel}" data-k="b${i}" aria-label="後備 ${i + 1}"><div class="empty"><b>+</b></div><span class="stag">SUB</span></button>`;
  const out = !avail(pid);
  return `<button class="bslot ${sel}" data-k="b${i}"><div style="position:relative">${cardHTML(pid, { cls: out ? 'inj' : '' })}<span class="snm">${esc(ps(pid).sn)}</span></div><span class="stag">${out ? `<span class="e3">${pd(pid).inj ? '傷' : '停賽'}</span>` : `${ps(pid).pos} ${cardR(pid)}`}</span>${out ? '' : sbarX(pd(pid).cond)}</button>`;
}
function pitemX(pid, k) {
  const d = pd(pid), p = ps(pid);
  return `<div class="pitem ${UI.sel === k ? 'selp' : ''}" data-k="${k}">${cardHTML(pid)}<div style="min-width:0"><div class="nm">${pl(pid)} ${pTags(pid)}</div><div class="mt">${POSN[p.pos]}${pos2P(pid).length ? ` · ${pos2P(pid).join('/')}` : ''} · ${ageOf(pid)} 歲 · ${esc(natName(p.nat))}</div></div><div class="ef">${cardR(pid)}<small>體能 ${Math.round(d.cond)}</small></div></div>`;
}

/* ---------- 陣容 ---------- */
SCREENS.squad = () => {
  const cid = myCid(), c = myClub(), T = teamEval(cid), cap = taker(T.S, 'cap');
  const inXI = new Set(c.xi.filter(Boolean)), inSB = new Set(c.sb);
  const res = roster(cid).filter(p => !inXI.has(p) && !inSB.has(p)).sort((a, b) => POSORD.indexOf(ps(a).pos) - POSORD.indexOf(ps(b).pos) || cardR(b) - cardR(a));
  const probs = lineupProblems(cid), plans = c.plans || [], cur = c.plan ?? 0, tx = xiTac(T.S);
  main(`${hdr('陣容', `${[0, 1, 2].map(i => `<button class="chip" data-act="plan" data-a="${i}" aria-pressed="${cur === i}">方案 ${'ABC'[i]}${plans[i] ? '' : '（空）'}</button>`).join('')}<button class="btn sm" data-act="plansave">存入方案 ${'ABC'[cur]}</button><button class="btn" data-act="autopick">自動排陣</button>${info('拖住張卡：放喺另一張卡上面＝兩個人對調；放喺草地空位＝將嗰個位置移過去（位置跟住變，變自訂陣式）；拖去後備或者右邊名單都得。唔想拖：撳一張卡揀咗佢，再撳另一張對調。卡上面大數字係球員評分（包括卡牌等級），下面標籤係佢喺嗰個位置嘅實際能力：綠色＝本位，黃色＝相近位置扣少少，紅色＝扣得多。黃色圓點係默契加成：正選入面同國籍隊友越多，加 1–2 分。白色 C 係隊長。撳球員個名睇詳細資料。')}${probs.length ? `<span class="bad">${esc(probs.slice(0, 2).join('；'))}</span>` : ''}`)}
  <div class="xsq">
    <div class="xl">
      <div class="xpitch" id="sqp">${XPITCH}${FORMS[c.form].map((_, i) => slotX(cid, c.xi, c.form, i, T.ch, cap, true)).join('')}</div>
      <div class="brow">${[0, 1, 2, 3, 4].map(i => benchX(c, i)).join('')}</div>
    </div>
    <div class="xr">
      ${pan(`球隊實力 <span class="r">${fname(c.form)}</span>`, `<div class="xstats">${[['總評', T.ovr], ['進攻', T.att], ['中場', T.mid], ['防守', T.def]].map(([k, v]) => `<div class="xstat"><div class="v">${v}</div><div class="k">${k}</div><div class="bar"><i style="width:${clamp((v - 40) / 55 * 100, 0, 100)}%"></i></div></div>`).join('')}</div>
        <p class="note" style="margin:6px 0 0">默契加成 <b style="color:var(--amber)">+${T.chem}</b> · 戰術風格 <b>${c.tac && TACP[c.tac] ? TACP[c.tac].n : '未揀'}</b>${tx && tx.fit ? `（${tx.fit}）` : ''} · 球隊默契 ${Math.round(cohOf(c))}</p>`)}
      ${pan('陣式', `<div class="row">${FLIST().map(f => `<button class="chip" data-act="pform" data-a="${f}" aria-pressed="${c.form === f}">${f}</button>`).join('')}${c.cust ? `<button class="chip" data-act="pform" data-a="${CUSTK(cid)}" aria-pressed="${isCust(c.form)}">自訂</button>` : ''}</div>`)}
      ${pan(`預備組 <span class="r">${res.length} 人 · 全隊 ${roster(cid).length} 人</span>`, `<div class="plist">${res.map(p => pitemX(p, 'r' + p)).join('') || '<p class="note">冇預備球員。</p>'}</div>`, { st: 'flex:1;min-height:180px' })}
    </div>
  </div>`);
};

/* drag & drop on the board: cards on the pitch, bench cards and list items */
let XD = null;
function xTarget(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return null;
  const sl = el.closest('#sqp .slot[data-i]'); if (sl && 'x' + sl.dataset.i !== XD.src) return { k: 'x' + sl.dataset.i, el: sl };
  const o = el.closest('.bslot[data-k], .pitem[data-k]'); if (o && o.dataset.k !== XD.src) return { k: o.dataset.k, el: o };
  const p = el.closest('#sqp');
  if (p && XD.src[0] === 'x') { const r = p.getBoundingClientRect(); return { move: [clamp((e.clientX - r.left) / r.width * 100, 5, 95), clamp(YU((e.clientY - r.top) / r.height * 100), 5, 95)] }; }
  return null;
}
function xEnd() { if (!XD) return; XD.g?.remove(); XD.el.classList.remove('dragging'); $$('.dropon').forEach(x => x.classList.remove('dropon')); XD = null; }
document.addEventListener('pointerdown', e => {
  if (SCR !== 'squad' || XD || e.button > 0) return;
  if (e.target.closest('a,select,input,.btn,.chip,.ib')) return;
  const el = e.target.closest('#sqp .slot[data-i], .bslot[data-k], .pitem[data-k]'); if (!el) return;
  const src = el.dataset.i != null ? 'x' + el.dataset.i : el.dataset.k;
  XD = { src, el, x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false };
  e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
});
document.addEventListener('pointermove', e => {
  if (!XD || e.pointerId !== XD.id) return;
  if (!XD.on) {
    if (Math.hypot(e.clientX - XD.x0, e.clientY - XD.y0) < 6) return;
    XD.on = true; const pid = sqGet(myClub(), XD.src);
    XD.g = Object.assign(document.createElement('div'), { className: 'xdg', innerHTML: pid ? cardHTML(pid) : '<div class="empty" style="font-size:8px"><b>+</b></div>' });
    document.body.appendChild(XD.g); XD.el.classList.add('dragging');
  }
  XD.g.style.left = e.clientX + 'px'; XD.g.style.top = e.clientY + 'px';
  XD.g.hidden = true; const t = xTarget(e); XD.g.hidden = false;
  $$('.dropon').forEach(x => x.classList.remove('dropon')); if (t && t.el) t.el.classList.add('dropon');
});
document.addEventListener('pointerup', e => {
  if (!XD || e.pointerId !== XD.id) return;
  const d = XD; if (d.g) d.g.hidden = true; const t = d.on ? xTarget(e) : null; xEnd();
  if (!d.on) return ACT.sq({ dataset: { k: d.src } });   // a tap = select, a second tap = swap
  NOCLICK = true; setTimeout(() => { NOCLICK = false; }, 0);
  if (!t) return;
  if (t.k) sqSwap(d.src, t.k); else moveSlot(+d.src.slice(1), ...t.move);
  UI.sel = null; save(); render();
});
document.addEventListener('pointercancel', xEnd);
document.addEventListener('dblclick', e => { if (SCR !== 'squad') return; const s = e.target.closest('#sqp .slot[data-i]'); if (s) { const pid = myClub().xi[+s.dataset.i]; if (pid) openPlayer(pid); } });

/* ---------- 戰術 ---------- */
SCREENS.tactics = () => {
  const c = myClub(), cid = myCid(), f = UI.tf || c.form, T = teamEval(cid, f, f === c.form ? c.xi : Array(11).fill(null)), cap = taker(T.S, 'cap');
  const fits = Object.fromEntries(Object.keys(TACP).map(k => [k, tacFit(k, T.S.on)]));
  main(`${hdr('戰術', info('戰術風格（嚟自傳奇十一人）：一撳就幫你設定打法，仲會按場上球員特性加減能力：「好適合」加得多，「唔適合」反而會扣。擺大巴同全力進攻係固定加減。之後仍然可以自己再調打法。陣式同打法會影響每分鐘嘅進攻、防守同控球計算，比賽中途都可以改。'))}
  <div class="xsq">
    <div class="xr">
      ${pan('戰術風格', `<div class="tacs">${Object.entries(TACP).map(([k, t]) => `<button class="chip" data-act="tacp" data-a="${k}" aria-pressed="${c.tac === k}" title="${esc(t.d)}">${t.n}<small>${fits[k].fit || (k === 'bal' ? '冇加減' : k === 'bus' ? '防守 ++ 進攻 −−' : '進攻 ++ 防守 −−')}</small></button>`).join('')}</div>`)}
      ${pan('陣式', `<div class="row">${[...FLIST(), ...(c.cust ? [CUSTK(cid)] : [])].map(k => `<button class="chip" data-act="tform" data-a="${k}" aria-pressed="${k === f}">${fname(k)}</button>`).join('')}</div>${f !== c.form ? `<div class="row" style="margin-top:8px"><button class="btn y" data-act="setform" data-a="${f}">用 ${fname(f)}</button><span class="note">而家用緊 ${fname(c.form)}</span></div>` : ''}`)}
      ${pan('打法', `<table><tbody>${Object.entries(STYLE).map(([k, v]) => `<tr><td style="width:120px">${STYLEN[k]} ${info(STYLEI[k])}</td><td><div class="row">${v.map((t, i) => `<button class="chip" data-act="sty" data-a="${k}:${i}" aria-pressed="${c.sty[k] === i}">${t}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>`)}
      ${pan(`隊長 · 定位球 ${info('揀隊長同各種定位球主罰。揀「自動」或者揀咗嘅人唔喺場上，就由場上最適合嘅人負責。隊長喺場會令全隊表現略為提升。角球同長罰球睇傳球同控球，短罰球（直接射門）睇射門同傳球，十二碼睇射門同控球。')}`, `<table class="spt"><tbody>${Object.entries(SPR).map(([k, t]) => { const ros = roster(cid).filter(p => ps(p).pos !== 'GK').sort((a, b) => SPW[k](b) - SPW[k](a)), curp = (c.sp || {})[k], auto = bestFor(k, c.xi.filter(Boolean)); return `<tr><td style="width:90px">${t}</td><td><select class="inp" data-ch="sp" data-a="${k}" aria-label="${t}"><option value="">自動${auto ? `（${esc(ps(auto).sn)}）` : ''}</option>${ros.map(p => `<option value="${p}" ${p === curp ? 'selected' : ''}>${esc(ps(p).sn)} · ${ps(p).pos} · ${Math.round(k === 'cap' ? pd(p).sk : k === 'pk' ? attrs(p)[5] : k === 'fks' ? (attrs(p)[5] + attrs(p)[4]) / 2 : attrs(p)[4])}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table>`)}
      ${pan(`個人指令 ${info('盤扭、傳中、遠射：多啲用嗰種方法進攻。前插：多啲插入禁區，但防守少咗。留守：少啲上前，幫手防守。盯人：貼身跟住對手。')}`, `<table><tbody>${c.xi.filter(Boolean).map(p => `<tr><td class="nm">${pl(p)}</td><td class="n">${ps(p).pos}</td><td><select class="inp" data-ch="ord" data-a="${p}" aria-label="個人指令">${Object.entries(ORDERS).map(([v, t]) => opt(v, t, c.ord[p] || 'n')).join('')}</select></td></tr>`).join('')}</tbody></table>`)}
    </div>
    <div class="xl"><div class="xpitch">${XPITCH}${FORMS[f].map((_, i) => slotX(cid, f === c.form ? c.xi : Array(11).fill(null), f, i, T.ch, cap, false)).join('')}</div></div>
  </div>`);
};

/* ---------- 球探抽卡 ---------- */
SCREENS.gacha = () => {
  const c = myClub(), sc = c.st.scout, pool = gachaPool(), top = Object.keys(G.pl).filter(p => pd(p).c !== 'ret').sort((a, b) => pd(b).sk - pd(a).sk).slice(0, 3);
  const ur = Object.keys(G.pl).filter(p => pd(p).c !== 'ret' && GRADE(pd(p).sk) === 'UR').sort((a, b) => pd(b).sk - pd(a).sk);
  const rate = (g, p) => (g === 'C' ? p - sc * 1.5 : g === 'SR' ? p + sc * 1.5 : p);
  main(`${hdr('球探抽卡', `<span class="mute">資金 ${G.inf ? '∞' : money(c.cash)} · 已抽 ${G.stats.pulls} 次</span>`)}
  <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr);overflow:auto">
    <section class="banner">
      <div class="fan">${top.map((p, k) => cardHTML(p).replace('class="card', `style="--rot:${-10 + k * 10}deg;--ty:${k === 1 ? -10 : 6}px" class="card`)).join('')}</div>
      <div class="lbl" style="color:#ffd9f7">${esc(ERA.n || '')} 全世界卡池 · ${sum(Object.values(pool).map(a => a.length)).toLocaleString()} 張卡</div>
      <h3>全世界球員<br>一抽即加盟</h3>
      <p>球探幫你喺全世界搵人：抽中其他球會嘅球員即刻免轉會費加盟（新合約，週薪照計）。抽中自己球員就係重複卡，可以喺卡冊幫佢升級（每級 +1 評分，最多 +${CLVMAX}）或者賣錢。十連抽保底一張 SR 或以上。</p>
      <div class="pullbtns"><button class="btn y" data-act="pull" data-a="10">十連抽 · ${money(pullCost(10))}</button><button class="btn" data-act="pull" data-a="1">單抽 · ${money(pullCost(1))}</button></div>
    </section>
    <div class="rates">${GRATES.map(([g, p]) => `<div class="rate"><b style="color:${{ UR: '#ffb8f5', SSR: '#ffd666', SR: '#b98aff', R: '#73a6ff', C: '#aab3c5' }[g]}">${g}</b><span>${rate(g, p).toFixed(1)}% · ${{ UR: '90+', SSR: '85–89', SR: '77–84', R: '68–76', C: '67 或以下' }[g]}</span></div>`).join('')}</div>
    ${pan(`UR 名單（${ur.length}）${info('呢個年代能力 90 或以上嘅球員。有顏色＝你已經收集咗。撳卡睇資料。球探等級越高，SR 機率越高。')}`, `<div class="urrow">${ur.map(p => cardHTML(p, { dim: !owns(p), open: 1 })).join('') || '<p class="note">呢個年代冇 UR 球員。</p>'}</div>`, { t: 1 })}
  </div>`);
};
function xPull(n) {
  const r = gachaPull(n); if (r.err) return toast(r.err);
  save(); render();
  let ov = $('#xov'); if (!ov) { ov = Object.assign(document.createElement('div'), { id: 'xov', className: 'xov' }); document.body.appendChild(ov); const fl = Object.assign(document.createElement('div'), { id: 'xflash', className: 'xflash' }); document.body.appendChild(fl); }
  ov.hidden = false;
  ov.innerHTML = `<div class="pullgrid ${n === 1 ? 'one' : ''}">${r.out.map((o, k) => `<div class="xflip h-${o.g}" data-k="${k}"><div class="in"><div class="back">XI</div>${cardHTML(o.pid, { badge: o.n > 1 ? `<span class="cbadge dup">重複 ×${o.n}</span>` : '<span class="cbadge new">NEW</span>' })}</div><div class="fst ${o.full ? 'bad' : o.dup ? '' : 'good'}">${o.full ? '球隊滿員，退還部分費用' : o.dup ? '重複卡 · 可以升級' : `由 ${esc(clubShort(o.from))} 加盟`}</div></div>`).join('')}</div>
  <div class="ovfoot"><button class="btn" data-x="all">全部翻開</button><button class="btn y" data-x="again">再抽一次</button><button class="btn" data-x="done">完成</button></div>`;
  const flips = [...ov.querySelectorAll('.xflip')], timers = [];
  const reveal = f => { if (f.classList.contains('on')) return; f.classList.add('on'); const g = r.out[+f.dataset.k].g; if (g === 'UR' || g === 'SSR') xFlash(g); };
  flips.forEach((f, k) => { timers.push(setTimeout(() => reveal(f), 450 + k * 170)); f.onclick = () => reveal(f); });
  ov.onclick = e => { const b = e.target.closest('[data-x]'); if (!b) return; timers.forEach(clearTimeout);
    if (b.dataset.x === 'all') return flips.forEach(reveal);
    ov.hidden = true; ov.innerHTML = ''; if (b.dataset.x === 'again') xPull(n); };
}
function xFlash(g) { const f = $('#xflash'); f.style.background = g === 'UR' ? 'radial-gradient(circle,#fff,#ffc6f7 40%,transparent 75%)' : 'radial-gradient(circle,#fff6d5,#ffc94a55 45%,transparent 75%)'; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* ---------- 卡冊 ---------- */
UI.al = UI.al || { g: 'ALL', l: 'ALL', q: '', all: false, n: 120 };
SCREENS.album = () => {
  cardsInit();
  const A = UI.al, all = Object.keys(G.pl).filter(p => pd(p).c !== 'ret' && !ps(p).yth);
  const own = all.filter(owns), grades = ['UR', 'SSR', 'SR', 'R', 'C'];
  const byG = grades.map(g => [g, own.filter(p => GRADE(pd(p).sk) === g).length, all.filter(p => GRADE(pd(p).sk) === g).length]);
  const spare = own.reduce((t, p) => t + owns(p) - 1, 0), spareV = own.reduce((t, p) => t + (owns(p) - 1) * dupValue(p), 0);
  const q = A.q.toLowerCase();
  const list = (A.all ? all : own).filter(p => (A.g === 'ALL' || GRADE(pd(p).sk) === A.g) && (A.l === 'ALL' || LINE[ps(p).pos] === A.l) && (!q || (ps(p).name + ' ' + clubName(pd(p).c)).toLowerCase().includes(q))).sort((a, b) => cardR(b) - cardR(a));
  main(`${hdr('卡冊', info('收集咗嘅卡：球探抽過、或者曾經喺你球隊嘅球員。撳「顯示未收集」睇晒呢個年代所有球員（灰色）。撳卡睇資料：重複卡可以幫自己球員升級（每級 +1 評分），或者賣返做資金。'))}
  <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
    <div class="prog"><span>已收集 <b>${own.length.toLocaleString()}</b> / ${all.length.toLocaleString()}</span>${byG.map(([g, a, b]) => `<span>${g} <b>${a}</b>/${b}</span>`).join('')}<span>重複卡 <b>${spare}</b></span>${spare ? `<button class="btn sm" data-act="sellall">賣晒重複卡 · +${money(spareV)}</button>` : ''}</div>
    <div class="row">${['ALL', ...grades].map(g => `<button class="chip" data-act="alg" data-a="${g}" aria-pressed="${A.g === g}">${g === 'ALL' ? '全部' : g}</button>`).join('')}
      ${[['ALL', '全部位置'], ['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒']].map(([l, n]) => `<button class="chip" data-act="all" data-a="${l}" aria-pressed="${A.l === l}">${n}</button>`).join('')}
      <input class="inp" id="alq" placeholder="搜尋球員、球會" value="${esc(A.q)}" style="flex:1 1 160px;min-width:0"><button class="chip" data-act="alall" aria-pressed="${A.all}">顯示未收集</button></div>
    ${pan(`${list.length.toLocaleString()} 張`, list.length ? `<div class="agrid">${list.slice(0, A.n).map(p => cardHTML(p, { dim: !owns(p), count: owns(p), open: 1 })).join('')}</div>${list.length > A.n ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-act="almore">顯示多 120 張（仲有 ${(list.length - A.n).toLocaleString()} 張）</button></div>` : ''}` : '<p class="note">未有卡。去「球探抽卡」開始收集。</p>', { t: 1, st: 'min-height:0' })}
  </div>`);
};
// card panel inside the player sheet (ui.js drawPlayer)
function cardPanel(pid) {
  const n = owns(pid); if (!n) return '';
  const u = upInfo(pid), mine = pd(pid).c === myCid();
  return `<div class="pan" style="margin-top:8px"><h3>卡牌 · Lv ${u.l} / ${CLVMAX} <span class="r">擁有 ×${n} · 重複 ${n - 1}</span></h3><div class="pb">
    <div class="lvbar">${Array.from({ length: CLVMAX }, (_, k) => `<i class="${k < u.l ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row">${u.l < CLVMAX ? `<button class="btn y" data-act="cup" data-a="${pid}" ${mine && u.spare >= u.need ? '' : 'disabled'}>升到 Lv${u.l + 1} · 評分 ${cardR(pid)} → ${cardR(pid) + 1}</button><span class="note">要 ${u.need} 張重複卡 + ${G.inf ? '免費' : money(u.cost)}${mine ? '' : '（只可以升自己球隊嘅球員）'}</span>` : '<span class="note">已經升到最高級</span>'}
    <button class="btn" data-act="csell" data-a="${pid}" ${n > 1 ? '' : 'disabled'}>賣 1 張重複 · +${money(dupValue(pid))}</button></div></div></div>`;
}

/* ---------- actions ---------- */
Object.assign(ACT, {
  pull: el => { closeModal(); xPull(+el.dataset.a); },
  tacp: el => { setTac(el.dataset.a); save(); render(); toast(`戰術風格：${TACP[el.dataset.a].n}`); },
  alg: el => { UI.al.g = el.dataset.a; UI.al.n = 120; render(); },
  all: el => { UI.al.l = el.dataset.a; UI.al.n = 120; render(); },
  alall: () => { UI.al.all = !UI.al.all; UI.al.n = 120; render(); },
  almore: () => { UI.al.n += 120; render(); },
  sellall: el => {
    if (!el.dataset.armed) { el.dataset.armed = 1; el.textContent = '再撳一次確認（升級要用重複卡）'; return; }
    let v = 0; for (const p of Object.keys(G.cards || {})) if (G.pl[p] && owns(p) > 1) v += cardSell(p, true);
    save(); render(); toast(`賣咗所有重複卡 +${money(v)}`);
  },
  cup: el => { const err = cardUpgrade(el.dataset.a); if (err) return toast(err); save(); drawPlayer(); render(); toast(`${ps(el.dataset.a).sn} 升到 Lv${clvOf(el.dataset.a)}！`); },
  csell: el => { const v = cardSell(el.dataset.a); if (!v) return; save(); drawPlayer(); render(); toast(`賣咗 1 張重複卡 +${money(v)}`); },
});
document.addEventListener('input', e => { if (e.target.id === 'alq') { UI.al.q = e.target.value; UI.al.n = 120; const pos = e.target.selectionStart; render(); const q = $('#alq'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
