/* =====================================================================
   傳奇十一人 screens in career mode (logic in fm/xi.js, styles in fm/xi.css). Loaded after life-ui.js.
   陣容: card board on a turf pitch (drag cards between pitch, bench and list; drag onto grass to move a position)
   戰術: tactic styles + sliders + set pieces + individual orders, card pitch preview
   球探抽卡: banner + pack opening (flip, flash, NEW / duplicate badges)
   卡冊: every player of the era as a card; collected ones in colour; upgrades with duplicates in the player sheet
   ===================================================================== */
const XPITCH = `<svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".35"><rect x="2" y="2" width="64" height="96"/><line x1="2" y1="50" x2="66" y2="50"/><circle cx="34" cy="50" r="9.15"/><rect x="13.8" y="2" width="40.4" height="16.5"/><rect x="24.8" y="2" width="18.4" height="5.5"/><rect x="13.8" y="81.5" width="40.4" height="16.5"/><rect x="24.8" y="92.5" width="18.4" height="5.5"/><path d="M26.7 18.5 A9.15 9.15 0 0 0 41.3 18.5"/><path d="M26.7 81.5 A9.15 9.15 0 0 1 41.3 81.5"/></g></svg>`;
function cardHTML(pid, o = {}) {
  const d = pd(pid), p = ps(pid), g = gradeOf(pid), lv = o.dim ? 0 : clvOf(pid);
  const where = (p.leg ? '傳奇 · ' : '') + (d.c === 'free' ? '自由身' : d.c === 'ret' ? '退休' : clubShort(d.c));
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
  return { cid, key: 'h', form: form || c.form, on: f.map((s, i) => ({ pid: xi[i] && avail(xi[i]) ? xi[i] : null, slot: s[0], x: s[1], y: s[2] })), sty: c.sty, ord: c.ord || {}, sp: c.sp || {} };
}
function teamEval(cid, form, xi) {
  const S = boardSide(cid, form, xi), r = sideRatings(S, { f: null }), ch = chemMap(S.on.map(o => o.pid).filter(Boolean));
  return { att: Math.round(r.att), def: Math.round(r.def), mid: Math.round(r.mid), ovr: Math.round((r.att + r.def + r.mid) / 3), ch, chem: sum(Object.values(ch)), S };
}

/* ---------- pitch slots and bench ---------- */
function slotX(cid, xi, form, i, ch, cap, drag) {
  const pid = xi[i], [pos, x, y] = FORMS[form][i];
  const f = pid ? fitP(pid, pos) : 1, S0 = { cid, form }, pb = pid ? prefBonus(S0, pid) : 0, eff = pid ? Math.round(cardR(pid) * f) + (ch[pid] || 0) + pb : 0, e = f >= 1 ? 'e1' : f >= .9 ? 'e2' : 'e3';
  const pr = pid ? prefOf(pid) : null, c0 = G.clubs[cid], likeT = pr && c0.tac && c0.tac === pr.tac, likeF = pr && pr.form === form;
  const lk = pid ? chemLinks(pid, xi.filter(Boolean)) : null;
  const out = pid && !avail(pid) ? (pd(pid).inj ? '傷' : '停賽') : '';
  return `<div class="slot ${drag && UI.sel === 'x' + i ? 'selp' : ''}" ${drag ? `data-i="${i}"` : ''} style="left:${x}%;top:${YB(y)}%${y >= 86 ? ';transform:translate(-50%,-36%)' : ''}">
    ${pid ? `<div style="position:relative">${cardHTML(pid, { cls: out ? 'inj' : '' })}${ch[pid] ? `<span class="chem" title="默契 +${ch[pid]}：同國籍 ${lk.nat} 人、老拍檔 ${lk.bond} 人">+${ch[pid]}</span>` : ''}${pid === cap ? '<span class="capx" title="隊長">C</span>' : ''}<span class="snm">${esc(ps(pid).sn)}</span></div>` : `<div class="empty"><span><b>+</b><br>${pos}</span></div>`}
    <span class="stag">${pos}${pid ? (out ? ` <span class="e3">${out}</span>` : ` <span class="${e}" title="${f < 1 ? `踢${esc(POSN[pos])}：本位 ${cardR(pid)} × ${Math.round(f * 100)}%` : '本位'}${ch[pid] ? ` + 默契 ${ch[pid]}` : ''}${likeT ? ' + 啱戰術 1' : ''}${likeF ? ' + 啱陣式 1' : ''}">${eff}</span>${likeT ? '<i class="lk" title="佢鍾意呢個戰術風格">戰</i>' : ''}${likeF ? '<i class="lk" title="佢鍾意呢個陣式">陣</i>' : ''}`) : ''}</span>${pid && !out && pd(pid).cond < 100 ? sbarX(pd(pid).cond) : ''}</div>`;
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
  const yts = roster(cid).filter(inYouth).length;
  const sqf = UI.sqf || '';
  const res = roster(cid).filter(p => !inXI.has(p) && !inSB.has(p) && !inYouth(p) && (!sqf || (sqf.length === 1 ? lineOf(ps(p).pos) === sqf : ps(p).pos === sqf || pos2P(p).includes(sqf)))).sort((a, b) => POSORD.indexOf(ps(a).pos) - POSORD.indexOf(ps(b).pos) || cardR(b) - cardR(a));
  const probs = lineupProblems(cid), plans = c.plans || [], cur = c.plan ?? 0, tx = xiTac(T.S);
  main(`${hdr('陣容', `${[0, 1, 2].map(i => `<button class="chip" data-act="plan" data-a="${i}" aria-pressed="${cur === i}">方案 ${'ABC'[i]}${plans[i] ? '' : '（空）'}</button>`).join('')}<button class="btn sm" data-act="plansave">存入方案 ${'ABC'[cur]}</button><button class="btn" data-act="autopick">自動排陣</button>${info('拖住張卡：放喺另一張卡上面＝兩個人對調；放喺草地空位＝將嗰個位置移過去（位置跟住變，變自訂陣式）；拖去後備或者右邊名單都得。唔想拖：撳一張卡揀咗佢，再撳另一張對調。卡上面大數字係球員評分（包括卡牌等級），下面標籤係佢喺嗰個位置嘅實際能力：綠色＝本位，黃色＝相近位置扣少少，紅色＝扣得多。黃色圓點係默契加成：正選入面同國籍隊友越多，加 1–2 分。白色 C 係隊長。撳球員個名睇詳細資料。')}${probs.length ? `<span class="bad">${esc(probs.slice(0, 2).join('；'))}</span>` : ''}`)}
  <div class="xsq">
    <div class="xl">
      <div class="xpitch" id="sqp">${XPITCH}${FORMS[c.form].map((_, i) => slotX(cid, c.xi, c.form, i, T.ch, cap, true)).join('')}</div>
      <div class="brow${benchN() > 5 ? ' two' : ''}" style="--bc:${benchN() > 5 ? Math.ceil(benchN() / 2) : 5}">${Array.from({ length: benchN() }, (_, i) => benchX(c, i)).join('')}</div>
    </div>
    <div class="xr">
      ${pan(`球隊實力 <span class="r">${fname(c.form)}</span>`, `<div class="xstats">${[['總評', T.ovr], ['進攻', T.att], ['中場', T.mid], ['防守', T.def]].map(([k, v]) => `<div class="xstat"><div class="v">${v}</div><div class="k">${k}</div><div class="bar"><i style="width:${clamp((v - 40) / 55 * 100, 0, 100)}%"></i></div></div>`).join('')}</div>
        <p class="note" style="margin:6px 0 0">默契加成 <b style="color:var(--amber)">+${T.chem}</b> · 喜好加成 <b style="color:var(--amber)">+${T.S.on.filter(o => o.pid).reduce((t, o) => t + prefBonus(T.S, o.pid), 0)}</b> ${info('默契：正選入面每個球員同其他十個人嘅聯繫——同國籍 +1；同一間舊球會出身、或者一齊喺呢度踢咗一年以上（老拍檔）+1。3 個聯繫 +1、6 個 +2、9 個 +3。新簽球員要一齊踢一年先會變老拍檔。喜好：每個球員有自己最啱嘅戰術風格同陣式，用中佢鍾意嘅每樣 +1（卡下面標「戰」「陣」）。撳球員睇佢鍾意乜。')} · 戰術風格 <b>${c.tac && TACP[c.tac] ? TACP[c.tac].n : '未揀'}</b>${tx && tx.fit ? `（${tx.fit}）` : ''} · 球隊默契 ${Math.round(cohOf(c))}</p>`)}
      ${pan('陣式', `<div class="row">${FLIST().map(f => `<button class="chip" data-act="pform" data-a="${f}" aria-pressed="${c.form === f}">${f}</button>`).join('')}${c.cust ? `<button class="chip" data-act="pform" data-a="${CUSTK(cid)}" aria-pressed="${isCust(c.form)}">自訂</button>` : ''}</div>`)}
      ${pan(`預備組 <select class="inp" data-ch="sqf" aria-label="篩選位置" style="font-size:12px;padding:2px 4px">${[['', '全部位置'], ['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒'], ...Object.keys(POSN).map(k => [k, `${k} ${POSN[k]}（包括次位置）`])].map(([v, t]) => opt(v, t, sqf)).join('')}</select> <span class="r">${res.length} 人 · 全隊 ${roster(cid).length} 人${yts ? ` · 青年軍 ${yts} 人（喺「合約」升降）` : ''}</span>`, `<div class="plist">${res.map(p => pitemX(p, 'r' + p)).join('') || '<p class="note">冇預備球員。</p>'}</div>`, { st: 'flex:1;min-height:180px' })}
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
  const likes = {}, flikes = {}; for (const p of c.xi.filter(Boolean)) { const pr = prefOf(p); likes[pr.tac] = (likes[pr.tac] || 0) + 1; if (pr.form) flikes[pr.form] = (flikes[pr.form] || 0) + 1; }
  main(`${hdr('戰術', info('戰術風格（嚟自傳奇十一人）：一撳就幫你設定打法，仲會按場上球員特性加減能力：「好適合」加得多，「唔適合」反而會扣。擺大巴同全力進攻係固定加減。之後仍然可以自己再調打法。陣式同打法會影響每分鐘嘅進攻、防守同控球計算，比賽中途都可以改。'))}
  <div class="xsq">
    <div class="xr">
      ${pan('戰術風格', `<div class="tacs">${Object.entries(TACP).map(([k, t]) => `<button class="chip" data-act="tacp" data-a="${k}" aria-pressed="${c.tac === k}" title="${esc(t.d)}">${t.n}<small>${fits[k].fit || (k === 'bal' ? '冇加減' : k === 'bus' ? '防守 ++ 進攻 −−' : '進攻 ++ 防守 −−')}${likes[k] ? ` · ${likes[k]} 人鍾意` : ''}</small></button>`).join('')}</div>`)}
      ${pan('陣式', `<div class="row">${[...FLIST(), ...(c.cust ? [CUSTK(cid)] : [])].map(k => `<button class="chip" data-act="tform" data-a="${k}" aria-pressed="${k === f}" title="${flikes[k] || 0} 個正選鍾意">${fname(k)}${flikes[k] ? ` <small>♥${flikes[k]}</small>` : ''}</button>`).join('')}</div>${f !== c.form ? `<div class="row" style="margin-top:8px"><button class="btn y" data-act="setform" data-a="${f}">用 ${fname(f)}</button><span class="note">而家用緊 ${fname(c.form)}</span></div>` : ''}`)}
      ${pan('打法', `<table><tbody>${Object.entries(STYLE).map(([k, v]) => `<tr><td style="width:120px">${STYLEN[k]} ${info(STYLEI[k])}</td><td><div class="row">${v.map((t, i) => `<button class="chip" data-act="sty" data-a="${k}:${i}" aria-pressed="${c.sty[k] === i}">${t}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>`)}
      ${pan(`隊長 · 定位球 ${info('揀隊長同各種定位球主罰。揀「自動」或者揀咗嘅人唔喺場上，就由場上最適合嘅人負責。隊長喺場會令全隊表現略為提升。角球同長罰球睇傳球同控球，短罰球（直接射門）睇射門同傳球，十二碼睇射門同控球。')}`, `<table class="spt"><tbody>${Object.entries(SPR).map(([k, t]) => { const ros = roster(cid).filter(p => ps(p).pos !== 'GK').sort((a, b) => SPW[k](b) - SPW[k](a)), curp = (c.sp || {})[k], auto = bestFor(k, c.xi.filter(Boolean)); return `<tr><td style="width:90px">${t}</td><td><select class="inp" data-ch="sp" data-a="${k}" aria-label="${t}"><option value="">自動${auto ? `（${esc(ps(auto).sn)}）` : ''}</option>${ros.map(p => `<option value="${p}" ${p === curp ? 'selected' : ''}>${esc(ps(p).sn)} · ${ps(p).pos} · ${Math.round(k === 'cap' ? pd(p).sk : k === 'pk' ? attrs(p)[5] : k === 'fks' ? (attrs(p)[5] + attrs(p)[4]) / 2 : attrs(p)[4])}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table>`)}
      ${pan(`個人指令 ${info('盤扭、傳中、遠射：多啲用嗰種方法進攻。前插：多啲插入禁區，但防守少咗。留守：少啲上前，幫手防守。盯人：貼身跟住對手。')}`, `<table><tbody>${c.xi.filter(Boolean).map(p => `<tr><td class="nm">${pl(p)}</td><td class="n">${ps(p).pos}</td><td><select class="inp" data-ch="ord" data-a="${p}" aria-label="個人指令">${Object.entries(ORDERS).map(([v, t]) => opt(v, t, c.ord[p] || 'n')).join('')}</select></td></tr>`).join('')}</tbody></table>`)}
    </div>
    <div class="xl"><div class="xpitch">${XPITCH}${FORMS[f].map((_, i) => slotX(cid, f === c.form ? c.xi : Array(11).fill(null), f, i, T.ch, cap, false)).join('')}</div></div>
  </div>`);
};

/* ---------- 球探抽卡 ---------- */
// card for a legend not pulled yet (or any legend row): same look, data from fm/legends.js
function legCardHTML(id, o = {}) {
  if (G.pl[id]) return cardHTML(id, o);
  const L = legendCard(id), g = gradeP(L.sk, L.pos);
  return `<div class="card g-${g} ${o.dim ? 'dim' : ''}" title="${esc(L.name)} · ${esc(L.meta)}"><div class="c-top"><span class="c-r">${L.sk}</span><span class="c-g">${g}</span></div><div class="c-pos">${L.pos}</div><div class="c-nat">${L.nat}</div><div class="c-name">${esc(L.sn)}</div><div class="c-meta">傳奇 · ${esc(L.meta)}</div></div>`;
}
UI.gp = UI.gp || { leg: false, nat: '', line: '', lg: '', young: false };
const GPLINE = [['', '全部位置'], ['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒']];
const GPSRC = [['now', '當代球員'], ['leg', '傳奇球星'], ['yth', '青年軍']];
// a young legend as a card (pulled or not)
function jCardHTML(j, o = {}) {
  if (G.pl[j]) return cardHTML(j, o);
  const L = yLegRow(j), g = gradeP(L[3], L[1]), sn = L[6] || shortName(L[0]);
  return `<div class="card g-${g} ${o.dim ? 'dim' : ''}" title="${esc(L[0])} · 青年版 · 潛力 ${L[3]}"><div class="c-top"><span class="c-r">?</span><span class="c-g">${g}</span></div><div class="c-pos">${L[1]}</div><div class="c-nat">${L[2]}</div><div class="c-name">${esc(sn)}</div><div class="c-meta">青年版 · 潛力 ${L[3]}</div></div>`;
}
function gachaYouth() {
  const c = myClub(), sc = c.st.scout, o = UI.gp, mult = poolMult(o), lp = yLegPool(o), rp = yRealPool(o), nReal = poolSize(rp);
  const all = yLegIds().filter(j => { const L = yLegRow(j); return (!o.line || lineOf(L[1]) === o.line) && (!o.nat || L[2] === o.nat); });
  const top = all.filter(j => gradeP(yLegRow(j)[3], yLegRow(j)[1]) === 'UR').sort((a, b) => yLegRow(b)[3] - yLegRow(a)[3]);
  const fan = top.filter(j => !G.y[j]).slice(0, 3);
  const nats = [...new Set(yLegIds().map(j => yLegRow(j)[2]))].map(k => [k, yLegIds().filter(j => yLegRow(j)[2] === k).length]).filter(([, k]) => k >= 3).sort((a, b) => b[1] - a[1]);
  const rate = (g, p) => (g === 'C' ? p - sc * 1.5 : g === 'SR' ? p + sc * 1.5 : p);
  const cost = k => Math.round(pullCost(k) * mult / 1e3) * 1e3;
  const ys = roster(myCid()).filter(inYouth).length;
  main(`${hdr('球探抽卡', `<span class="mute">資金 ${G.inf ? '∞' : money(c.cash)} · 已抽 ${G.stats.pulls} 次 · 青年軍 ${ys} 人</span>${info(`青年軍卡池：每張卡都係一個 18 歲或以下（U18）嘅球員，抽中直接加入你嘅青年軍（唔使轉會費，週薪好低，唔計一隊 ${SQMAX} 人上限）。有啲係其他球會真實嘅 U18 球員（有真實青年軍資料嘅球季先有，例如 2025/26），其餘係球探搵返嚟嘅新秀；卡牌等級就係佢嘅潛力：UR 潛力 90 或以上，SSR 85–89，SR 78–84，R 70–77，C 60–69；而家能力低，要喺青年軍同一隊慢慢操上去。抽中 SR 或以上，有 ${Math.round(YGLEG * 100)}% 機會係「傳奇青年版」：傳奇球星 16–17 歲嘅樣，潛力就係佢巔峰嘅能力，每個傳奇只得一個。價錢係當代卡池嘅一半；揀國籍或位置就 ×1.5（國籍只影響傳奇青年版同新秀國籍）。十連抽保底一張 SR 或以上。`)}`)}
  <div class="cols" style="grid-template-rows:auto auto auto minmax(0,1fr);overflow:auto">
    <div class="row">${chips(GPSRC, 'yth', 'gpsrc')}
      <select class="inp" data-ch="gpnat" aria-label="國籍"><option value="">全部國籍</option>${nats.map(([k, m]) => opt(k, `${natName(k)}（${m}）`, o.nat)).join('')}</select>
      ${chips(GPLINE, o.line, 'gpline')}
      ${o.nat || o.line ? '<button class="btn sm" data-act="gpclear">清除條件</button>' : ''}</div>
    <section class="banner">
      <div class="fan">${fan.map((p, k) => jCardHTML(p).replace('class="card', `style="--rot:${-10 + k * 10}deg;--ty:${k === 1 ? -10 : 6}px" class="card`)).join('')}</div>
      <div class="lbl" style="color:#ffd9f7">青年軍（U18）卡池${o.nat ? ' · ' + esc(natName(o.nat)) : ''}${o.line ? ' · ' + GPLINE.find(x => x[0] === o.line)[1] : ''}${nReal ? ` · 真實 U18 球員 ${nReal.toLocaleString()} 人` : ''} · 傳奇青年版尚餘 ${poolSize(lp)} 個</div>
      <h3>未來之星<br>直入青年軍</h3>
      <p>球探走遍全世界搵 U18 天才新秀${nReal ? "，包括各大球會青年軍嘅真實球員" : ""}；運氣好仲會搵到少年時代嘅傳奇球星。${mult !== 1 ? ` 呢個卡池價錢 ×${mult}。` : ''}</p>
      <div class="pullbtns"><button class="btn y" data-act="pull" data-a="10">十連抽 · ${money(cost(10))}</button><button class="btn" data-act="pull" data-a="1">單抽 · ${money(cost(1))}</button></div>
    </section>
    <div class="rates">${GRATES.map(([g, p]) => `<div class="rate"><b style="color:${{ UR: '#ffb8f5', SSR: '#ffd666', SR: '#b98aff', R: '#73a6ff', C: '#aab3c5' }[g]}">${g}</b><span>${rate(g, p).toFixed(1)}% · 潛力 ${YGPOT[g][0]}${g === 'UR' ? '+' : '–' + YGPOT[g][1]}</span></div>`).join('')}</div>
    ${pan(`傳奇青年版 UR（${top.length}）${info('潛力 90 或以上嘅傳奇青年版。有顏色＝你已經抽到。每個傳奇只可以抽到一次。')}`, `<div class="urrow">${top.map(j => jCardHTML(j, { dim: !G.y[j], open: G.pl[j] ? 1 : 0 })).join('') || '<p class="note">呢個條件冇 UR 傳奇青年版。</p>'}</div>`, { t: 1 })}
  </div>`);
}
SCREENS.gacha = () => {
  if (UI.gp.yth) return gachaYouth();
  const c = myClub(), sc = c.st.scout, o = UI.gp, pool = gachaPool(o), n = poolSize(pool), mult = poolMult(o);
  const ids = Object.values(pool).flat(), skOf = id => G.pl[id] ? pd(id).sk : legendRow(id)[3];
  const top = ids.slice().sort((a, b) => skOf(b) - skOf(a)).slice(0, 3);
  const ur = pool.UR.slice().sort((a, b) => skOf(b) - skOf(a));
  const base = gachaPool({ leg: o.leg }), natCnt = {}; for (const id of Object.values(base).flat()) { const nat = G.pl[id] ? ps(id).nat : legendRow(id)[2]; natCnt[nat] = (natCnt[nat] || 0) + 1; }
  const nats = Object.entries(natCnt).filter(([, k]) => k >= (o.leg ? 3 : 10)).sort((a, b) => b[1] - a[1]);
  const rate = (g, p) => (g === 'C' ? p - sc * 1.5 : g === 'SR' ? p + sc * 1.5 : p);
  const cost = k => Math.round(pullCost(k) * mult / 1e3) * 1e3;
  main(`${hdr('球探抽卡', `<span class="mute">資金 ${G.inf ? '∞' : money(c.cash)} · 已抽 ${G.stats.pulls} 次</span>${info('當代球員：呢個年代全世界嘅球員，抽中其他球會嘅即刻免轉會費加盟。傳奇球星：傳奇十一人入面嘅歷代球星（每人用佢最高峰嗰張卡，27 歲加盟），價錢 3 倍；呢個年代本身已經有嘅球員唔會出現。揀咗國籍、位置、聯賽或者新星（21 歲或以下）就係指定卡池，價錢 1.5 倍；卡池冇某個等級嘅卡，就會變成低一級。抽中自己球員係重複卡，可以喺卡冊幫佢升級。十連抽保底一張 SR 或以上。卡牌等級按位置計：門將同後衛能力 +2、防守中場同中場 +1 先至分等級，所以守位都有 UR；傳奇卡池仲專登加咗一批門將、後衛、中場 UR（例如雅辛、保方、巴雷斯、簡拿華路、沙維、恩尼斯達、馬圖斯）。')}`)}
  <div class="cols" style="grid-template-rows:auto auto auto minmax(0,1fr);overflow:auto">
    <div class="row">${chips(GPSRC, o.leg ? 'leg' : 'now', 'gpsrc')}
      <select class="inp" data-ch="gpnat" aria-label="國籍"><option value="">全部國籍</option>${nats.map(([k, m]) => opt(k, `${natName(k)}（${m}）`, o.nat)).join('')}</select>
      ${chips(GPLINE, o.line, 'gpline')}
      ${o.leg ? '' : `<select class="inp" data-ch="gplg" aria-label="聯賽"><option value="">全部聯賽</option>${PLG().map(l => opt(l, LG[l].name, o.lg)).join('')}</select><button class="chip" data-act="gpyoung" aria-pressed="${o.young}">新星（21 歲或以下）</button>`}
      ${o.nat || o.line || o.lg || o.young ? '<button class="btn sm" data-act="gpclear">清除條件</button>' : ''}</div>
    <section class="banner">
      <div class="fan">${top.map((p, k) => legCardHTML(p).replace('class="card', `style="--rot:${-10 + k * 10}deg;--ty:${k === 1 ? -10 : 6}px" class="card`)).join('')}</div>
      <div class="lbl" style="color:#ffd9f7">${o.leg ? '傳奇球星卡池' : esc(ERA.n || '') + ' 當代球員卡池'}${o.nat ? ' · ' + esc(natName(o.nat)) : ''}${o.line ? ' · ' + GPLINE.find(x => x[0] === o.line)[1] : ''}${o.lg ? ' · ' + esc(LG[o.lg].name) : ''}${o.young ? ' · 新星' : ''} · ${n.toLocaleString()} 張卡</div>
      <h3>${o.leg ? '歷代傳奇<br>一抽即加盟' : '全世界球員<br>一抽即加盟'}</h3>
      <p>${o.leg ? '比利、馬勒當拿、告魯夫、施丹……傳奇十一人入面嘅歷代球星，以佢哋最巔峰嘅能力加盟你球隊。' : '球探幫你喺全世界搵人：抽中其他球會嘅球員即刻免轉會費加盟（新合約，週薪照計）。'}${mult > 1 ? ` 呢個卡池價錢 ×${mult}。` : ''}</p>
      <div class="pullbtns"><button class="btn y" data-act="pull" data-a="10" ${n < 10 ? 'disabled' : ''}>十連抽 · ${money(cost(10))}</button><button class="btn" data-act="pull" data-a="1" ${n < 1 ? 'disabled' : ''}>單抽 · ${money(cost(1))}</button></div>
    </section>
    <div class="rates">${GRATES.map(([g, p]) => `<div class="rate"><b style="color:${{ UR: '#ffb8f5', SSR: '#ffd666', SR: '#b98aff', R: '#73a6ff', C: '#aab3c5' }[g]}">${g}</b><span>${rate(g, p).toFixed(1)}% · ${pool[g].length} 張</span></div>`).join('')}</div>
    ${pan(`UR 名單（${ur.length}）${info('呢個卡池能力 90 或以上嘅球員。有顏色＝你已經收集咗。球探等級越高，SR 機率越高。')}`, `<div class="urrow">${ur.map(p => legCardHTML(p, { dim: !owns(p), open: G.pl[p] ? 1 : 0 })).join('') || '<p class="note">呢個卡池冇 UR 球員。</p>'}</div>`, { t: 1 })}
  </div>`);
};
function xPull(n) {
  const r = gachaPull(n, UI.gp); if (r.err) return toast(r.err);
  save(); render();
  let ov = $('#xov'); if (!ov) { ov = Object.assign(document.createElement('div'), { id: 'xov', className: 'xov' }); document.body.appendChild(ov); const fl = Object.assign(document.createElement('div'), { id: 'xflash', className: 'xflash' }); document.body.appendChild(fl); }
  ov.hidden = false;
  ov.innerHTML = `<div class="pullgrid ${n === 1 ? 'one' : ''}">${r.out.map((o, k) => `<div class="xflip h-${o.g}" data-k="${k}"><div class="in"><div class="back">XI</div>${cardHTML(o.pid, { badge: o.yl ? '<span class="cbadge new">傳奇青年版</span>' : o.n > 1 ? `<span class="cbadge dup">重複 ×${o.n}</span>` : '<span class="cbadge new">NEW</span>' })}</div><div class="fst ${o.full ? 'bad' : o.dup ? '' : 'good'}">${o.from === 'yth' ? (o.yl ? '傳奇青年版 · 加入青年軍' : o.rf ? `由 ${esc(clubShort(o.rf))} 青年軍加盟` : '加入青年軍') : o.full ? '已簽約 · 球隊滿員，有空位先可以上陣' : o.dup ? '重複卡 · 可以升級' : `由 ${esc(clubShort(o.from))} 加盟`}</div></div>`).join('')}</div>
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
  const A = UI.al, leg = A.src === 'leg';
  const all = leg ? legendIds() : Object.keys(G.pl).filter(p => pd(p).c !== 'ret' && !ps(p).yth && !ps(p).leg);
  const skA = p => G.pl[p] ? (leg ? cardR(p) : cardR(p)) : legendRow(p)[3], skB = p => G.pl[p] ? pd(p).sk : legendRow(p)[3];
  const gradeA = p => G.pl[p] ? gradeOf(p) : gradeP(legendRow(p)[3], legendRow(p)[1]);
  const posA = p => G.pl[p] ? ps(p).pos : legendRow(p)[1], txtA = p => G.pl[p] ? ps(p).name + ' ' + clubName(pd(p).c) : legendRow(p)[0] + ' ' + legendRow(p)[5];
  const own = all.filter(owns), grades = ['UR', 'SSR', 'SR', 'R', 'C'];
  const byG = grades.map(g => [g, own.filter(p => gradeA(p) === g).length, all.filter(p => gradeA(p) === g).length]);
  const spare = own.reduce((t, p) => t + owns(p) - 1, 0), spareV = own.reduce((t, p) => t + (owns(p) - 1) * (G.pl[p] ? dupValue(p) : 0), 0);
  const q = A.q.toLowerCase();
  const list = (A.all ? all : own).filter(p => (A.g === 'ALL' || gradeA(p) === A.g) && (A.l === 'ALL' || LINE[posA(p)] === A.l) && (!q || txtA(p).toLowerCase().includes(q))).sort((a, b) => skA(b) - skA(a));
  main(`${hdr('卡冊', info('收集咗嘅卡：球探抽過、或者曾經喺你球隊嘅球員。撳「顯示未收集」睇晒呢個年代所有球員（灰色）。撳卡睇資料：重複卡可以幫自己球員升級（每級 +1 評分），或者賣返做資金。'))}
  <div class="cols" style="grid-template-rows:auto auto auto minmax(0,1fr)">
    <div class="row">${chips([['now', '當代球員'], ['leg', '傳奇球星']], leg ? 'leg' : 'now', 'alsrc')}</div>
    <div class="prog"><span>已收集 <b>${own.length.toLocaleString()}</b> / ${all.length.toLocaleString()}</span>${byG.map(([g, a, b]) => `<span>${g} <b>${a}</b>/${b}</span>`).join('')}<span>重複卡 <b>${spare}</b></span>${spare ? `<button class="btn sm" data-act="sellall">賣晒重複卡 · +${money(spareV)}</button>` : ''}</div>
    <div class="row">${['ALL', ...grades].map(g => `<button class="chip" data-act="alg" data-a="${g}" aria-pressed="${A.g === g}">${g === 'ALL' ? '全部' : g}</button>`).join('')}
      ${[['ALL', '全部位置'], ['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒']].map(([l, n]) => `<button class="chip" data-act="all" data-a="${l}" aria-pressed="${A.l === l}">${n}</button>`).join('')}
      <input class="inp" id="alq" placeholder="搜尋球員、球會" value="${esc(A.q)}" style="flex:1 1 160px;min-width:0"><button class="chip" data-act="alall" aria-pressed="${A.all}">顯示未收集</button></div>
    ${pan(`${list.length.toLocaleString()} 張`, list.length ? `<div class="agrid">${list.slice(0, A.n).map(p => legCardHTML(p, { dim: !owns(p), count: owns(p), open: G.pl[p] ? 1 : 0 })).join('')}</div>${list.length > A.n ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-act="almore">顯示多 120 張（仲有 ${(list.length - A.n).toLocaleString()} 張）</button></div>` : ''}` : '<p class="note">未有卡。去「球探抽卡」開始收集。</p>', { t: 1, st: 'min-height:0' })}
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
  gpsrc: el => { UI.gp = { leg: el.dataset.a === 'leg', yth: el.dataset.a === 'yth', nat: '', line: UI.gp.line, lg: '', young: false }; render(); },
  gpline: el => { UI.gp.line = el.dataset.a; render(); },
  gpyoung: () => { UI.gp.young = !UI.gp.young; render(); },
  gpclear: () => { UI.gp = { leg: UI.gp.leg, yth: UI.gp.yth, nat: '', line: '', lg: '', young: false }; render(); },
  tacp: el => { setTac(el.dataset.a); save(); render(); toast(`戰術風格：${TACP[el.dataset.a].n}`); },
  alsrc: el => { UI.al.src = el.dataset.a; UI.al.n = 120; render(); },
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

/* ---------- ability record in the player sheet (fm/life.js: skTrack / injuryToll / playBonus) ---------- */
const sgn = v => v ? `<span class="${v > 0 ? 'good' : 'bad'}">${v > 0 ? '+' : ''}${v}</span>` : '<span class="mute">0</span>';
function skHistPanel(pid) {
  const d = pd(pid); if (!d.skc) return '';
  const now = [seasonTxt(G.season) + '（進行中）', d.skc.a, d.sk - d.skc.a + d.skc.j, -d.skc.j, null, null, null, d.sk];
  const rows = [now, ...(d.skh || []).slice().reverse().map(h => [seasonTxt(h[0]), ...h.slice(1)])];
  return `<div class="pan" style="margin-top:8px"><h3>能力紀錄 ${info('只記錄喺你球隊效力過嘅球員。訓練・比賽：季內每個星期訓練嘅升跌（教練、加操、青訓教練、守門員教練都計）。傷患：休息 4 個星期或以上嘅重傷有機會永久扣能力，傷得越耐、年紀越大越易，物理治療師好啲會減低機會。季尾再按年齡升跌；23 歲或以下嘅球員仲睇上陣時間：踢夠球隊六成比賽 +2、三成半 +1、少過一成 −1；成季平均評分 7.2 或以上再 +1。')}</h3><div class="pb">
    <table><thead><tr><th>球季</th><th class="n">季初</th><th class="n">訓練・比賽</th><th class="n">傷患</th><th class="n">年齡</th><th class="n">上陣時間</th><th class="n">表現</th><th class="n">季尾</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${sgn(r[2])}</td><td class="n">${sgn(r[3])}</td><td class="n">${r[4] == null ? '' : sgn(r[4])}</td><td class="n">${r[5] == null ? '' : sgn(r[5])}</td><td class="n">${r[6] == null ? '' : sgn(r[6])}</td><td class="n"><b>${r[7]}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- 合約: sortable, renew, early termination, youth team ---------- */
UI.ct = UI.ct || { sort: 'ct', dir: 1, arm: null };
const CTCOL = {
  name: ['球員', p => ps(p).name, 1], team: ['隊', p => pd(p).xs ? 2 : inYouth(p) ? 1 : 0, 1], age: ['歲', p => ageOf(p), 1], pos: ['位', p => POSORD.indexOf(ps(p).pos), 1],
  sk: ['能力', p => cardR(p), -1], w: ['週薪', p => pd(p).w, -1], ct: ['到期', p => pd(p).ct, 1], val: ['身價', p => valueOf(p), -1],
};
const CTCLS = { name: '', team: '', age: 'n', pos: 'n', sk: 'n', w: 'n', ct: 'n', val: 'n hm' };
// players matching the condition-release fields (ability below, optionally older than, youth team only if ticked)
function condList() { const U = UI.ct, n = U.cn ?? 60, a = U.ca; return roster(myCid()).filter(p => cardR(p) < n && (a == null || a === '' || ageOf(p) > +a) && (U.cy || !inYouth(p))); }
const relComp = pid => Math.round(pd(pid).w * 52 * Math.max(0, pd(pid).ct - G.season) * .5);
SCREENS.contracts = () => {
  const U = UI.ct, k = CTCOL[U.sort] ? U.sort : 'ct', key = CTCOL[k][1];
  const l = [...roster(myCid())].sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * U.dir || cardR(b) - cardR(a); });
  const yt = l.filter(inYouth).length, xs = l.filter(p => pd(p).xs).length, mass = U.mass;
  main(`${hdr('合約', `<span class="mute">一隊 ${l.length - yt - xs} 人 · 青年軍 ${yt} 人${xs ? ` · 超額 ${xs} 人` : ''} · 上限 ${SQMAX} 人</span><button class="btn ${mass ? 'y' : ''}" data-act="ctmassmode">${mass ? '完成解約' : '一鍵解約'}</button>${info(`撳表頭排序，再撳一次反轉。續約：同球員傾新合約。解約：即刻終止合約，球員變自由身，球會要賠償餘下合約週薪嘅一半（今季到期嘅免賠）；撳一次會顯示賠償金額，再撳先確認。青年軍：${YTAGE} 歲或以下嘅球員可以落青年軍，佢哋唔會入一隊選擇（排陣、後備、比賽），但會喺青年軍踢波，季尾當有正選上陣時間計成長，青訓教練嘅訓練效果仲好啲。隨時可以升返一隊。超額：球隊登記上限 ${SQMAX} 人，滿咗之後抽卡抽中嘅球員照樣簽約，但未可以上陣；有人走咗就會自動登記，亦可以撳「登記上陣」。一鍵解約：撳咗之後，撳邊個球員就即刻解約邊個，唔使逐個確認，搞掂撳「完成解約」。合約喺到期嗰年 6 月完結；7 月 1 日未續約就會自由身離隊。`)}`)}
  ${mass ? `<p class="bad" style="margin:0">一鍵解約模式：撳任何一行，嗰個球員即刻解約（會照扣賠償）。搞掂撳「完成解約」。</p>
  <div class="row"><span>按條件解約：能力低過</span><input class="inp num" id="ctn" type="number" min="30" max="99" value="${U.cn ?? 60}" style="width:64px"><span>同埋年齡大過</span><input class="inp num" id="cta" type="number" min="15" max="45" value="${U.ca ?? ''}" placeholder="唔限" style="width:64px"><label><input type="checkbox" id="cty" ${U.cy ? 'checked' : ''}> 包括青年軍</label>${(() => { const m = condList(); return `<button class="btn ${U.carm ? 'y' : ''}" data-act="ctcond" ${m.length ? '' : 'disabled'}>${U.carm ? `確認解約 ${m.length} 人 · 賠 ${money(sum(m.map(relComp)))}` : `搵到 ${m.length} 人 · 解約`}</button>`; })()}</div>` : ''}
  ${pan(`合約 · 週薪總數 ${money(sum(l.map(p => pd(p).w)))}`, `<table><thead><tr>${Object.entries(CTCOL).map(([c, [t]]) => `<th class="${CTCLS[c]} srt ${c === k ? 'on' : ''}" data-act="cts" data-a="${c}" title="撳一下排序，再撳反轉">${t}${c === k ? (U.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}<th></th></tr></thead><tbody>${l.map(p => { const d = pd(p), y = inYouth(p), armed = U.arm === p;
    const team = d.xs ? '<span class="tag t-inj">超額</span>' : y ? '<span class="tag t-ls">青年軍</span>' : '一隊';
    if (mass) return `<tr class="click mrel" data-act="ctmass" data-a="${p}" title="撳一下即刻解約"><td class="nm">${esc(ps(p).sn)} ${starTag(p)}</td><td>${team}</td><td class="n">${ageOf(p)}</td><td class="n">${ps(p).pos}</td><td class="n">${cardR(p)}</td><td class="n">${money(d.w)}</td><td class="n ${d.ct <= G.season ? 'bad' : ''}">${d.ct}</td><td class="n hm">${money(valueOf(p))}</td><td class="bad nowrap">✕ 解約 · 賠 ${money(relComp(p))}</td></tr>`;
    return `<tr class="${y ? 'yt' : ''}"><td class="nm">${pl(p)} ${starTag(p)}</td><td>${team}</td><td class="n">${ageOf(p)}</td><td class="n">${ps(p).pos}</td><td class="n">${cardR(p)}</td><td class="n">${money(d.w)}</td><td class="n ${d.ct <= G.season ? 'bad' : ''}">${d.ct}</td><td class="n hm">${money(valueOf(p))}</td>
      <td class="nowrap"><button class="btn sm" data-act="renewopen" data-a="${p}">續約</button> <button class="btn sm ${armed ? 'y' : ''}" data-act="ctrel" data-a="${p}">${armed ? `確認解約 · 賠 ${money(relComp(p))}` : '解約'}</button> ${d.xs ? `<button class="btn sm" data-act="ctxs" data-a="${p}">登記上陣</button>` : y ? `<button class="btn sm" data-act="ctup" data-a="${p}">升一隊</button>` : ageOf(p) <= YTAGE ? `<button class="btn sm" data-act="ctdown" data-a="${p}">落青年軍</button>` : ''}</td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
};
Object.assign(ACT, {
  cts: el => { const U = UI.ct, c = el.dataset.a; U.dir = U.sort === c ? -U.dir : CTCOL[c][2]; U.sort = c; U.arm = null; render(); },
  ctrel: el => { const p = el.dataset.a; if (UI.ct.arm !== p) { UI.ct.arm = p; return render(); } UI.ct.arm = null; const m = releasePlayer(p); save(); render(); toast(m); },
  ctdown: el => { const err = sendDown(el.dataset.a); if (err) return toast(err); UI.ct.arm = null; save(); render(); toast(`${ps(el.dataset.a).sn} 落咗青年軍`); },
  ctcond: () => { const U = UI.ct; if (!U.carm) { U.carm = 1; return render(); } U.carm = 0; const m = condList(); let paid = 0; for (const p of m) { paid += relComp(p); releasePlayer(p); } save(); render(); toast(`解約咗 ${m.length} 人，賠償合共 ${money(paid)}`); },
  ctmassmode: () => { UI.ct.mass = !UI.ct.mass; UI.ct.arm = null; render(); },
  ctmass: el => { const p = el.dataset.a; if (!G.pl[p] || pd(p).c !== myCid()) return; const m = releasePlayer(p); save(); render(); toast(m); },
  ctxs: el => { const p = el.dataset.a; if (activeCount(myCid()) >= SQMAX) return toast(`登記名額已滿（${SQMAX} 人），要先解約、賣走或者落青年軍騰位`); delete pd(p).xs; save(); render(); toast(`${ps(p).sn} 已登記，可以上陣`); },
  ctup: el => { callUp(el.dataset.a); UI.ct.arm = null; save(); render(); toast(`${ps(el.dataset.a).sn} 升上一隊`); },
});

/* ---------- 青年軍 (youth academy screen) ---------- */
UI.yt = UI.yt || { tab: 'list', sel: null };
function yTable(Y, t, me) {
  const st = Object.entries(Y[t].tab).map(([c, r]) => ({ c, p: r[0], w: r[1], d: r[2], l: r[3], f: r[4], a: r[5], pts: r[1] * 3 + r[2] })).sort((a, b) => b.pts - a.pts || (b.f - b.a) - (a.f - a.a) || b.f - a.f);
  return `<table><thead><tr><th class="n">#</th><th>球會</th><th class="n">賽</th><th class="n">勝</th><th class="n">和</th><th class="n">負</th><th class="n">得失</th><th class="n">分</th></tr></thead><tbody>${st.map((x, k) => `<tr class="${x.c === me ? 'me' : ''}"><td class="n">${k + 1}</td><td class="nm">${esc(clubName(x.c))} ${t.toUpperCase()}</td><td class="n">${x.p}</td><td class="n">${x.w}</td><td class="n">${x.d}</td><td class="n">${x.l}</td><td class="n">${x.f - x.a > 0 ? '+' : ''}${x.f - x.a}</td><td class="n">${x.pts}</td></tr>`).join('')}</tbody></table>`;
}
const yLog = (log, suf) => log.length ? `<div class="res">${log.map(([d, o, gf, ga, x]) => `<div>${wdl(gf > ga ? 'W' : gf < ga ? 'L' : 'D')}<span class="mute num">${fdate(d, 's')}</span><span>${typeof x === 'string' ? esc(x) + ' · ' : x === true ? '主 · ' : x === false ? '客 · ' : ''}對 ${esc(clubShort(o))} ${suf}</span><b class="num" style="margin-left:auto">${gf} - ${ga}</b></div>`).join('')}</div>` : '<p class="note">未有比賽。</p>';
function yTeamTab(t) {
  const c = myClub(), me = myCid(), L = yLine(c, t), slots = FORMS[L.form] || FORMS['4-4-2'], Y = c.yc && c.yc.s === G.season ? c.yc : yNew(c, me);
  const el = yEligible(me, t), inXI = new Set(L.xi.filter(Boolean)), sel = UI.yt.sel, str = Math.round(yStrength(me, t));
  const slot = k => {
    const p = L.xi[k], [pos, x, y] = slots[k], f = p ? fitP(p, pos) : 1, e = f >= 1 ? 'e1' : f >= .9 ? 'e2' : 'e3';
    return `<div class="slot ${sel === 's' + k ? 'selp' : ''}" data-act="ysl" data-a="s${k}" style="left:${x}%;top:${YB(y)}%${y >= 86 ? ';transform:translate(-50%,-36%)' : ''}">${p ? `<div style="position:relative">${cardHTML(p)}<span class="snm">${esc(ps(p).sn)}</span></div>` : `<div class="empty" title="冇指定球員：由青訓營其他學員頂上（能力約 ${Math.round(yFill(c))}）"><span>青訓生<br>${pos}</span></div>`}<span class="stag">${pos} <span class="${p ? e : 'e2'}">${p ? Math.round(pd(p).sk * f) : Math.round(yFill(c))}</span></span></div>`;
  };
  const item = p => `<div class="pitem ${sel === p ? 'selp' : ''}" data-act="ysl" data-a="${p}" style="cursor:pointer">${cardHTML(p)}<div style="min-width:0"><div class="nm">${esc(ps(p).sn)} ${inXI.has(p) ? '<span class="tag t-ls">正選</span>' : ''} ${pd(p).yt ? '' : '<span class="tag t-ex">一隊</span>'}</div><div class="mt">${POSN[ps(p).pos]} · ${ageOf(p)} 歲${potSeen(p) ? ` · 潛力 ${'★'.repeat(potStars(potSeen(p)))}` : ''}</div></div><div class="ef">${pd(p).sk}<small>青年賽 ${(c.yap || {})[p] || 0} 場</small></div></div>`;
  return `<div class="xsq">
    <div class="xl"><div class="xpitch">${XPITCH}${slots.map((_, k) => slot(k)).join('')}</div></div>
    <div class="xr">
      ${pan(`${YT[t].n} · 陣容 <span class="r">實力 ${str}</span>`, `<div class="row">${FLIST().map(f => `<button class="chip" data-act="yform" data-a="${t}:${f}" aria-pressed="${L.form === f}">${f}</button>`).join('')}</div>
        <div class="row" style="margin-top:6px"><button class="btn" data-act="yauto" data-a="${t}">自動排陣</button><span class="note">${YT[t].age} 歲或以下嘅球員（青年軍同一隊都得）先可以上陣。撳球場上一個位，再撳下面球員放入去；撳兩個位會對調。</span></div>`)}
      ${pan(`可以上陣（${el.length} 人）`, `<div class="plist">${el.sort((a, b) => POSORD.indexOf(ps(a).pos) - POSORD.indexOf(ps(b).pos) || pd(b).sk - pd(a).sk).map(item).join('') || '<p class="note">冇合資格球員。</p>'}</div>`)}
      ${pan(`${YT[t].n} 積分榜`, yTable(Y, t, me))}
      ${pan('最近賽果', yLog(Y[t].log, t.toUpperCase()))}
    </div></div>`;
}
SCREENS.youth = a => {
  if (a && ['list', 'u18', 'u21', 'cup'].includes(a)) { UI.yt.tab = a; UI.yt.sel = null; }
  const c = myClub(), me = myCid(), tab = UI.yt.tab, Y = c.yc && c.yc.s === G.season ? c.yc : yNew(c, me);
  const ys = roster(me).filter(inYouth).sort((a, b) => (potSeen(b) || pd(b).sk) - (potSeen(a) || pd(a).sk));
  const can = roster(me).filter(p => !inYouth(p) && ageOf(p) <= YTAGE).sort((a, b) => ageOf(a) - ageOf(b)), coach = staffOf(c, 'yth');
  const ycard = p => { const pv = potSeen(p); return `<div class="ycard">${cardHTML(p, { open: 1 })}<div class="yinfo"><b>${pl(p)}</b><span class="num">${ps(p).pos} · ${ageOf(p)} 歲</span>${pv ? `<span class="ypot" title="青訓教練估計潛力約 ${pv}（教練越好越準）">潛力 ${'★'.repeat(potStars(pv))}${'☆'.repeat(5 - potStars(pv))}</span>` : '<span class="mute">一隊落嚟</span>'}<span class="mute">表現 ${form(p) ? form(p).toFixed(1) : '–'} · 青年賽 ${(c.yap || {})[p] || 0} 場</span><button class="btn sm" data-act="ctup" data-a="${p}">升一隊</button></div></div>`; };
  const cupTxt = Y.cup.won ? '🏆 冠軍' : Y.cup.out ? '已出局' : `下一場：${YCUP.rd[Y.cup.rd]}`;
  const rec = t => { const r = Y[t].tab[me] || [0, 0, 0, 0]; return `${r[1]} 勝 ${r[2]} 和 ${r[3]} 負`; };
  let body;
  if (tab === 'u18' || tab === 'u21') body = yTeamTab(tab);
  else if (tab === 'cup') body = `<div class="cols c2 m-stack">${pan(`${YCUP.n}（U18）`, `<dl class="kv"><dt>形式</dt><dd>U18 單場淘汰，對手係全國球會嘅 U18，越後越強</dd><dt>今季</dt><dd>${cupTxt}</dd><dt>賽程</dt><dd>${YCUP.rd.map((n, k) => `${n}（第 ${YCUP.wk[k] + 1} 週）`).join('、')}</dd></dl><p class="note">用 U18 陣容出賽。冠軍：球迷人氣 +3、領隊聲望 +1。</p>`)}${pan('盃賽賽果', yLog(Y.cup.log, 'U18'), { t: 1 })}</div>`;
  else body = `<div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan('青訓營', `<dl class="kv"><dt>青訓設施</dt><dd><span class="num" style="color:var(--sel)">${'★'.repeat(yaOf(c))}${'☆'.repeat(5 - yaOf(c))}</span> ${YANAME[yaOf(c)]} ${yaOf(c) < 5 ? `<button class="btn sm" data-act="yaup">升級 · ${money(yaCost(c))}</button>` : ''}</dd>
        <dt>青訓教練</dt><dd>${coach ? `${esc(coach.n)} ${'★'.repeat(coach.lv)}` : '<span class="bad">懸空</span>（去「職員」請）'}</dd>
        <dt>U18 聯賽</dt><dd>${rec('u18')}</dd><dt>U21 聯賽</dt><dd>${rec('u21')}</dd><dt>${YCUP.n}</dt><dd>${cupTxt}</dd><dt>下次新秀</dt><dd>7 月 1 日</dd><dt>青年軍人數</dt><dd>${ys.length} 人</dd></dl>`)}
      ${pan(`可以落青年軍嘅一隊球員（${YTAGE} 歲或以下）`, can.length ? `<table><tbody>${can.map(p => `<tr><td class="nm">${pl(p)}</td><td class="n">${ps(p).pos}</td><td class="n">${ageOf(p)}</td><td class="n">${cardR(p)}</td><td><button class="btn sm" data-act="ctdown" data-a="${p}">落青年軍</button></td></tr>`).join('')}</tbody></table>` : '<p class="note">一隊冇 21 歲或以下嘅球員。</p>', { t: 1 })}
    </div>
    ${pan(`青年軍名單 <span class="r">${ys.length} 人</span>`, ys.length ? `<div class="ygrid">${ys.map(ycard).join('')}</div>` : '<p class="note">青年軍冇人。等 7 月 1 日新秀加入，或者將一隊後生仔落青年軍。</p>', { t: 1, st: 'min-height:0' })}
  </div>`;
  main(`${hdr('青年軍', info(`青訓營每年 7 月 1 日會有 3–5 個 15–17 歲嘅新秀加入，每個都有潛力（★ 越多將來可以去得越高），青訓教練越好估得越準。每個星期 U18 同 U21 各踢一場聯賽（對手係你聯賽其他球會嘅青年隊），U18 仲有${YCUP.n}。U18 / U21 各有自己陣容：18 / 21 歲或以下嘅球員都可以上，包括一隊嘅後生仔（一隊比賽照踢得）。青年賽計上陣時間：一季 15 場或以上，季尾成長當正選計。新秀會慢慢升向佢嘅潛力，表現好升得快啲。覺得夠班就撳「升一隊」。`))}
  <div class="tabs">${chips([['list', '青訓營'], ['u18', 'U18 聯賽'], ['u21', 'U21 聯賽'], ['cup', YCUP.n]], tab, 'ytab')}</div>
  ${body}`);
};
const ySlotK = x => /^s\d+$/.test(x);
Object.assign(ACT, {
  ytab: el => { UI.yt.tab = el.dataset.a; UI.yt.sel = null; render(); },
  yform: el => { const [t, f] = el.dataset.a.split(':'), L = yLine(myClub(), t); L.form = f; yAuto(myCid(), t, true); save(); render(); },
  yauto: el => { yAuto(myCid(), el.dataset.a, false); UI.yt.sel = null; save(); render(); toast('已自動排陣'); },
  ysl: el => {   // tap a slot or a player; a second tap places or swaps
    const t = UI.yt.tab, L = yLine(myClub(), t), a = el.dataset.a, b = UI.yt.sel;
    if (!b) { UI.yt.sel = a; return render(); }
    if (b === a) { UI.yt.sel = null; return render(); }
    if (ySlotK(a) && ySlotK(b)) { const i = +a.slice(1), j = +b.slice(1); [L.xi[i], L.xi[j]] = [L.xi[j], L.xi[i]]; }
    else if (ySlotK(a) || ySlotK(b)) { const k = +(ySlotK(a) ? a : b).slice(1), p = ySlotK(a) ? b : a, old = L.xi.indexOf(p); if (old >= 0) L.xi[old] = L.xi[k]; L.xi[k] = p; }
    else { UI.yt.sel = a; return render(); }
    UI.yt.sel = null; save(); render();
  },
});
Object.assign(ACT, { yaup: () => { const err = yaUpgrade(); if (err) return toast(err); save(); render(); toast(`青訓設施升到 ${YANAME[yaOf(myClub())]}`); } });
Object.assign(CH, { gpnat: el => { UI.gp.nat = el.value; render(); }, gplg: el => { UI.gp.lg = el.value; render(); } });
// condition fields: remember the values; any change disarms the confirm button
document.addEventListener('change', e => { const id = e.target.id; if (!['ctn', 'cta', 'cty'].includes(id)) return; const U = UI.ct;
  if (id === 'ctn') U.cn = clamp(+e.target.value || 60, 30, 99); if (id === 'cta') U.ca = e.target.value === '' ? '' : clamp(+e.target.value, 15, 45); if (id === 'cty') U.cy = e.target.checked; U.carm = 0; render(); });
Object.assign(CH, { sqf: el => { UI.sqf = el.value; render(); } });

// what a player likes (player sheet)
function prefPanel(pid) {
  if (ps(pid).pos === 'GK') return '';
  const pr = prefOf(pid);
  return `<p class="note" style="margin:6px 0 0">最啱戰術風格：<b>${TACP[pr.tac] ? TACP[pr.tac].n : '均衡'}</b>${pr.form ? ` · 最啱陣式：<b>${pr.form}</b>` : ''} ${info('球隊用中佢鍾意嘅戰術風格或者陣式，每樣佢嘅能力 +1。')}</p>`;
}
