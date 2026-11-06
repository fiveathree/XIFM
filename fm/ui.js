/* =====================================================================
   XIFM 經理生涯 2001/02 — UI
   Template-string screens rendered into #top #nav #main #tick #modal #toast.
   One delegated handler: data-go="screen" (+data-a arg), data-pl="pid" (profile), data-act="name".
   Uses core.js / match.js globals; never redeclare their names (R, D, G, step, ev, card, goal, form, off, fin, training…).
   ===================================================================== */
'use strict';

/* ---------- basics ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let SCR = 'home', ARG = null, MT = null, BUSY = false;
const UI = { sel: null, tb: { c: 'ENG', l: 'eng1', r: null }, sr: { q: '', pos: '', lg: '', age: '', val: '', sort: 'sk' }, mk: 'off', rk: { t: 'pl', l: '', k: 'gl' }, fxc: null, cup: null, mail: null, pm: null };
const myCid = () => G.mgr.cid;
const myClub = () => G.clubs[G.mgr.cid];
const seasonTxt = s => `${s}/${String(s + 1).slice(2)}`;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600); }
const stars = rep => { const n = clamp(Math.round(rep / 20), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
const pan = (title, body, o = {}) => `<section class="pan ${o.cls || ''}" ${o.st ? `style="${o.st}"` : ''}><h3 class="${o.t ? 't' : ''}">${title}${o.r ? `<span class="r">${o.r}</span>` : ''}</h3><div class="pb">${body}</div></section>`;
const main = h => { $('#main').innerHTML = h; };
const hdr = (t, extra = '') => `<div class="hdr"><h2>${t}</h2>${extra}</div>`;
const pl = pid => `<a class="pl" data-pl="${pid}">${esc(ps(pid).sn)}</a>`;
const cbar = v => `<span class="cbar"><i style="width:${clamp(v, 0, 100)}%;background:${v >= 85 ? 'var(--win)' : v >= 65 ? 'var(--warn)' : 'var(--loss)'}"></i></span>`;
const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(t)}</option>`;
const chips = (list, cur, act) => list.map(([v, t]) => `<button class="chip" data-act="${act}" data-a="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('');
const info = t => `<button type="button" class="ib" data-tip="${esc(t)}" aria-label="說明">i</button>`;
const save = () => { if (G && saveGame()) { try { localStorage.setItem('xifm-fm-last', G.slot); } catch (e) { } } };

function badgeSVG(cid, s = 56) {
  const c = CL[cid], [a, b] = c ? c.col : ['#33415e', '#c9d6f0'], t = c ? c.short : 'XI';
  return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 L58 11 V30 C58 46 46 56 32 61 C18 56 6 46 6 30 V11 Z" fill="${a}" stroke="${b}" stroke-width="3"/><path d="M32 8 L53 14.5 V30 C53 43 43 51.5 32 56 Z" fill="#fff" opacity=".12"/><text x="32" y="40" text-anchor="middle" font-family="Saira Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="17" fill="${b}" stroke="#000" stroke-opacity=".35" stroke-width=".8" paint-order="stroke">${esc(t)}</text></svg>`;
}

/* ---------- fixtures helpers ---------- */
const nextFx = cid => clubFx(cid).find(f => f.hg == null);
function roundName(f) { const c = G.comp[f.c]; if (!c) return ''; if (c.t === 'L') return `第 ${f.r + 1} 輪`; if (f.g != null) return `${'ABCDEFGH'[f.g]} 組`; return c.rd[f.r] ? c.rd[f.r].n + (f.ko === 2 ? '次回合' : c.rd[f.r].legs === 2 ? '首回合' : '') : ''; }
const venue = f => f.n ? '中立場' : f.h === myCid() ? '主場' : '作客';
const scoreTxt = f => f.hg == null ? '–' : `${f.hg}-${f.ag}${f.et ? '（加時）' : ''}${f.ph != null ? ` 點球 ${f.ph}-${f.pa}` : ''}`;
function resOf(f, cid) { if (f.hg == null) return ''; const us = f.h === cid ? f.hg : f.ag, them = f.h === cid ? f.ag : f.hg; if (us !== them) return us > them ? 'W' : 'L'; if (f.ph != null) return (f.h === cid ? f.ph > f.pa : f.pa > f.ph) ? 'W' : 'L'; return 'D'; }
const wdl = r => r ? `<span class="wdl ${r}">${{ W: '勝', D: '和', L: '負' }[r]}</span>` : '';
function fxDesc(f, cid) { const opp = f.h === cid ? f.a : f.h; return `${compName(f.c)} · ${f.n ? '中立場' : f.h === cid ? '主場' : '作客'} 對 ${clubName(opp)} · ${fdate(f.d, 's')}`; }

/* ---------- top bar / nav / ticker ---------- */
const TITLE = { home: '主頁', squad: '陣容', tactics: '戰術', training: '訓練', staff: '職員', search: '球員搜尋', market: '轉會市場', gacha: '球探抽卡', contracts: '合約', finance: '財政', stadium: '球場', board: '董事局', fixtures: '賽程', tables: '積分榜', cups: '盃賽', ratings: '數據排名', history: '歷史', mail: '收件箱', save: '存檔', match: '比賽' };
const NAVG = [['球隊', ['home', 'squad', 'tactics', 'training', 'staff']], ['轉會', ['search', 'market', 'gacha', 'contracts']], ['球會', ['finance', 'stadium', 'board']], ['賽事', ['fixtures', 'tables', 'cups', 'ratings', 'history']], ['系統', ['mail', 'save', 'quit']]];
const NEEDCLUB = new Set(['home', 'squad', 'tactics', 'training', 'staff', 'market', 'gacha', 'contracts', 'finance', 'stadium', 'match']);
function rTop() {
  const cid = myCid(), f = cid && nextFx(cid), unread = G.mail.some(m => !m.rd);
  $('#top').innerHTML = `<div class="badge" data-act="badge" title="${esc(cid ? clubName(cid) : '')}">${badgeSVG(cid, 60)}</div>
  <div class="tinfo"><span class="scr">${TITLE[SCR] || ''}</span><div class="club"><b>${esc(cid ? clubName(cid) : G.mgr.name + '（待業）')}</b><small>${f ? esc(fxDesc(f, cid)) : '暫時冇比賽'}</small><small class="num"><span class="dl">${fdate(G.day)}</span><span class="ds">${fdate(G.day, 'm')}</span></small></div></div>
  <div class="tbtns"><button class="tb" data-go="mail" aria-label="收件箱"><span class="dot ${unread ? 'on' : ''}"></span><small>收件箱</small></button>
  <button class="tb" id="sqBtn" data-go="squad">陣容<small>SQUAD</small></button>
  <button class="tb" id="menuBtn" data-act="menu" aria-label="選單">☰<small>選單</small></button>
  <button class="tb" data-act="until" title="一直推進到下場比賽、新報價或者 60 日">⏩<small>到比賽</small></button>
  <button class="tb next" data-act="next">下一日 ▶</button></div>`;
}
function rNav() {
  const cid = myCid(), unread = G.mail.filter(m => !m.rd).length;
  $('#nav').innerHTML = NAVG.map(([g, items]) => {
    const its = items.filter(s => cid || !NEEDCLUB.has(s));
    return its.length ? `<div class="ng"><h4>${g}</h4>${its.map(s => s === 'quit' ? `<button class="nb" data-act="quit">主選單</button>` :
      `<button class="nb" data-go="${s}" aria-current="${SCR === s}">${TITLE[s]}${s === 'mail' && unread ? `<span class="cnt">${unread}</span>` : s === 'market' && G.off.length ? `<span class="cnt">${G.off.length}</span>` : ''}</button>`).join('')}</div>` : '';
  }).join('') + `<a class="nb" href="index.html">返回傳奇十一人</a>`;
}
function rTick() { const t = G.news.length ? G.news.slice(0, 15).join('　◆　') : '歡迎嚟到 XI 經理 2002'; const sp = $('#tick span'); if (sp.textContent !== t) sp.textContent = t; }
function render() {
  if (!G) return;
  regCustom();
  if (!myCid() && NEEDCLUB.has(SCR)) SCR = 'board';
  rTop(); rNav(); rTick();
  (SCREENS[SCR] || SCREENS.home)(ARG);
}
function go(s, a) {
  if (MT && MT.timer) pauseLive();
  SCR = s; ARG = a ?? null; UI.sel = null;
  $('#nav').dataset.open = 'false';
  render();
}
const SCREENS = {};

/* ---------- modal (fixed size so it never jumps) ---------- */
function modal(title, body, cls = '') {
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="mbox ${cls}" role="dialog" aria-label="${esc(title)}"><h3>${title}<button class="btn sm x" data-act="mclose">關閉</button></h3><div class="mb">${body}</div></div>`;
}
function closeModal() {
  if (MT && MT.phase === 'live' && MT.M && MT.M.pause) return breakPanel(); // half/extra time: back to the break panel, never a dead end
  const m = $('#modal'); m.hidden = true; m.innerHTML = ''; UI.pm = null;
  if (MT && MT.resume) { MT.resume = false; runLive(); }
}

/* ---------- info popover (hover on desktop, tap on phone) ---------- */
let TIP = null;
function showTip(btn) {
  if (!TIP) { TIP = document.createElement('div'); TIP.id = 'tip'; document.body.appendChild(TIP); }
  TIP.textContent = btn.dataset.tip; TIP.hidden = false; TIP.dataset.for = btn.dataset.tip;
  const r = btn.getBoundingClientRect(), w = 260, h = 150;
  TIP.style.left = clamp(r.left - 10, 8, innerWidth - w - 8) + 'px';
  TIP.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
}
const hideTip = () => { if (TIP) TIP.hidden = true; };
document.addEventListener('mouseover', e => { const b = e.target.closest('.ib'); if (b && matchMedia('(hover:hover)').matches) showTip(b); else if (!e.target.closest('#tip')) hideTip(); });

/* =====================================================================
   SCREENS
   ===================================================================== */

/* ---------- 主頁 ---------- */
SCREENS.home = () => {
  const cid = myCid(), c = myClub(), f = nextFx(cid), lg = G.comp[c.lg];
  const st = standings(lg.tab), mi = st.findIndex(x => x.c === cid);
  const lo = clamp(mi - 3, 0, Math.max(0, st.length - 7));
  const last = clubFx(cid).filter(x => x.hg != null).slice(-5).reverse();
  const today = userFxToday();
  const nextHtml = f ? `<div class="nmc">${badgeSVG(f.h, 54)}<div><div class="mute">${esc(compName(f.c))} · ${roundName(f)}</div><div class="D" style="font-size:22px">${esc(clubName(f.h))} <span class="mute">對</span> ${esc(clubName(f.a))}</div>
    <div class="mute">${fdate(f.d, 'm')} · ${venue(f)}${f.d > G.day ? ` · 仲有 ${f.d - G.day} 日` : ''}</div></div>${badgeSVG(f.a, 54)}</div>
    ${today ? `<div class="row" style="margin-top:8px"><button class="btn y" data-act="match">今日比賽 · 入場</button></div>` : `<div class="row" style="margin-top:8px"><button class="btn" data-act="until">⏩ 直到下場比賽</button></div>`}` : '<p class="note">今季已經冇比賽。</p>';
  main(`${hdr('主頁', `<span class="mute">${seasonTxt(G.season)} 球季 · 領隊 ${esc(G.mgr.name)}</span>`)}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto minmax(0,1fr)">
      ${pan('下一場比賽', nextHtml)}
      ${pan(`${esc(lg.nm)}`, `<table><thead><tr><th class="n">#</th><th>球會</th><th class="n">賽</th><th class="n">得失</th><th class="n">分</th></tr></thead><tbody>${st.slice(lo, lo + 7).map((x, k) => `<tr class="${x.c === cid ? 'me' : ''}"><td class="n">${lo + k + 1}</td><td class="nm">${esc(clubName(x.c))}</td><td class="n">${x.p}</td><td class="n">${x.f - x.a > 0 ? '+' : ''}${x.f - x.a}</td><td class="n">${x.pts}</td></tr>`).join('')}</tbody></table>`, { r: `<a data-go="tables">全表 ›</a>` })}
    </div>
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan('球會狀況', `<dl class="kv"><dt>資金</dt><dd class="big ${c.cash < 0 ? 'bad' : ''}">${G.inf ? '∞' : money(c.cash)}</dd><dt>董事局信心 ${info('每月按聯賽排名同預期比較調整；贏盃加分，欠債扣分。跌到 0 會被炒。')}</dt><dd><div class="bar" style="width:160px;display:inline-block"><i style="width:${c.conf}%"></i></div> ${Math.round(c.conf)}%</dd><dt>今季目標</dt><dd>${esc(c.goal || '—')}（預期第 ${c.exp} 名，而家第 ${mi + 1} 名）</dd><dt>領隊聲望</dt><dd>${Math.round(G.mgr.rep)}</dd></dl>`, { t: 1 })}
      ${pan('最近 5 場', last.length ? `<div class="res">${last.map(x => `<div>${wdl(resOf(x, cid))}<span class="mute">${esc(compName(x.c))}</span><span>${x.h === cid ? '主' : '客'} 對 ${esc(clubName(x.h === cid ? x.a : x.h))}</span><b class="num" style="margin-left:auto">${scoreTxt(x)}</b></div>`).join('')}</div>` : '<p class="note">今季未開波。</p>', { t: 1 })}
      ${pan('最新郵件', `<div class="res">${G.mail.slice(0, 6).map(m => `<div class="click" data-go="mail" data-a="${m.id}"><span class="mute num">${fdate(m.d, 's')}</span><span class="${m.rd ? '' : 'D'}">${esc(m.t)}</span></div>`).join('') || '<p class="note">冇郵件。</p>'}</div>`, { t: 1, r: `<a data-go="mail">全部 ›</a>` })}
    </div>
  </div>`);
};

/* ---------- 陣容 ---------- */
const sqGet = (c, k) => k[0] === 'x' ? c.xi[+k.slice(1)] || null : k[0] === 'b' ? c.sb[+k.slice(1)] || null : k.slice(1);
function sqSet(c, k, v) { if (k[0] === 'x') c.xi[+k.slice(1)] = v; else if (k[0] === 'b') c.sb[+k.slice(1)] = v; }
function sqSwap(a, b) { const c = myClub(), pa = sqGet(c, a), pb = sqGet(c, b); sqSet(c, a, pb); sqSet(c, b, pa); c.sb = c.sb.filter(Boolean).slice(0, 5); }
function pTags(pid) {
  const d = pd(pid), p = ps(pid), t = [];
  if (d.inj) t.push(`<span class="tag t-inj" title="${esc(d.injn)}">傷 ${d.inj}日</span>`);
  if (d.sus) t.push(`<span class="tag t-sus">停賽 ${d.sus}</span>`);
  if (!EU.has(p.nat)) t.push('<span class="tag t-ne">NON EU</span>');
  if (d.list) t.push('<span class="tag t-ls">放售</span>');
  if (d.c !== 'free' && d.ct <= G.season) t.push('<span class="tag t-ex">約滿</span>');
  return t.join('');
}
function shirtsHTML(cid, xi, formName, drag) {
  const col = CL[cid].col, slots = FORMS[formName];
  return xi.map((pid, i) => { const [pos, x, y] = slots[i]; return `<div class="shirt ${drag ? 'dg' : ''} ${drag && UI.sel === 'x' + i ? 'selp' : ''}" ${drag ? `data-i="${i}"` : ''} style="left:${x}%;top:${y}%">${drag ? `<b class="sp">${pos}</b>` : ''}<i style="background:${col[0]};color:${col[1]}">${pid ? pd(pid).no || '' : ''}</i><span class="${pid && fitPos(ps(pid).pos, pos) < .85 ? 'bad' : ''}">${pid ? esc(ps(pid).sn) : pos}</span></div>`; }).join('');
}
/* custom formation: dragging a shirt to an empty spot copies the formation into club.cust, registered as FORMS['C:'+cid] */
const CUSTK = cid => 'C:' + cid;
const isCust = f => f.startsWith('C:');
const fname = f => isCust(f) ? '自訂' : f;
const FLIST = () => Object.keys(FORMS).filter(k => !isCust(k));
const formOpts = cur => FLIST().map(f => opt(f, f, cur)).join('') + (myClub().cust ? opt(CUSTK(myCid()), '自訂', cur) : '');
function regCustom() { for (const cid in G.clubs) { const c = G.clubs[cid]; if (c.cust) FORMS[CUSTK(cid)] = c.cust; if (isCust(c.form) && !FORMS[c.form]) c.form = '4-4-2'; } }
function slotAt(x, y) { if (y >= 86) return 'GK'; if (y >= 64) return x < 25 ? 'LB' : x > 75 ? 'RB' : 'CD'; if (y >= 55) return x < 22 ? 'LM' : x > 78 ? 'RM' : 'DM'; if (y >= 40) return x < 22 ? 'LM' : x > 78 ? 'RM' : 'CM'; if (y >= 27) return x < 20 ? 'LM' : x > 80 ? 'RM' : 'AM'; return 'ST'; }
function moveSlot(i, x, y) {
  const c = myClub(), k = CUSTK(myCid());
  c.cust = FORMS[c.form].map(s => [...s]); c.form = k;
  c.cust[i] = [slotAt(x, y), Math.round(x), Math.round(y)]; FORMS[k] = c.cust;
}
function loadPlan(i) {
  const c = myClub(), p = c.plans[i], mine = new Set(roster(myCid()));
  if (p.cust) c.cust = p.cust.map(s => [...s]);
  c.form = isCust(p.form) ? CUSTK(myCid()) : p.form; regCustom();
  c.xi = p.xi.map(x => mine.has(x) ? x : null);
  c.sb = p.sb.filter(x => mine.has(x) && !c.xi.includes(x));
}
const PITCHV = `<svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".4"><rect x="2" y="2" width="64" height="96"/><line x1="2" y1="50" x2="66" y2="50"/><circle cx="34" cy="50" r="9"/><rect x="14" y="2" width="40" height="16"/><rect x="14" y="82" width="40" height="16"/><rect x="25" y="2" width="18" height="6"/><rect x="25" y="92" width="18" height="6"/></g></svg>`;
SCREENS.squad = () => {
  const cid = myCid(), c = myClub(), slots = FORMS[c.form];
  const inXI = new Set(c.xi.filter(Boolean)), inSB = new Set(c.sb);
  const res = roster(cid).filter(p => !inXI.has(p) && !inSB.has(p)).sort((a, b) => lineOf(ps(a).pos).localeCompare(lineOf(ps(b).pos)) || pd(b).sk - pd(a).sk);
  const row = (k, pid, slot) => {
    const sel = UI.sel === k ? 'sel' : '';
    if (!pid) return `<tr class="click ${sel}" data-act="sq" data-k="${k}"><td class="n hm">—</td><td class="n">${slot || ''}</td><td colspan="6" class="mute">（空位，撳一下再撳一個球員）</td></tr>`;
    const d = pd(pid), p = ps(pid), bad = slot && fitPos(p.pos, slot) < .85;
    return `<tr class="click ${sel}" data-act="sq" data-k="${k}"><td class="n hm">${d.no || ''}</td><td class="n ${bad ? 'pbad' : ''}" title="${esc(POSN[p.pos])}">${slot || p.pos}</td><td class="nm">${pl(pid)}${slot && slot !== p.pos ? ` <span class="mute">(${p.pos})</span>` : ''}</td><td>${pTags(pid)}</td><td>${Math.round(d.cond)}${cbar(d.cond)}</td><td class="n hm">${form(pid) ? form(pid).toFixed(1) : '–'}</td><td class="n">${d.sk}</td>
      <td class="hm"><select data-ch="ord" data-a="${pid}" aria-label="個人指令">${Object.entries(ORDERS).map(([v, t]) => opt(v, t, c.ord[pid] || 'n')).join('')}</select></td></tr>`;
  };
  const probs = lineupProblems(cid), plans = c.plans || [], cur = c.plan ?? 0;
  main(`${hdr('陣容', `${[0, 1, 2].map(i => `<button class="chip" data-act="plan" data-a="${i}" aria-pressed="${cur === i}">方案 ${'ABC'[i]}${plans[i] ? '' : '（空）'}</button>`).join('')}<button class="btn sm" data-act="plansave">存入方案 ${'ABC'[cur]}</button><button class="btn" data-act="autopick">自動排陣</button>${info('拖住球場上嘅球衣：放喺另一件球衣上面就對調兩個球員，放喺空位就移動嗰個位置（變自訂陣式）。用滑鼠亦可以由左邊名單拖人入球場。撳一個再撳另一個都可以對調。紅色＝唔係本位，會扣表現。方案 A／B／C：撳「存入」記低陣式同陣容，之後一撳就換返。')}${probs.length ? `<span class="bad">${esc(probs.slice(0, 2).join('；'))}</span>` : ''}`)}
  <div class="cols m-stack sqg">
    ${pan(`球員名單 <span class="r">${roster(cid).length} 人</span>`, `<table><thead><tr><th class="n hm">#</th><th class="n">位置</th><th>球員</th><th>狀態</th><th>體能</th><th class="n hm">表現</th><th class="n">能力</th><th class="hm">指令</th></tr></thead><tbody>
      <tr class="sec"><td colspan="8">正選</td></tr>${slots.map((s, i) => row('x' + i, c.xi[i], s[0])).join('')}
      <tr class="sec"><td colspan="8">後備</td></tr>${[0, 1, 2, 3, 4].map(i => row('b' + i, c.sb[i], '')).join('')}
      <tr class="sec"><td colspan="8">預備組</td></tr>${res.map(p => row('r' + p, p, '')).join('')}</tbody></table>`)}
    ${pan(`球場模擬 <span class="r">${fname(c.form)}</span>`, `<div class="pitchwrap"><div class="pitchv" id="sqp">${PITCHV}${shirtsHTML(cid, c.xi, c.form, true)}</div></div>`, { t: 1 })}
    ${pan('陣式', `<div class="flist">${FLIST().map(f => `<button class="nb" data-act="pform" data-a="${f}" aria-current="${c.form === f}">${f}</button>`).join('')}${c.cust ? `<button class="nb" data-act="pform" data-a="${CUSTK(cid)}" aria-current="${isCust(c.form)}">自訂</button>` : ''}</div>`, { t: 1, cls: 'fpan' })}
  </div>`);
};

/* ---------- squad drag & drop (pointer events: shirts on any device, list rows with a mouse) ---------- */
let DRG = null, NOCLICK = false;
function dropTarget(e) {
  DRG.g.hidden = true; const el = document.elementFromPoint(e.clientX, e.clientY); DRG.g.hidden = false;
  if (!el) return null;
  const sh = el.closest('#sqp .shirt[data-i]'); if (sh && 'x' + sh.dataset.i !== DRG.src) return { k: 'x' + sh.dataset.i, el: sh };
  const row = el.closest('tr[data-k]'); if (row && row.dataset.k !== DRG.src) return { k: row.dataset.k, el: row };
  const p = el.closest('#sqp');
  if (p && DRG.sh) { const r = p.getBoundingClientRect(); return { move: [clamp((e.clientX - r.left) / r.width * 100, 5, 95), clamp((e.clientY - r.top) / r.height * 100, 5, 95)] }; }
  return null;
}
function endDrag() { if (!DRG) return; DRG.g?.remove(); DRG.el.classList.remove('dragging'); $$('.dropon').forEach(x => x.classList.remove('dropon')); DRG = null; }
document.addEventListener('pointerdown', e => {
  if (SCR !== 'squad' || DRG) return;
  if (e.target.closest('select,input,button')) return;
  const sh = e.target.closest('#sqp .shirt[data-i]'), row = !sh && e.pointerType === 'mouse' && e.button === 0 && e.target.closest('tr[data-k]');
  if (!sh && !row) return;
  DRG = { src: sh ? 'x' + sh.dataset.i : row.dataset.k, sh: !!sh, el: sh || row, x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false };
  if (sh) { e.preventDefault(); sh.setPointerCapture(e.pointerId); }
});
document.addEventListener('pointermove', e => {
  if (!DRG || e.pointerId !== DRG.id) return;
  if (!DRG.on) {
    if (Math.hypot(e.clientX - DRG.x0, e.clientY - DRG.y0) < 6) return;
    DRG.on = true; const pid = sqGet(myClub(), DRG.src);
    DRG.g = Object.assign(document.createElement('div'), { className: 'dghost', textContent: pid ? ps(pid).sn : '空位' });
    document.body.appendChild(DRG.g); DRG.el.classList.add('dragging');
  }
  DRG.g.style.left = e.clientX + 'px'; DRG.g.style.top = e.clientY + 'px';
  const t = dropTarget(e); $$('.dropon').forEach(x => x.classList.remove('dropon')); if (t && t.el) t.el.classList.add('dropon');
});
document.addEventListener('pointerup', e => {
  if (!DRG || e.pointerId !== DRG.id) return;
  const d = DRG, t = d.on ? dropTarget(e) : null; endDrag();
  if (!d.on) { if (d.sh) ACT.sq({ dataset: { k: d.src } }); return; } // a tap on a shirt = select / swap
  NOCLICK = true; setTimeout(() => { NOCLICK = false; }, 0);
  if (!t) return;
  if (t.k) sqSwap(d.src, t.k); else moveSlot(+d.src.slice(1), ...t.move);
  UI.sel = null; save(); render();
});
document.addEventListener('pointercancel', endDrag);

/* ---------- 戰術 ---------- */
const STYLEN = { ment: '心態', pass: '傳球', tempo: '節奏', mark: '防守方式', trap: '越位陷阱' };
const STYLEI = { ment: '進攻：多人插上，入球多但後防空虛；防守：收縮陣型，少失波但難入球。', pass: '短傳：控球同中場優勢；長傳：直接打前場，進攻多啲但控球少。', tempo: '快節奏：射門機會多，但體能消耗大同多犯規；慢節奏：慳體力。', mark: '人盯人：防守稍強，但犯規同黃牌多。', trap: '用越位陷阱：防守加強，但對手前鋒夠快就會被打身後。' };
SCREENS.tactics = () => {
  const c = myClub(), cid = myCid(), f = UI.tf || c.form;
  main(`${hdr('戰術', info('陣式同打法會影響每分鐘嘅進攻、防守同控球計算。比賽中途都可以改。'))}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto minmax(0,1fr)">
      ${pan('陣式', `<div class="row">${[...FLIST(), ...(c.cust ? [CUSTK(cid)] : [])].map(k => `<button class="chip" data-act="tform" data-a="${k}" aria-pressed="${k === f}">${fname(k)}</button>`).join('')}</div>${f !== c.form ? `<div class="row" style="margin-top:8px"><button class="btn y" data-act="setform" data-a="${f}">用 ${fname(f)}</button><span class="note">而家用緊 ${fname(c.form)}</span></div>` : ''}`)}
      ${pan('打法', `<table><tbody>${Object.entries(STYLE).map(([k, v]) => `<tr><td style="width:120px">${STYLEN[k]} ${info(STYLEI[k])}</td><td><div class="row">${v.map((t, i) => `<button class="chip" data-act="sty" data-a="${k}:${i}" aria-pressed="${c.sty[k] === i}">${t}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>`)}
    </div>
    ${pan(fname(f), `<div class="pitchv">${PITCHV}${shirtsHTML(cid, f === c.form ? c.xi : Array(11).fill(null), f)}</div>`, { t: 1 })}
  </div>`);
};

/* ---------- 訓練 ---------- */
SCREENS.training = () => {
  const c = myClub(), ros = roster(myCid());
  const avgC = ros.length ? Math.round(sum(ros.map(p => pd(p).cond)) / ros.length) : 0, low = ros.filter(p => pd(p).cond < 70).length, inj = ros.filter(p => pd(p).inj).length;
  main(`${hdr('訓練')}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan(`強度 ${info('重訓練：後生球員進步快啲，但體能回復慢，仲有少量受傷風險。輕訓練：回復快，進步慢。每個星期一計一次。')}`, `<div class="row">${chips([[0, '輕'], [1, '中'], [2, '重']], c.tr.int, 'trint')}</div>`)}
      ${pan(`重點 ${info('進攻／防守／戰術：比賽中對應能力有少量加成。均衡：冇加成。')}`, `<div class="row">${chips([['bal', '均衡'], ['att', '進攻'], ['def', '防守'], ['tac', '戰術']], c.tr.foc, 'trfoc')}</div>`)}
      ${pan('球隊狀況', `<dl class="kv"><dt>平均體能</dt><dd>${avgC}${cbar(avgC)}</dd><dt>體能低過 70</dt><dd>${low} 人</dd><dt>傷兵</dt><dd>${inj} 人</dd><dt>教練等級</dt><dd>${c.st.coach} / 5</dd><dt>每日回復</dt><dd>約 ${([7, 6, 4.5][c.tr.int] + c.st.physio * .4).toFixed(1)} 體能</dd></dl>`, { t: 1 })}
    </div>
    ${pan('傷兵名單', inj ? `<table><thead><tr><th>球員</th><th>傷勢</th><th class="n">日</th></tr></thead><tbody>${ros.filter(p => pd(p).inj).map(p => `<tr><td class="nm">${pl(p)}</td><td>${esc(pd(p).injn)}</td><td class="n">${pd(p).inj}</td></tr>`).join('')}</tbody></table>` : '<p class="note">冇傷兵。</p>', { t: 1 })}
  </div>`);
};

/* ---------- 職員 ---------- */
const STAFFN = { coach: ['教練', '提升訓練效果，後生球員進步快啲。'], physio: ['物理治療師', '傷癒快啲，每日體能回復多啲。'], scout: ['球探', '抽卡時 SR 機率上升、C 機率下降（每級 ±1.5%）。'] };
SCREENS.staff = () => {
  const c = myClub(), tf = TIERF[c.lg] || .7;
  main(`${hdr('職員', info('升級係一次過付款；等級越高週薪越貴（每週自動扣）。'))}
  ${pan('職員', `<table><thead><tr><th>職位</th><th>等級</th><th class="hm">作用</th><th class="n">週薪</th><th>升級</th></tr></thead><tbody>${Object.entries(STAFFN).map(([k, [n, d]]) => { const l = c.st[k], cost = (l + 1) ** 2 * 5e4; return `<tr><td class="nm">${n}</td><td class="num" style="color:var(--sel)">${'★'.repeat(l)}${'☆'.repeat(5 - l)}</td><td class="hm">${d}</td><td class="n">${money(Math.round(l * l * 350 * tf))}</td><td>${l < 5 ? `<button class="btn sm" data-act="staffup" data-a="${k}">升到 ${l + 1} 級 · ${money(cost)}</button>` : '<span class="mute">最高級</span>'}</td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
};

/* ---------- 球員搜尋 ---------- */
function searchRows() {
  const f = UI.sr, q = f.q.trim().toLowerCase(), maxA = +f.age || 99, maxV = +f.val * 1e6 || Infinity, me = myCid();
  const out = [];
  for (const pid in G.pl) {
    const d = G.pl[pid]; if (d.c === 'ret' || d.c === me) continue;
    const p = ps(pid);
    if (f.pos && lineOf(p.pos) !== f.pos && p.pos !== f.pos) continue;
    if (f.lg === 'free' ? d.c !== 'free' : f.lg && (d.c === 'free' || G.clubs[d.c].lg !== f.lg)) continue;
    if (ageOf(pid) > maxA) continue;
    if (q && !(p.name.toLowerCase().includes(q) || clubName(d.c).toLowerCase().includes(q))) continue;
    const v = valueOf(pid); if (v > maxV) continue;
    out.push([pid, v]);
  }
  const k = f.sort;
  out.sort((a, b) => k === 'val' ? b[1] - a[1] : k === 'age' ? ageOf(a[0]) - ageOf(b[0]) : k === 'name' ? ps(a[0]).name.localeCompare(ps(b[0]).name) : pd(b[0]).sk - pd(a[0]).sk);
  return [out.length, out.slice(0, 200).map(([pid, v]) => { const d = pd(pid); return `<tr class="click" data-pl="${pid}"><td class="nm">${esc(ps(pid).name)}</td><td class="nm hm">${esc(clubName(d.c))}</td><td class="n">${ageOf(pid)}</td><td class="n">${ps(pid).pos}</td><td class="n">${d.sk}</td><td class="n">${money(v)}</td><td class="n hm">${money(d.w)}</td><td class="hm">${pTags(pid)}</td></tr>`; }).join('')];
}
SCREENS.search = () => {
  const f = UI.sr, [n, rows] = searchRows();
  main(`${hdr('球員搜尋', `<span class="mute" id="srn">${n} 人${n > 200 ? '（顯示頭 200）' : ''}</span>`)}
  <div class="row"><input class="inp" data-in="sr" data-a="q" placeholder="姓名或球會" value="${esc(f.q)}" style="flex:1 1 160px">
    <select class="inp" data-ch="sr" data-a="pos" aria-label="位置">${opt('', '全部位置', f.pos)}${[['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒']].map(([v, t]) => opt(v, t, f.pos)).join('')}${Object.entries(POSN).map(([v, t]) => opt(v, v + ' ' + t, f.pos)).join('')}</select>
    <select class="inp" data-ch="sr" data-a="lg" aria-label="聯賽">${opt('', '全部聯賽', f.lg)}${PLAY_LG.map(l => opt(l, LG[l].name, f.lg)).join('')}${opt('eur', '歐洲球會', f.lg)}${opt('free', '自由球員', f.lg)}</select>
    <input class="inp num" data-in="sr" data-a="age" placeholder="最大年齡" value="${esc(f.age)}" inputmode="numeric" style="width:90px">
    <input class="inp num" data-in="sr" data-a="val" placeholder="身價上限 £m" value="${esc(f.val)}" inputmode="decimal" style="width:110px">
    <select class="inp" data-ch="sr" data-a="sort" aria-label="排序">${[['sk', '按能力'], ['val', '按身價'], ['age', '按年齡'], ['name', '按名']].map(([v, t]) => opt(v, t, f.sort)).join('')}</select></div>
  ${pan('結果', `<table><thead><tr><th>球員</th><th class="hm">球會</th><th class="n">歲</th><th class="n">位</th><th class="n">能力</th><th class="n">身價</th><th class="n hm">週薪</th><th class="hm">狀態</th></tr></thead><tbody id="srt">${rows}</tbody></table>`, { st: 'flex:1' })}`);
};

/* ---------- player profile modal ---------- */
function openPlayer(pid, step) { UI.pm = { pid, step: step || null, msg: '', fee: null, wage: null, yrs: 3 }; drawPlayer(); }
function drawPlayer() {
  const P = UI.pm, pid = P.pid, d = pd(pid), p = ps(pid), mine = d.c === myCid(), a = attrs(pid), an = attrNames(pid), s = d.s;
  let act = '';
  if (!myCid()) act = '<p class="note">你而家待業，唔可以買賣球員。</p>';
  else if (d.c === 'ret') act = '<p class="note">已退休。</p>';
  else if (mine) {
    if (P.step === 'renew') { const dem = Math.max(d.w, roundMoney(wageFor(d.sk, myClub().lg) * 1.05 / 10) * 10); act = `<div class="row">週薪 £<input class="inp num" id="pw" value="${P.wage ?? dem}" style="width:100px" inputmode="numeric"> 年期 <select class="inp" id="py">${[1, 2, 3, 4, 5].map(y => opt(y, y + ' 年', P.yrs)).join('')}</select><button class="btn y" data-act="renew">提出續約</button><button class="btn" data-act="pstep" data-a="">取消</button></div>`; }
    else if (P.step === 'rel') act = `<div class="row"><span class="bad">確定同 ${esc(p.sn)} 解約？要賠 ${money(Math.round(d.w * 52 * Math.max(0, d.ct - G.season) * .5))}。</span><button class="btn r" data-act="release">確定解約</button><button class="btn" data-act="pstep" data-a="">取消</button></div>`;
    else act = `<div class="row"><button class="btn" data-act="list">${d.list ? '取消放售' : '放售'}</button><button class="btn" data-act="pstep" data-a="renew">續約</button><button class="btn r" data-act="pstep" data-a="rel">解約</button></div>`;
  } else {
    if (P.step === 'ct') act = `<div class="row">週薪 £<input class="inp num" id="pw" value="${P.wage ?? wageDemand(pid, myCid())}" style="width:100px" inputmode="numeric"> 年期 <select class="inp" id="py">${[1, 2, 3, 4, 5].map(y => opt(y, y + ' 年', P.yrs)).join('')}</select><button class="btn y" data-act="offerct">提出合約</button><button class="btn" data-act="pstep" data-a="">取消</button></div>`;
    else act = `<div class="row">轉會費 £<input class="inp num" id="pf" value="${P.fee ?? (d.c === 'free' ? 0 : valueOf(pid))}" style="width:120px" inputmode="numeric" ${d.c === 'free' ? 'disabled' : ''}><button class="btn y" data-act="bid">${d.c === 'free' ? '傾合約' : '出價'}</button>${P.counter ? `<button class="btn" data-act="bidc">出 ${money(P.counter)}</button>` : ''}</div>`;
  }
  modal(`${esc(p.name)}`, `<div class="pf">${d.c !== 'free' && d.c !== 'ret' ? badgeSVG(d.c, 64) : ''}<div><div class="D" style="font-size:20px">${esc(clubName(d.c))}</div><div class="mute">${POSN[p.pos]}（${p.pos}）· ${ageOf(pid)} 歲 · ${esc(natName(p.nat))} · #${d.no || '—'}</div><div>${pTags(pid)}</div></div><div class="gcard g-${GRADE(d.sk)} pfc"><span class="r">${d.sk}</span><span class="g">${GRADE(d.sk)}</span></div></div>
    <dl class="kv kv2"><dt>身價</dt><dd>${money(valueOf(pid))}</dd><dt>週薪</dt><dd>${money(d.w)}</dd><dt>合約至</dt><dd>${d.c === 'free' ? '—' : d.ct + ' 年 6 月'}</dd><dt>體能</dt><dd>${Math.round(d.cond)}${cbar(d.cond)}</dd><dt>表現</dt><dd>${form(pid) ? form(pid).toFixed(1) : '–'}</dd><dt>傷病</dt><dd>${d.inj ? `${esc(d.injn)}（${d.inj} 日）` : '冇'}</dd></dl>
    <div class="attrs">${an.map((n, k) => `<div><span>${n}</span><b class="num">${a[k]}</b><div class="bar"><i style="width:${a[k]}%;background:${a[k] >= 85 ? 'var(--win)' : a[k] >= 70 ? 'var(--sel)' : a[k] >= 55 ? '#9cc0ff' : 'var(--loss)'}"></i></div></div>`).join('')}</div>
    <table><thead><tr><th class="n">上陣</th><th class="n">入球</th><th class="n">助攻</th><th class="n">黃牌</th><th class="n">紅牌</th><th class="n">最佳</th><th class="n">平均評分</th></tr></thead><tbody><tr><td class="n">${s.ap}</td><td class="n">${s.gl}</td><td class="n">${s.as}</td><td class="n">${s.yc}</td><td class="n">${s.rc}</td><td class="n">${s.mom}</td><td class="n">${s.ap ? (s.rt / s.ap).toFixed(2) : '–'}</td></tr></tbody></table>
    <div class="pact">${P.msg ? `<p class="msg">${esc(P.msg)}</p>` : ''}${act}</div>`);
}

/* ---------- 轉會市場 ---------- */
SCREENS.market = () => {
  const t = UI.mk, me = myCid();
  let body;
  if (t === 'off') body = G.off.length ? `<table><thead><tr><th>球員</th><th>出價球會</th><th class="n">報價</th><th class="n hm">身價</th><th class="n">期限</th><th></th></tr></thead><tbody>${G.off.map(o => `<tr><td class="nm">${pl(o.pid)}</td><td class="nm">${esc(clubName(o.from))}</td><td class="n">${money(o.fee)}</td><td class="n hm">${money(valueOf(o.pid))}</td><td class="n">${fdate(o.exp, 's')}</td><td><button class="btn sm y" data-act="accept" data-a="${o.id}">接受</button> <button class="btn sm" data-act="reject" data-a="${o.id}">拒絕</button></td></tr>`).join('')}</tbody></table>` : '<p class="note">暫時冇報價。放售球員會多啲人問。</p>';
  else if (t === 'list') { const l = roster(me).filter(p => pd(p).list); body = l.length ? `<table><thead><tr><th>球員</th><th class="n">歲</th><th class="n">能力</th><th class="n">身價</th><th></th></tr></thead><tbody>${l.map(p => `<tr><td class="nm">${pl(p)}</td><td class="n">${ageOf(p)}</td><td class="n">${pd(p).sk}</td><td class="n">${money(valueOf(p))}</td><td><button class="btn sm" data-act="unlist" data-a="${p}">取消放售</button></td></tr>`).join('')}</tbody></table>` : '<p class="note">你冇放售球員。喺球員資料撳「放售」。</p>'; }
  else body = G.tlog.length ? `<table><thead><tr><th class="n">日期</th><th>球員</th><th class="hm">由</th><th>去</th><th class="n">轉會費</th></tr></thead><tbody>${G.tlog.map(x => `<tr class="${isUser(x.to) || isUser(x.from) ? 'me' : ''}"><td class="n">${fdate(x.d, 's')}</td><td class="nm">${G.pl[x.pid] ? pl(x.pid) : esc(ps(x.pid).sn)}</td><td class="nm hm">${esc(clubName(x.from))}</td><td class="nm">${esc(clubName(x.to))}</td><td class="n">${x.fee ? money(x.fee) : '自由'}</td></tr>`).join('')}</tbody></table>` : '<p class="note">未有轉會。</p>';
  main(`${hdr('轉會市場', `<span class="mute">${inWindow(G.day) ? '轉會窗開放至 3 月 28 日' : '轉會窗已關，7 月 1 日重開'}</span>`)}
  <div class="tabs">${chips([['off', `收到報價（${G.off.length}）`], ['list', '我放售嘅球員'], ['log', '轉會紀錄']], t, 'mktab')}</div>
  ${pan({ off: '收到報價', list: '放售名單', log: '轉會紀錄' }[t], body, { st: 'flex:1' })}`);
};

/* ---------- 球探抽卡 ---------- */
const gcardHTML = (pid, g, from) => `<div class="gcard g-${g}"><span class="r">${pd(pid).sk}</span><span class="g">${g}</span><span class="p">${ps(pid).pos}</span><span class="n">${esc(ps(pid).sn)}</span><span class="c">${esc(clubName(from))} · ${ageOf(pid)}歲</span></div>`;
SCREENS.gacha = () => {
  const c = myClub(), sc = c.st.scout;
  main(`${hdr('球探抽卡', info('球探喺全世界幫你搵人：抽中嘅球員即刻免轉會費加盟（新合約，週薪照計）。用球會資金付款，十連抽保底一張 SR 或以上。球隊最多 45 人，滿咗會退返部分費用。'))}
  <div class="cols c2 m-stack">
    ${pan('抽卡', `<div class="gban"><div class="D" style="font-size:30px;line-height:1">全世界球員<br>一抽即加盟</div><p class="note" style="margin:8px 0">資金 ${G.inf ? '∞' : money(c.cash)} · 已抽 ${G.stats.pulls} 次</p>
      <div class="row"><button class="btn y" data-act="pull" data-a="10" style="font-size:18px;padding:10px 16px">十連抽 · ${money(pullCost(10))}</button><button class="btn" data-act="pull" data-a="1" style="font-size:18px;padding:10px 16px">單抽 · ${money(pullCost(1))}</button></div></div>`)}
    ${pan(`機率 · 球探 ${sc} 級`, `<table><thead><tr><th>等級</th><th class="n">能力</th><th class="n">機率</th></tr></thead><tbody>${GRATES.map(([g, p]) => `<tr><td><span class="tag g-${g}" style="background:var(--c1);color:var(--ink)">${g}</span></td><td class="n">${{ UR: '90+', SSR: '85–89', SR: '77–84', R: '68–76', C: '<68' }[g]}</td><td class="n">${(g === 'C' ? p - sc * 1.5 : g === 'SR' ? p + sc * 1.5 : p).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`, { t: 1 })}
  </div>`);
};
function doPull(n) {
  const r = gachaPull(n);
  if (r.err) return toast(r.err);
  save();
  modal(n === 10 ? '十連抽結果' : '抽卡結果', `<div class="pgrid">${r.out.map((o, k) => `<div class="flip h-${o.g}" data-k="${k}"><div class="in"><div class="back">XI</div>${gcardHTML(o.pid, o.g, o.from)}</div><div class="fst ${o.full ? 'bad' : 'good'}">${o.full ? '球隊滿員，退還部分費用' : '已加盟'}</div></div>`).join('')}</div><div class="row" style="justify-content:center"><button class="btn y" data-act="pull" data-a="${n}">再抽</button><button class="btn" data-act="mclose">完成</button></div>`, 'tall');
  $$('#modal .flip').forEach((f, k) => setTimeout(() => f.classList.add('on'), 250 + k * 160));
  render();
}

/* ---------- 合約 ---------- */
SCREENS.contracts = () => {
  const l = [...roster(myCid())].sort((a, b) => pd(a).ct - pd(b).ct || pd(b).sk - pd(a).sk);
  main(`${hdr('合約', info('合約喺到期嗰年 6 月完結；7 月 1 日未續約就會自由身離隊。'))}
  ${pan(`合約 · 週薪總數 ${money(sum(l.map(p => pd(p).w)))}`, `<table><thead><tr><th>球員</th><th class="n">歲</th><th class="n">位</th><th class="n">能力</th><th class="n">週薪</th><th class="n">到期</th><th class="n hm">身價</th><th></th></tr></thead><tbody>${l.map(p => { const d = pd(p); return `<tr><td class="nm">${pl(p)}</td><td class="n">${ageOf(p)}</td><td class="n">${ps(p).pos}</td><td class="n">${d.sk}</td><td class="n">${money(d.w)}</td><td class="n ${d.ct <= G.season ? 'bad' : ''}">${d.ct}</td><td class="n hm">${money(valueOf(p))}</td><td><button class="btn sm" data-act="renewopen" data-a="${p}">續約</button></td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
};

/* ---------- 財政 ---------- */
const FINK = [['gate', '門票'], ['tv', '電視轉播'], ['merch', '商品'], ['spon', '贊助'], ['prize', '獎金'], ['tin', '賣人收入'], ['wage', '球員薪金'], ['staff', '職員'], ['tout', '買人支出'], ['scout', '球探'], ['build', '球場工程']];
SCREENS.finance = () => {
  const c = myClub(), cid = myCid(), att = attendance(cid, null, c.lg);
  const col = o => FINK.map(([k, n]) => `<tr><td>${n}</td><td class="n ${(o[k] || 0) < 0 ? 'bad' : (o[k] || 0) > 0 ? 'good' : ''}">${money(o[k] || 0)}</td></tr>`).join('') + `<tr class="me"><td>合計</td><td class="n">${money(sum(Object.values(o)))}</td></tr>`;
  main(`${hdr('財政', `<span class="big ${c.cash < 0 ? 'bad' : ''}">${G.inf ? '∞' : money(c.cash)}</span>`)}
  <div class="cols c3 m-stack">
    ${pan('本週', `<table><tbody>${col(c.fin.w)}</tbody></table>`)}
    ${pan('今季', `<table><tbody>${col(c.fin.s)}</tbody></table>`)}
    ${pan(`門票 ${info('票價越高每個入場觀眾俾得多，但入座率會跌。成績好、對手有名、盃賽都會多人入場。')}`, `<dl class="kv"><dt>票價</dt><dd>£<input class="inp num" data-ch="price" value="${c.price}" style="width:70px" inputmode="numeric"></dd><dt>預計入場</dt><dd>${att.toLocaleString()} / ${c.cap.toLocaleString()}</dd><dt>預計門票</dt><dd>${money(att * c.price)} 每場</dd></dl>`, { t: 1 })}
  </div>`);
};

/* ---------- 球場 ---------- */
SCREENS.stadium = () => {
  const c = myClub(), cid = myCid(), home = G.fx.filter(f => f.h === cid && f.att && !f.n), avg = home.length ? Math.round(sum(home.map(f => f.att)) / home.length) : 0;
  const opts = [[2000, 3e6, 120], [5000, 8e6, 240]];
  main(`${hdr('球場')}
  <div class="cols c2 m-stack">
    ${pan(esc(CL[cid].stadium), `<dl class="kv"><dt>容量</dt><dd class="big">${c.cap.toLocaleString()}</dd><dt>今季平均入場</dt><dd>${avg ? avg.toLocaleString() : '—'}</dd><dt>入座率</dt><dd>${avg ? Math.round(avg / c.cap * 100) + '%' : '—'}</dd><dt>票價</dt><dd>£${c.price}</dd></dl>`)}
    ${pan('擴建', c.build ? `<p>新看台工程進行中：+${c.build.seats.toLocaleString()} 座位，預計 ${fdate(c.build.done)} 完成。</p>` : `<table><tbody>${opts.map(([s, cost, days]) => `<tr><td>+${s.toLocaleString()} 座位</td><td class="n">${money(cost)}</td><td class="n">${days} 日</td><td><button class="btn sm" data-act="build" data-a="${s}:${cost}:${days}">興建</button></td></tr>`).join('')}</tbody></table><p class="note" style="margin-top:8px">入座率長期接近 100% 先值得擴建。</p>`, { t: 1 })}
  </div>`);
};

/* ---------- 董事局 ---------- */
SCREENS.board = () => {
  const cid = myCid(), c = cid && myClub();
  const pos = cid ? standings(G.comp[c.lg].tab).findIndex(x => x.c === cid) + 1 : 0;
  const jobs = G.jobs.length ? `<table><thead><tr><th>球會</th><th>聯賽</th><th>聲望</th><th class="n">期限</th><th></th></tr></thead><tbody>${G.jobs.map(j => `<tr><td class="nm">${esc(clubName(j.c))}</td><td>${esc(LG[G.clubs[j.c].lg].name)}</td><td class="num" style="color:var(--sel)">${stars(G.clubs[j.c].rep)}</td><td class="n">${fdate(j.exp, 's')}</td><td><button class="btn sm y" data-act="job" data-a="${j.c}">接受</button></td></tr>`).join('')}</tbody></table>` : '<p class="note">暫時冇工作邀請。</p>';
  main(`${hdr('董事局')}
  <div class="cols c2 m-stack">
    ${cid ? pan('董事局信心', `<div class="big">${Math.round(c.conf)}%</div><div class="bar" style="margin:6px 0 10px"><i style="width:${c.conf}%;background:${c.conf >= 50 ? 'var(--win)' : c.conf >= 25 ? 'var(--warn)' : 'var(--loss)'}"></i></div>
      <dl class="kv"><dt>今季目標</dt><dd>${esc(c.goal || '—')}</dd><dt>預期名次</dt><dd>第 ${c.exp} 名</dd><dt>而家名次</dt><dd>第 ${pos} 名</dd><dt>領隊聲望</dt><dd>${Math.round(G.mgr.rep)} / 100</dd><dt>資金</dt><dd>${G.inf ? '∞' : money(c.cash)}</dd></dl>
      <p class="note" style="margin-top:8px">${c.conf < 25 ? '⚠ 董事局好唔滿意，再輸落去隨時被炒。' : c.conf < 50 ? '董事局有啲擔心。' : '董事局對你有信心。'}</p>`)
      : pan('待業中', `<p>你而家冇球會。等工作邀請，或者撳「下一日」推進日子。</p><dl class="kv"><dt>領隊聲望</dt><dd>${Math.round(G.mgr.rep)} / 100</dd></dl>`)}
    ${pan('工作邀請', jobs, { t: 1 })}
  </div>`);
};

/* ---------- 賽程 ---------- */
SCREENS.fixtures = () => {
  const cid = UI.fxc || myCid() || G.lgm.eng1[0], list = clubFx(cid);
  main(`${hdr('賽程', `<select class="inp" data-ch="fxc" aria-label="球會">${PLAY_LG.concat('eur').map(l => `<optgroup label="${esc(LG[l].name)}">${byRep(G.lgm[l]).map(c => opt(c, clubName(c), cid)).join('')}</optgroup>`).join('')}</select>`)}
  ${pan(`${esc(clubName(cid))} · ${list.length} 場`, `<table><thead><tr><th class="n">日期</th><th>賽事</th><th class="hm">圈數</th><th class="n">主客</th><th>對手</th><th class="n">比數</th><th class="hm">入球</th></tr></thead><tbody>${list.map(f => { const h = f.h === cid, r = resOf(f, cid); return `<tr class="${f.d === G.day && f.hg == null ? 'sel' : ''}"><td class="n">${fdate(f.d, 's')}</td><td>${esc(compName(f.c))}</td><td class="hm">${roundName(f)}</td><td class="n">${f.n ? '中' : h ? '主' : '客'}</td><td class="nm">${esc(clubName(h ? f.a : f.h))}</td><td class="n">${scoreTxt(f)} ${wdl(r)}</td><td class="hm sc">${f.sc ? f.sc.filter(x => x[1] === (h ? 'h' : 'a')).map(x => `${esc(x[2])} ${x[0]}'`).join('、') : ''}</td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
  const s = $('#main tr.sel') || [...$$('#main tbody tr')].find(tr => tr.querySelector('td:nth-child(6)').textContent === '–');
  if (s) s.scrollIntoView({ block: 'center' });
};

/* ---------- 積分榜 ---------- */
const CTRY = [['ENG', '英格蘭', ENG], ['SCO', '蘇格蘭', ['sco1']], ['ESP', '西班牙', ['esp1']], ['ITA', '意大利', ['ita1']], ['GER', '德國', ['ger1']], ['FRA', '法國', ['fra1']]];
function zoneOf(l, i, n) {
  const Z = { eng1: [[4, 'cl'], [6, 'ue'], [n - 3, ''], [n, 'dn']], eng2: [[2, 'up'], [6, 'po'], [n - 3, ''], [n, 'dn']], eng3: [[2, 'up'], [6, 'po'], [n - 4, ''], [n, 'dn']], eng4: [[3, 'up'], [7, 'po']], sco1: [[2, 'cl'], [4, 'ue']], esp1: [[4, 'cl'], [7, 'ue']], ita1: [[4, 'cl'], [7, 'ue']], ger1: [[4, 'cl'], [7, 'ue']], fra1: [[3, 'cl'], [6, 'ue']] }[l] || [];
  for (const [lim, z] of Z) if (i < lim) return z ? 'zone-' + z : '';
  return '';
}
SCREENS.tables = () => {
  const T = UI.tb, cty = CTRY.find(x => x[0] === T.c), lid = cty[2].includes(T.l) ? T.l : cty[2][0], comp = G.comp[lid], st = standings(comp.tab), me = myCid();
  const played = G.fx.filter(f => f.c === lid && f.hg != null).map(f => f.r), maxR = Math.max(...G.fx.filter(f => f.c === lid).map(f => f.r));
  const r = T.r != null && T.lid === lid ? T.r : played.length ? Math.max(...played) : 0;
  const rfx = G.fx.filter(f => f.c === lid && f.r === r);
  main(`${hdr('積分榜', info('左邊色條：綠＝歐聯／升班，藍＝歐洲足協盃，黃＝升級附加賽，紅＝降班。'))}
  <div class="tabs">${chips(CTRY.map(x => [x[0], x[1]]), T.c, 'tbc')}</div>
  ${cty[2].length > 1 ? `<div class="tabs">${chips(cty[2].map(l => [l, LG[l].name]), lid, 'tbl')}</div>` : ''}
  <div class="cols c2 m-stack">
    ${pan(esc(comp.nm), `<table><thead><tr><th class="n">#</th><th>球會</th><th class="n">賽</th><th class="n">勝</th><th class="n">和</th><th class="n">負</th><th class="n hm">入</th><th class="n hm">失</th><th class="n">得失</th><th class="n">分</th></tr></thead><tbody>${st.map((x, i) => `<tr class="${zoneOf(lid, i, st.length)} ${x.c === me ? 'me' : ''}"><td class="n">${i + 1}</td><td class="nm"><a data-go="fixtures" data-a="${x.c}">${esc(clubName(x.c))}</a></td><td class="n">${x.p}</td><td class="n">${x.w}</td><td class="n">${x.d}</td><td class="n">${x.l}</td><td class="n hm">${x.f}</td><td class="n hm">${x.a}</td><td class="n">${x.f - x.a > 0 ? '+' : ''}${x.f - x.a}</td><td class="n">${x.pts}</td></tr>`).join('')}</tbody></table>`)}
    ${pan(`第 ${r + 1} 輪`, `<table><tbody>${rfx.map(f => `<tr class="${isUser(f.h) || isUser(f.a) ? 'me' : ''}"><td class="n">${fdate(f.d, 's')}</td><td class="nm" style="text-align:right">${esc(clubName(f.h))}</td><td class="n">${f.hg == null ? 'v' : f.hg + '-' + f.ag}</td><td class="nm">${esc(clubName(f.a))}</td></tr>`).join('')}</tbody></table>`, { t: 1, r: `<button class="btn sm" data-act="tbr" data-a="${Math.max(0, r - 1)}" ${r <= 0 ? 'disabled' : ''}>‹</button> <button class="btn sm" data-act="tbr" data-a="${Math.min(maxR, r + 1)}" ${r >= maxR ? 'disabled' : ''}>›</button>` })}
  </div>`);
};

/* ---------- 盃賽 ---------- */
function tieHTML(comp, t) {
  const legs = t.fx.map(fxById).filter(Boolean), nm = c => c ? `<span class="${t.w === c ? 'D' : t.w ? 'mute' : ''} ${isUser(c) ? 'mine' : ''}">${esc(clubName(c))}</span>` : '<span class="mute">輪空</span>';
  const sc = legs.map(f => f.hg == null ? `<span class="mute">${fdate(f.d, 's')}</span>` : `${f.h === t.a ? f.hg + '-' + f.ag : f.ag + '-' + f.hg}${f.et ? '*' : ''}`).join(' · ');
  const pen = legs.find(f => f.ph != null), pTxt = pen ? ` 點 ${pen.h === t.a ? pen.ph + '-' + pen.pa : pen.pa + '-' + pen.ph}` : '';
  return `<tr class="${isUser(t.a) || isUser(t.b) ? 'me' : ''}"><td class="nm" style="text-align:right">${nm(t.a)}</td><td class="n">${t.b ? sc + (t.agg ? ` <span class="mute">(總 ${t.agg[1]}-${t.agg[0]})</span>` : '') + pTxt : ''}</td><td class="nm">${nm(t.b)}</td></tr>`;
}
SCREENS.cups = () => {
  const ids = Object.keys(G.comp).filter(k => G.comp[k].t !== 'L');
  const id = ids.includes(UI.cup) ? UI.cup : (ids.find(k => G.comp[k].cl?.includes?.(myCid()) || [...(G.comp[k].grp || []).flat()].includes(myCid())) || ids[0]);
  const comp = G.comp[id];
  let body = '';
  if (comp.t === 'G') body += `<div class="grps">${comp.grp.map((g, gi) => { const st = standings(Object.fromEntries(g.map(c => [c, comp.gtab[c]]))); return `<table><thead><tr><th>${'ABCDEFGH'[gi]} 組</th><th class="n">賽</th><th class="n">得失</th><th class="n">分</th></tr></thead><tbody>${st.map((x, i) => `<tr class="${isUser(x.c) ? 'me' : ''} ${i < 2 ? 'zone-cl' : i === 2 ? 'zone-ue' : ''}"><td class="nm">${esc(clubName(x.c))}</td><td class="n">${x.p}</td><td class="n">${x.f - x.a}</td><td class="n">${x.pts}</td></tr>`).join('')}</tbody></table>`; }).join('')}</div>`;
  const rounds = comp.rd.map((rd, r) => [rd, comp.ties.filter(t => t.r === r)]).filter(([, ts]) => ts.length);
  body += rounds.length ? rounds.reverse().map(([rd, ts]) => `<table style="margin-top:6px"><thead><tr><th colspan="3">${esc(rd.n)}${rd.ven ? ' · ' + esc(rd.ven) : ''}</th></tr></thead><tbody>${ts.map(t => tieHTML(comp, t)).join('')}</tbody></table>`).join('') : `<p class="note" style="margin-top:8px">未抽籤。第一場：${fdate(comp.rd[0].d[0], 'm')}。</p>`;
  main(`${hdr('盃賽', `<select class="inp" data-ch="cup" aria-label="盃賽">${ids.map(k => opt(k, compName(k) + (G.comp[k].done ? '（完）' : ''), id)).join('')}</select>${comp.win ? `<span class="good">🏆 ${esc(clubName(comp.win))}</span>` : ''}`)}
  ${pan(esc(comp.nm), body, { st: 'flex:1' })}`);
};

/* ---------- 數據排名 ---------- */
const RKK = [['gl', '入球'], ['as', '助攻'], ['cd', '紙牌'], ['bp', '最佳球員'], ['fm', '狀態']];
function rankPlayers(lids, k) {
  const out = [];
  for (const pid in G.pl) {
    const d = G.pl[pid]; if (!G.clubs[d.c] || !lids.includes(G.clubs[d.c].lg)) continue;
    const s = d.s; let v;
    if (k === 'gl') v = s.gl; else if (k === 'as') v = s.as; else if (k === 'cd') v = s.yc + s.rc * 3; else if (k === 'bp') v = s.ap >= 5 ? s.rt / s.ap : 0; else v = d.fm.length >= 3 ? form(pid) : 0;
    if (v > 0) out.push([pid, v]);
  }
  return out.sort((a, b) => b[1] - a[1]).slice(0, 60);
}
SCREENS.ratings = () => {
  const K = UI.rk, cty = CTRY.find(x => x[0] === K.c), lids = K.l ? [K.l] : cty ? cty[2] : PLAY_LG;
  let right;
  if (K.t === 'pl') {
    const top = rankPlayers(lids, K.k), fmt = v => K.k === 'bp' || K.k === 'fm' ? v.toFixed(2) : v;
    const colT = part => `<table><tbody>${part.map(([pid, v], i) => `<tr class="${isUser(pd(pid).c) ? 'me' : ''}"><td class="n">${part.base + i + 1}</td><td class="nm">${pl(pid)}<br><small class="mute">${esc(clubShort(pd(pid).c))}</small></td><td class="n">${fmt(v)}</td></tr>`).join('')}</tbody></table>`;
    const cols = [0, 1, 2].map(k => Object.assign(top.slice(k * 20, k * 20 + 20), { base: k * 20 }));
    right = top.length ? `<div class="rk3">${cols.map(colT).join('')}</div>` : '<p class="note">未有數據。</p>';
  } else if (K.t === 'cl') {
    const clubs = lids.flatMap(l => G.lgm[l]).map(c => { const r = roster(c), s = k => sum(r.map(p => pd(p).s[k])); return [c, K.k === 'gl' ? s('gl') : K.k === 'as' ? s('as') : K.k === 'cd' ? s('yc') + s('rc') * 3 : K.k === 'bp' ? (s('ap') ? s('rt') / s('ap') : 0) : (r.length ? sum(r.map(p => form(p))) / r.length : 0)]; }).sort((a, b) => b[1] - a[1]).slice(0, 60);
    right = `<table><tbody>${clubs.map(([c, v], i) => `<tr class="${isUser(c) ? 'me' : ''}"><td class="n">${i + 1}</td><td class="nm">${esc(clubName(c))}</td><td class="n">${K.k === 'bp' || K.k === 'fm' ? v.toFixed(2) : v}</td></tr>`).join('')}</tbody></table>`;
  } else {
    right = G.hist.length ? G.hist.slice().reverse().map(h => `<table style="margin-bottom:6px"><thead><tr><th colspan="3">${seasonTxt(h.s)} 獎項</th></tr></thead><tbody>${h.aw.map(a => `<tr><td>${esc(LG[a.lg].name)}</td><td class="nm">神射手：${a.top ? `${esc(ps(a.top[0]).sn)}（${a.top[1]} 球）` : '—'}</td><td class="nm">最佳球員：${a.best ? `${esc(ps(a.best[0]).sn)}（${a.best[1]}）` : '—'}</td></tr>`).join('')}</tbody></table>`).join('') : '<p class="note">第一季完咗先有獎項。</p>';
  }
  main(`${hdr('數據排名')}
  <div class="tabs">${chips([['pl', '球員'], ['cl', '球會'], ['aw', '獎項']], K.t, 'rkt')}</div>
  <div class="cols m-stack" style="grid-template-columns:200px minmax(0,1fr)">
    ${pan('準則', `<div class="lbl">國家</div><div class="vlist">${[['', '全部'], ...CTRY.map(x => [x[0], x[1]])].map(([v, t]) => `<button class="nb" data-act="rkc" data-a="${v}" aria-current="${(K.c || '') === v && !K.l}">${t}</button>`).join('')}</div>
      ${cty && cty[2].length > 1 ? `<div class="lbl">級別</div><div class="vlist">${cty[2].map(l => `<button class="nb" data-act="rkl" data-a="${l}" aria-current="${K.l === l}">${LG[l].name}</button>`).join('')}</div>` : ''}
      <div class="lbl">準則</div><div class="vlist">${RKK.map(([v, t]) => `<button class="nb" data-act="rkk" data-a="${v}" aria-current="${K.k === v}">${t}</button>`).join('')}</div>`, { t: 1 })}
    ${pan(`${K.t === 'aw' ? '獎項' : RKK.find(x => x[0] === K.k)[1]} · ${K.l ? LG[K.l].name : cty ? cty[1] : '全部'}`, right)}
  </div>`);
};

/* ---------- 歷史 ---------- */
SCREENS.history = () => {
  const mine = G.trophies.filter(t => G.hist.some(h => h.me && h.me.cid === t.w && h.s === t.s) || isUser(t.w));
  main(`${hdr('歷史')}
  <div class="cols c2 m-stack">
    ${pan('歷屆冠軍', G.hist.length ? `<table><thead><tr><th>球季</th>${PLAY_LG.map(l => `<th class="${['eng3', 'eng4'].includes(l) ? 'hm' : ''}">${LG[l].name}</th>`).join('')}</tr></thead><tbody>${G.hist.map(h => `<tr><td class="n">${seasonTxt(h.s)}</td>${PLAY_LG.map(l => `<td class="nm ${['eng3', 'eng4'].includes(l) ? 'hm' : ''}">${esc(clubShort(h.champs[l]))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="note">第一季仲未完。</p>')}
    <div class="cols" style="grid-template-rows:auto minmax(0,1fr)">
      ${pan('你嘅領隊生涯', G.hist.filter(h => h.me).length ? `<table><tbody>${G.hist.filter(h => h.me).map(h => `<tr><td class="n">${seasonTxt(h.s)}</td><td class="nm">${esc(clubName(h.me.cid))}</td><td>${esc(LG[h.me.lg].name)}</td><td class="n">第 ${h.me.pos} 名</td></tr>`).join('')}</tbody></table>` : `<p class="note">${seasonTxt(G.season)} 係你第一季。</p>`, { t: 1 })}
      ${pan('錦標', G.trophies.length ? `<table><tbody>${G.trophies.slice().reverse().map(t => `<tr class="${mine.includes(t) ? 'me' : ''}"><td class="n">${seasonTxt(t.s)}</td><td>${esc(t.nm)}</td><td class="nm">${esc(clubName(t.w))}</td></tr>`).join('')}</tbody></table>` : '<p class="note">今季未有錦標頒發。</p>', { t: 1 })}
    </div>
  </div>`);
};

/* ---------- 收件箱 ---------- */
SCREENS.mail = a => {
  if (a != null) UI.mail = +a;
  const m = G.mail.find(x => x.id === UI.mail) || G.mail[0];
  if (m && !m.rd) { m.rd = 1; rTop(); rNav(); }
  const off = m && m.act && m.act.k === 'offer' && G.off.find(o => o.id === m.act.id);
  main(`${hdr('收件箱', `<span class="mute">${G.mail.filter(x => !x.rd).length} 封未讀</span>`)}
  <div class="cols c2 m-stack" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">
    ${pan('郵件', `<div class="mlist">${G.mail.map(x => `<button class="mi ${x === m ? 'on' : ''} ${x.rd ? '' : 'un'}" data-go="mail" data-a="${x.id}"><span class="num mute">${fdate(x.d, 's')}</span><span>${esc(x.t)}</span></button>`).join('') || '<p class="note">冇郵件。</p>'}</div>`)}
    ${pan(m ? esc(m.t) : '—', m ? `<p class="mute num" style="margin-top:0">${fdate(m.d)}</p><div class="mbody">${m.b}</div>${off ? `<div class="row" style="margin-top:12px"><button class="btn y" data-act="accept" data-a="${off.id}">接受報價</button><button class="btn" data-act="reject" data-a="${off.id}">拒絕</button><button class="btn" data-pl="${off.pid}">睇球員</button></div>` : m.act && m.act.k === 'offer' ? '<p class="note">報價已經處理或者過期。</p>' : ''}` : '', { t: 1 })}
  </div>`);
};

/* ---------- 存檔 ---------- */
SCREENS.save = () => {
  const meta = loadMeta();
  main(`${hdr('存檔', info('每次推進日子同重要操作都會自動儲存到而家用緊嘅存檔位。匯出可以將存檔複製去第二部機。'))}
  <div class="cols c2 m-stack">
    ${pan('存檔位', `<table><tbody>${[1, 2, 3].map(s => { const m = meta[s], conf = UI.del === s; return `<tr class="${G.slot === s ? 'me' : ''}"><td class="n">${s}</td><td class="nm">${m ? `${esc(m.mgr)} · ${esc(m.cid ? clubName(m.cid) : '待業')}<br><small class="mute">${seasonTxt(m.season)} · ${fdate(m.day, 's')}</small>` : '<span class="mute">空</span>'}</td><td>${conf ? `<button class="btn sm r" data-act="sdel" data-a="${s}">確定刪除</button> <button class="btn sm" data-act="sdelc" data-a="">取消</button>` : `<button class="btn sm" data-act="ssave" data-a="${s}">存到呢度</button> ${m && G.slot !== s ? `<button class="btn sm" data-act="sload" data-a="${s}">讀取</button>` : ''} ${m ? `<button class="btn sm" data-act="sdelc" data-a="${s}">刪除</button>` : ''}`}</td></tr>`; }).join('')}</tbody></table>`)}
    ${pan('匯出／匯入', `<textarea class="inp" id="sx" spellcheck="false" style="width:100%;flex:1;min-height:140px;font:12px monospace" placeholder="撳「匯出」或者喺度貼上存檔"></textarea><div class="row" style="margin-top:8px"><button class="btn" data-act="sexp">匯出而家嘅遊戲</button><button class="btn y" data-act="simp">匯入到存檔位 ${G.slot}</button></div>`, { t: 1 })}
  </div>`);
};

/* =====================================================================
   MATCH
   ===================================================================== */
function openMatch() {
  const f = userFxToday(); if (!f) { toast('今日冇比賽'); return; }
  if (!MT || MT.f !== f) MT = { f, M: null, phase: 'pre', spd: 0, timer: null, pos: {}, sel: null, nev: 0 };
  go('match');
}
SCREENS.match = () => { if (!MT) { SCR = 'home'; return SCREENS.home(); } ({ pre: mPre, live: mLive, ft: mFt })[MT.phase](); };
function lineupList(cid) {
  const c = G.clubs[cid]; if (!isUser(cid)) autoPick(cid);
  const sl = FORMS[c.form];
  return `<table><thead><tr><th class="n">位</th><th>球員</th><th class="n">能力</th><th>體能</th></tr></thead><tbody>${c.xi.map((p, i) => p ? `<tr><td class="n">${sl[i][0]}</td><td class="nm">${pl(p)} ${pTags(p)}</td><td class="n">${pd(p).sk}</td><td>${Math.round(pd(p).cond)}${cbar(pd(p).cond)}</td></tr>` : `<tr><td class="n">${sl[i][0]}</td><td colspan="3" class="bad">冇人</td></tr>`).join('')}</tbody></table><p class="note" style="margin-top:6px">後備：${c.sb.map(p => esc(ps(p).sn)).join('、') || '—'}</p>`;
}
function mPre() {
  const f = MT.f, c = myClub(), probs = lineupProblems(myCid()), rd = G.comp[f.c].rd?.[f.r];
  const ven = f.n ? (rd?.ven || '中立場') : CL[f.h].stadium;
  main(`<div class="mtop"><div class="tm" style="text-align:right">${esc(clubName(f.h))}</div><div><div class="sc">v</div><div class="mn">${esc(compName(f.c))} · ${roundName(f)}</div></div><div class="tm">${esc(clubName(f.a))}</div></div>
  <div class="row"><span class="mute">${fdate(f.d)} · ${esc(ven)}</span><span style="margin-left:auto"></span>
    <select class="inp" data-ch="form" aria-label="陣式">${formOpts(c.form)}</select>
    <select class="inp" data-ch="ment" aria-label="心態">${STYLE.ment.map((t, i) => opt(i, '心態：' + t, c.sty.ment)).join('')}</select>
    <button class="btn" data-go="squad">調整陣容</button><button class="btn" data-act="mquick">快速結果</button><button class="btn y" data-act="mstart">開波 ▶</button></div>
  ${probs.length ? `<p class="bad" style="margin:0">⚠ ${esc(probs.join('；'))}（開波時會自動補位）</p>` : ''}
  <div class="cols c2 m-stack" style="grid-template-columns:1fr 1fr">${pan(esc(clubName(f.h)) + ' · ' + fname(G.clubs[f.h].form), lineupList(f.h))}${pan(esc(clubName(f.a)) + ' · ' + fname(G.clubs[f.a].form), lineupList(f.a), { t: 1 })}</div>`);
}
const SPD = [350, 175, 88];
function startLive() { MT.M = newMatch(MT.f, true); MT.phase = 'live'; MT.pos = {}; MT.nev = 0; render(); runLive(); }
function runLive() { if (!MT || MT.phase !== 'live' || MT.timer || MT.M.pause || MT.M.done) return; MT.timer = setInterval(liveTick, SPD[MT.spd]); updLive(); }
function pauseLive() { clearInterval(MT.timer); MT.timer = null; }
function liveTick() {
  const M = MT.M; step(M);
  if (M.done) { pauseLive(); MT.phase = 'ft'; save(); return render(); }
  if (M.pause) { pauseLive(); updLive(); return breakPanel(); }
  updLive();
}
const nm = pid => pid ? ps(pid).sn : '';
function evText(e, M) {
  const t = e.s ? clubShort(M[e.s].cid) : '', x = e.x;
  switch (e.t) {
    case 'goal': return `⚽ 入球！${nm(e.p)}（${t}）${x === 'pen' ? '射入十二碼' : x === 'hd' ? '頭槌頂入' : x === 'ls' ? '遠射破網' : x === 'dr' ? '連過幾人後射入' : '起腳破網'}${e.p2 ? `，${nm(e.p2)} 助攻` : ''}`;
    case 'miss': return `${nm(e.p)}（${t}）${x === 'ls' ? '遠射高出' : x === 'hd' ? '頭槌頂高' : '射門偏出'}`;
    case 'save': return `${nm(e.p2) || '門將'} 撲出 ${nm(e.p)}（${t}）嘅${x === 'hd' ? '頭槌' : x === 'ls' ? '遠射' : '射門'}`;
    case 'tackle': return `${nm(e.p)}（${t}）想盤過對手，被斷波`;
    case 'yc': return `🟨 ${nm(e.p)}（${t}）黃牌`;
    case 'rc': return `🟥 ${nm(e.p)}（${t}）直接紅牌離場`;
    case 'rc2': return `🟥 ${nm(e.p)}（${t}）兩黃變一紅`;
    case 'inj': return `🚑 ${nm(e.p)}（${t}）${x || '受傷'}`;
    case 'sub': return `🔁 ${t} 換人：${nm(e.p)} 入，${nm(e.p2)} 出`;
    case 'pmiss': return `${nm(e.p)}（${t}）射失十二碼！${e.p2 ? nm(e.p2) + ' 撲出' : ''}`;
    case 'ht': return '半場';
    case 'et': return '打和，要加時';
    case 'pens': return `互射十二碼：${x}`;
    case 'ft': return '完場';
  }
  return e.t;
}
function evRow(e, M) { const cls = e.t === 'goal' ? 'g' : e.t === 'rc' || e.t === 'rc2' ? 'rc' : ''; return `<div class="${cls}"><span class="m">${e.m ? e.m + "'" : ''}</span><span>${esc(evText(e, M))}</span></div>`; }
function statsHTML(M) {
  const H = M.h, A = M.a, pos = H.pos + A.pos ? Math.round(H.pos / (H.pos + A.pos) * 100) : 50;
  return `<div class="mstat">${[['控球', pos + '%', 100 - pos + '%'], ['射門', H.sh, A.sh], ['射中', H.sot, A.sot], ['角球', H.co, A.co], ['犯規', H.fo, A.fo], ['黃牌', H.yc, A.yc], ['紅牌', H.rc, A.rc]].map(([k, a, b]) => `<b class="l">${a}</b><span class="mute">${k}</span><b>${b}</b>`).join('')}</div>`;
}
function mLive() {
  const M = MT.M, f = MT.f;
  main(`<div class="mtop"><div class="tm" style="text-align:right">${esc(clubName(f.h))}</div><div><div class="sc" id="msc">${M.h.g} - ${M.a.g}</div><div class="mn" id="mmin">${minLabel(M)}'</div></div><div class="tm">${esc(clubName(f.a))}</div></div>
  <div class="row"><span class="mute">速度</span>${['1×', '2×', '4×'].map((t, i) => `<button class="chip" data-act="mspd" data-a="${i}" aria-pressed="${MT.spd === i}">${t}</button>`).join('')}<span style="margin-left:auto"></span>
    <button class="btn" data-act="mrun" id="mrun">${MT.timer ? '暫停' : '繼續'}</button><button class="btn" data-act="msub">換人 · 戰術</button><button class="btn r" data-act="mskip">跳到完場</button></div>
  <div class="cols c2 m-stack mlive">${pan('球場', '<canvas id="pitch"></canvas>', { cls: 'pitchp' })}
    <div class="cols" style="grid-template-rows:minmax(0,1fr) auto">${pan('旁述', `<div class="feed" id="mfeed"></div>`, { t: 1 })}${pan('數據', `<div id="mst">${statsHTML(M)}</div>`, { t: 1 })}</div></div>`);
  MT.nev = 0; updLive();
  cancelAnimationFrame(MT.raf); MT.raf = requestAnimationFrame(drawPitch);
}
function updLive() {
  const M = MT.M, fd = $('#mfeed'); if (!fd) return;
  $('#msc').textContent = `${M.h.g} - ${M.a.g}`; $('#mmin').textContent = minLabel(M) + "'";
  const show = M.ev.filter(e => e.t !== 'ft');
  if (show.length > MT.nev) { fd.insertAdjacentHTML('afterbegin', show.slice(MT.nev).reverse().map(e => evRow(e, M)).join('')); MT.nev = show.length; }
  $('#mst').innerHTML = statsHTML(M);
  const b = $('#mrun'); if (b) b.textContent = MT.timer ? '暫停' : '繼續';
}
function drawPitch() {
  const cv = $('#pitch'); if (!cv || !MT || !MT.M) return;
  const M = MT.M, r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (!W || !H) { MT.raf = requestAnimationFrame(drawPitch); return; }
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const x = cv.getContext('2d'), px = v => v / 100 * W, py = v => v / 100 * H;
  for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#1e7a3b' : '#23874a'; x.fillRect(i * W / 10, 0, W / 10 + 1, H); }
  x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5 * dpr;
  x.strokeRect(px(2), py(3), px(96), py(94)); x.beginPath(); x.moveTo(px(50), py(3)); x.lineTo(px(50), py(97)); x.stroke();
  x.beginPath(); x.arc(px(50), py(50), Math.min(W, H) * .12, 0, 7); x.stroke();
  x.strokeRect(px(2), py(28), px(14), py(44)); x.strokeRect(px(84), py(28), px(14), py(44));
  const t = performance.now() / 900, sh = (M.ball[0] - 50) * .3, ease = (k, X, Y) => { const p = MT.pos[k] || (MT.pos[k] = [X, Y]); p[0] += (X - p[0]) * .06; p[1] += (Y - p[1]) * .06; return p; };
  const rad = Math.max(4, Math.min(W, H) * .022);
  for (const S of [M.h, M.a]) {
    const home = S.key === 'h', col = CL[S.cid].col;
    S.on.forEach((o, i) => {
      if (!o.pid) return;
      let X = home ? (100 - o.y) * .5 : 100 - (100 - o.y) * .5, Y = home ? o.x : 100 - o.x;
      X = clamp(X + (o.slot === 'GK' ? sh * .15 : sh) + Math.sin(t + i * 1.7) * 1.2, 3, 97); Y = clamp(Y + (M.ball[1] - 50) * .12 + Math.cos(t * .8 + i) * 1.5, 5, 95);
      const p = ease(S.key + i, X, Y);
      x.beginPath(); x.arc(px(p[0]), py(p[1]), rad, 0, 7); x.fillStyle = col[0]; x.fill(); x.lineWidth = 2 * dpr; x.strokeStyle = col[1]; x.stroke();
    });
  }
  const b = ease('ball', M.ball[0], M.ball[1]);
  x.beginPath(); x.arc(px(b[0]), py(b[1]), rad * .55, 0, 7); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1; x.strokeStyle = '#000'; x.stroke();
  MT.raf = requestAnimationFrame(drawPitch);
}
function breakPanel() {
  const M = MT.M, k = M.pause;
  modal(k === 'ht' ? '半場' : '加時', `<div class="big" style="text-align:center">${esc(clubShort(M.h.cid))} ${M.h.g} - ${M.a.g} ${esc(clubShort(M.a.cid))}</div>${statsHTML(M)}<div class="row" style="justify-content:center"><button class="btn" data-act="msub">換人 · 戰術</button><button class="btn y" data-act="mcont">${k === 'ht' ? '開始下半場' : '開始加時'}</button></div>`, 'sm');
}
function subPanel() {
  const M = MT.M, S = M[M.u], rt = p => (6 + (M.rt[p] || 0)).toFixed(1);
  modal(`換人 · 戰術（已換 ${S.subs}/3）`, `<div class="cols c2" style="flex:none"><div><div class="lbl">場上 · 先揀要換走嘅球員</div><table><tbody>${S.on.map(o => o.pid ? `<tr class="click ${MT.sel === o.pid ? 'sel' : ''}" data-act="msel" data-a="${o.pid}"><td class="n">${o.slot}</td><td class="nm">${esc(ps(o.pid).sn)}</td><td>${Math.round(pd(o.pid).cond)}${cbar(pd(o.pid).cond)}</td><td class="n">${rt(o.pid)}</td></tr>` : `<tr><td class="n">${o.slot}</td><td colspan="3" class="bad">冇人</td></tr>`).join('')}</tbody></table></div>
    <div><div class="lbl">後備 · 再揀換入</div><table><tbody>${S.bench.map(p => `<tr class="click" data-act="msubin" data-a="${p}"><td class="n">${ps(p).pos}</td><td class="nm">${esc(ps(p).sn)}</td><td class="n">${pd(p).sk}</td></tr>`).join('') || '<tr><td class="mute">冇後備</td></tr>'}</tbody></table>
    <div class="lbl" style="margin-top:10px">陣式</div><select class="inp" data-ch="mform">${formOpts(S.form)}</select>
    <div class="lbl" style="margin-top:10px">打法</div>${Object.entries(STYLE).map(([k, v]) => `<div class="row" style="margin-bottom:4px"><span style="width:64px">${STYLEN[k]}</span>${v.map((t, i) => `<button class="chip" data-act="msty" data-a="${k}:${i}" aria-pressed="${S.sty[k] === i}">${t}</button>`).join('')}</div>`).join('')}</div></div>`, 'tall');
}
function mFt() {
  const M = MT.M, f = MT.f, sc = s => M.ev.filter(e => e.t === 'goal' && e.s === s).map(e => `${esc(nm(e.p))} ${e.m}'${e.x === 'pen' ? '（十二碼）' : ''}`).join('<br>') || '—';
  const mine = M[M.u], my = [...M.app].filter(p => pd(p).c === mine.cid).sort((a, b) => M.rt[b] - M.rt[a]);
  main(`<div class="mtop"><div class="tm" style="text-align:right">${esc(clubName(f.h))}</div><div><div class="sc">${f.hg} - ${f.ag}</div><div class="mn">完場${f.et ? ' · 加時' : ''}${f.ph != null ? ` · 點球 ${f.ph}-${f.pa}` : ''}</div></div><div class="tm">${esc(clubName(f.a))}</div></div>
  <div class="row"><span>最佳球員：<b class="D" style="color:var(--sel)">${M.mom ? esc(ps(M.mom).name) : '—'}</b>${M.mom ? `（${esc(clubShort(pd(M.mom).c))}）` : ''}</span><span style="margin-left:auto"></span><button class="btn y" data-act="mdone">繼續 ▶</button></div>
  <div class="cols c3 m-stack">${pan('入球', `<div class="cols c2" style="flex:none"><div>${sc('h')}</div><div>${sc('a')}</div></div>${statsHTML(M)}`)}
    ${pan('你嘅球員評分', `<table><tbody>${my.map(p => `<tr><td class="nm">${pl(p)}</td><td class="n">${M.rt[p].toFixed ? M.rt[p].toFixed(1) : M.rt[p]}</td><td class="n">${M.gl[p] ? '⚽'.repeat(M.gl[p]) : ''}</td></tr>`).join('')}</tbody></table>`, { t: 1 })}
    ${pan('旁述', `<div class="feed">${M.ev.slice().reverse().map(e => evRow(e, M)).join('')}</div>`, { t: 1 })}</div>`);
}

/* =====================================================================
   DAY LOOP
   ===================================================================== */
function afterAdvance() { MT = MT && MT.f.hg == null ? MT : null; save(); if (userFxToday()) { openMatch(); toast('今日有比賽！'); } else render(); }
function advance() {
  if (BUSY) return;
  if (userFxToday()) return openMatch();
  MT = null; nextDay(); afterAdvance();
}
async function untilMatch() {
  if (BUSY) return;
  if (userFxToday()) return openMatch();
  BUSY = true; MT = null; toast('推進緊日子…');
  const o0 = G.off.length, j0 = G.jobs.length, cid0 = G.mgr.cid;
  try {
    for (let k = 0; k < 60; k++) {
      nextDay();
      if (userFxToday() || G.off.length > o0 || G.jobs.length > j0 || G.mgr.cid !== cid0) break;
      if (k % 4 === 3) await new Promise(r => setTimeout(r, 0));
    }
  } finally { BUSY = false; }
  afterAdvance();
}

/* =====================================================================
   ACTIONS (delegated)
   ===================================================================== */
let TAPS = 0, TAPT = 0;
const ACT = {
  menu: () => { const n = $('#nav'); n.dataset.open = n.dataset.open === 'true' ? 'false' : 'true'; },
  next: advance, until: untilMatch, match: openMatch,
  quit: () => { save(); showStart(); },
  mclose: closeModal,
  badge: () => { const n = Date.now(); TAPS = n - TAPT < 700 ? TAPS + 1 : 1; TAPT = n; if (TAPS >= 5) { TAPS = 0; cheatBox(); } },
  autopick: () => { autoPick(myCid()); save(); render(); toast('已自動排陣'); },
  sq: el => { const k = el.dataset.k; if (!UI.sel) UI.sel = k; else if (UI.sel === k) UI.sel = null; else { sqSwap(UI.sel, k); UI.sel = null; save(); } render(); },
  tform: el => { UI.tf = el.dataset.a; render(); },
  pform: el => { myClub().form = el.dataset.a; save(); render(); },
  plan: el => { const c = myClub(), i = +el.dataset.a; c.plan = i; if (c.plans && c.plans[i]) { loadPlan(i); toast(`已換到方案 ${'ABC'[i]}`); } save(); render(); },
  plansave: () => { const c = myClub(), i = c.plan ?? 0; c.plans = c.plans || [null, null, null]; c.plans[i] = { form: c.form, cust: c.cust ? c.cust.map(s => [...s]) : null, xi: [...c.xi], sb: [...c.sb] }; save(); render(); toast(`已存入方案 ${'ABC'[i]}`); },
  setform: el => { myClub().form = el.dataset.a; UI.tf = null; save(); render(); toast('陣式已更改，記得睇吓陣容位置'); },
  sty: el => { const [k, v] = el.dataset.a.split(':'); myClub().sty[k] = +v; save(); render(); },
  trint: el => { myClub().tr.int = +el.dataset.a; save(); render(); },
  trfoc: el => { myClub().tr.foc = el.dataset.a; save(); render(); },
  staffup: el => { const c = myClub(), k = el.dataset.a, cost = (c.st[k] + 1) ** 2 * 5e4; if (!G.inf && c.cash < cost) return toast('資金唔夠'); fin(myCid(), 'staff', -cost); c.st[k]++; save(); render(); toast(`${STAFFN[k][0]} 升到 ${c.st[k]} 級`); },
  mktab: el => { UI.mk = el.dataset.a; render(); },
  accept: el => { toast(acceptOffer(+el.dataset.a)); save(); render(); },
  reject: el => { const id = +el.dataset.a; G.off = G.off.filter(o => o.id !== id); save(); render(); toast('已拒絕報價'); },
  unlist: el => { pd(el.dataset.a).list = 0; save(); render(); },
  pull: el => { closeModal(); doPull(+el.dataset.a); },
  renewopen: el => openPlayer(el.dataset.a, 'renew'),
  build: el => { const [s, cost, days] = el.dataset.a.split(':').map(Number), c = myClub(); if (!G.inf && c.cash < cost) return toast('資金唔夠'); fin(myCid(), 'build', -cost); c.build = { seats: s, done: G.day + days }; save(); render(); toast('工程開始'); },
  job: el => { takeJob(el.dataset.a); save(); go('home'); },
  tbc: el => { UI.tb.c = el.dataset.a; UI.tb.l = CTRY.find(x => x[0] === el.dataset.a)[2][0]; UI.tb.r = null; render(); },
  tbl: el => { UI.tb.l = el.dataset.a; UI.tb.r = null; render(); },
  tbr: el => { UI.tb.r = +el.dataset.a; UI.tb.lid = (CTRY.find(x => x[0] === UI.tb.c)[2].includes(UI.tb.l) ? UI.tb.l : CTRY.find(x => x[0] === UI.tb.c)[2][0]); render(); },
  rkt: el => { UI.rk.t = el.dataset.a; render(); },
  rkc: el => { UI.rk.c = el.dataset.a; UI.rk.l = ''; render(); },
  rkl: el => { UI.rk.l = el.dataset.a; render(); },
  rkk: el => { UI.rk.k = el.dataset.a; render(); },
  ssave: el => { G.slot = +el.dataset.a; save(); render(); toast(`已存到存檔位 ${G.slot}`); },
  sload: el => { if (loadGame(+el.dataset.a)) { MT = null; save(); go('home'); toast('已讀取'); } else toast('讀取失敗'); },
  sdelc: el => { UI.del = el.dataset.a ? +el.dataset.a : null; render(); },
  sdel: el => { deleteSave(+el.dataset.a); UI.del = null; render(); toast('已刪除'); },
  sexp: () => { const t = $('#sx'); t.value = pack(); t.select(); const manual = () => toast('已匯出，請手動複製'); try { navigator.clipboard.writeText(t.value).then(() => toast('已複製'), manual); } catch (e) { manual(); } },
  simp: () => { const v = $('#sx').value.trim(); try { JSON.parse(v); localStorage.setItem(SKEY(G.slot), v); if (!loadGame(G.slot)) throw 0; MT = null; save(); go('home'); toast('匯入成功'); } catch (e) { toast('存檔格式唔啱'); } },
  // profile
  pstep: el => { UI.pm.step = el.dataset.a || null; UI.pm.msg = ''; drawPlayer(); },
  list: () => { const d = pd(UI.pm.pid); d.list = d.list ? 0 : 1; save(); drawPlayer(); render(); },
  release: () => { const m = releasePlayer(UI.pm.pid); save(); closeModal(); render(); toast(m); },
  renew: () => { const P = UI.pm, w = +$('#pw').value, y = +$('#py').value; P.wage = w; P.yrs = y; const r = renewContract(P.pid, w, y); P.msg = r.msg; if (r.ok) { P.step = null; save(); render(); } drawPlayer(); },
  bid: () => { const P = UI.pm, fee = Math.max(0, Math.round(+$('#pf').value || 0)); P.fee = fee; const r = userBid(P.pid, fee); P.msg = r.msg; P.counter = r.counter; if (r.ok) { P.fee = r.fee; P.step = 'ct'; } drawPlayer(); },
  bidc: () => { const P = UI.pm; $('#pf').value = P.counter; ACT.bid(); },
  offerct: () => { const P = UI.pm, w = +$('#pw').value, y = +$('#py').value; P.wage = w; P.yrs = y; if (!G.inf && myClub().cash < P.fee) { P.msg = '資金唔夠'; return drawPlayer(); } const r = contractTalk(P.pid, w, y); P.msg = r.msg; if (r.ok) { completeSigning(P.pid, P.fee, w, y); save(); closeModal(); render(); toast(`簽入 ${ps(P.pid).sn}！`); return; } drawPlayer(); },
  // match
  mstart: startLive,
  mquick: () => { MT.M = newMatch(MT.f, false); runToEnd(MT.M); MT.phase = 'ft'; save(); render(); },
  mspd: el => { MT.spd = +el.dataset.a; if (MT.timer) { pauseLive(); runLive(); } else render(); $$('[data-act="mspd"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.a == MT.spd)); },
  mrun: () => { if (MT.timer) pauseLive(); else runLive(); updLive(); },
  msub: () => { if (MT.timer) { pauseLive(); MT.resume = true; } MT.sel = null; subPanel(); },
  msel: el => { MT.sel = el.dataset.a; subPanel(); },
  msubin: el => { if (!MT.sel) return toast('先揀要換走嘅球員'); if (!userSub(MT.M, MT.sel, el.dataset.a)) return toast(MT.M[MT.M.u].subs >= 3 ? '已經換晒 3 個' : '換唔到'); MT.sel = null; subPanel(); updLive(); },
  msty: el => { const [k, v] = el.dataset.a.split(':'); MT.M[MT.M.u].sty[k] = +v; subPanel(); },
  mcont: () => { MT.M.pause = null; closeModal(); runLive(); },
  mskip: () => { pauseLive(); runToEnd(MT.M); MT.phase = 'ft'; closeModal(); save(); render(); },
  mdone: () => { cancelAnimationFrame(MT.raf); playToday(); MT = null; save(); go('home'); },
};
const CH = {
  ord: el => { const c = myClub(); if (el.value === 'n') delete c.ord[el.dataset.a]; else c.ord[el.dataset.a] = el.value; save(); },
  form: el => { myClub().form = el.value; save(); render(); },
  ment: el => { myClub().sty.ment = +el.value; save(); },
  sr: el => { UI.sr[el.dataset.a] = el.value; render(); },
  fxc: el => { UI.fxc = el.value; render(); },
  cup: el => { UI.cup = el.value; render(); },
  price: el => { myClub().price = clamp(Math.round(+el.value || 1), 1, 200); save(); render(); },
  mform: el => { userForm(MT.M, el.value); MT.pos = {}; subPanel(); },
};
document.addEventListener('click', e => {
  if (NOCLICK) return;
  const tipB = e.target.closest('.ib'); if (tipB) { e.preventDefault(); if (TIP && !TIP.hidden && TIP.dataset.for === tipB.dataset.tip) hideTip(); else showTip(tipB); return; }
  if (!e.target.closest('#tip')) hideTip();
  if (e.target.id === 'modal') { if (!MT || !MT.M || !MT.M.pause) closeModal(); return; }
  if (e.target.id === 'nav' && $('#nav').dataset.open === 'true') { $('#nav').dataset.open = 'false'; return; }
  const el = e.target.closest('[data-go],[data-pl],[data-act]'); if (!el) return;
  if (e.target.closest('select,input,textarea') && !el.matches('button')) return;
  if (!G && !el.closest('#start')) return;
  if (el.dataset.pl) return openPlayer(el.dataset.pl);
  if (el.dataset.go) { if (!$('#modal').hidden) closeModal(); return go(el.dataset.go, el.dataset.a); }
  const f = ACT[el.dataset.act] || SACT[el.dataset.act]; if (f) f(el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && CH[el.dataset.ch]) CH[el.dataset.ch](el); });
document.addEventListener('input', e => {
  const el = e.target.closest('[data-in="sr"]'); if (!el) return;
  UI.sr[el.dataset.a] = el.value; clearTimeout(UI.srt);
  UI.srt = setTimeout(() => { const [n, rows] = searchRows(); $('#srt').innerHTML = rows; $('#srn').textContent = `${n} 人${n > 200 ? '（顯示頭 200）' : ''}`; }, 180);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden && !(MT && MT.M && MT.M.pause)) closeModal(); });

function cheatBox() {
  modal('秘技', `<form class="row" id="cfm"><input class="inp" id="ccode" autocomplete="off" autocapitalize="characters" placeholder="秘技代碼" style="flex:1"><button class="btn y">確定</button></form><p class="note" id="cmsg"></p>`, 'sm');
  $('#ccode').focus();
  $('#cfm').onsubmit = e => { e.preventDefault(); const c = $('#ccode').value.trim().toUpperCase(); let m = '代碼無效';
    if (c === 'GOAT') { G.inf = !G.inf; m = G.inf ? '無限資金已開啟' : '無限資金已關閉'; }
    else if (c === 'SIUUU' && myCid()) { myClub().cash += 1e8; m = '+£100m'; }
    $('#cmsg').textContent = m; if (m !== '代碼無效') { save(); render(); toast(m); } };
}

/* =====================================================================
   START SCREEN & NEW-GAME WIZARD
   ===================================================================== */
const W = { step: 0, name: '', slot: 1, cty: 'ENG', lg: 'eng1', cid: null };
function boardGoal(lid, cid) { const rank = byRepStatic(lid).indexOf(cid) + 1, n = LG[lid].clubs.length; return rank <= 1 ? '爭奪聯賽冠軍' : rank <= 4 ? '打入前四' : rank <= n / 2 ? '前半部完成' : rank <= n - 4 ? '安全護級' : '避免降班'; }
const byRepStatic = lid => LG[lid].clubs.map(c => c.cid).sort((a, b) => CL[b].rep - CL[a].rep);
function showStart() {
  cancelAnimationFrame(MT?.raf); if (MT) pauseLive();
  $('#app').hidden = true; $('#modal').hidden = true; const s = $('#start'); s.hidden = false;
  const meta = loadMeta(), last = +localStorage.getItem('xifm-fm-last') || 0, cont = meta[last] ? last : [1, 2, 3].find(k => meta[k]);
  if (W.step === 0) {
    s.innerHTML = `<div class="emb"><div class="xi">XI</div><div class="mg">經理</div><div class="yr">2002</div><div class="sub">傳奇十一人 · 經理生涯</div></div>
    <div class="smenu"><button class="btn y" data-act="snew">開新遊戲</button><button class="btn" data-act="scont" data-a="${cont || ''}" ${cont ? '' : 'disabled'}>繼續</button><button class="btn" data-act="sloadl">讀取存檔</button><a class="btn full" href="index.html" style="text-align:center;text-decoration:none">返回傳奇十一人</a></div>`;
  } else if (W.step === 9) {
    s.innerHTML = `<div class="swiz">${pan('讀取存檔', `<table><tbody>${[1, 2, 3].map(k => `<tr><td class="n">${k}</td><td class="nm">${meta[k] ? `${esc(meta[k].mgr)} · ${esc(meta[k].cid ? clubName(meta[k].cid) : '待業')} · ${seasonTxt(meta[k].season)} ${fdate(meta[k].day, 's')}` : '<span class="mute">空</span>'}</td><td>${meta[k] ? `<button class="btn sm y" data-act="scont" data-a="${k}">讀取</button>` : ''}</td></tr>`).join('')}</tbody></table>`)}<div class="row"><button class="btn" data-act="sback">返回</button></div></div>`;
  } else {
    const cty = CTRY.find(x => x[0] === W.cty), lid = cty[2].includes(W.lg) ? W.lg : cty[2][0];
    const clubs = byRepStatic(lid);
    s.innerHTML = `<div class="swiz">
      ${pan('開新遊戲', `<div class="row"><label>領隊名 <input class="inp" id="wname" maxlength="20" value="${esc(W.name)}" placeholder="你嘅名"></label><span class="mute">存檔位</span>${[1, 2, 3].map(k => `<button class="chip" data-act="wslot" data-a="${k}" aria-pressed="${W.slot === k}">${k}${meta[k] ? '（會覆蓋）' : ''}</button>`).join('')}</div>
        <div class="tabs" style="margin-top:8px">${CTRY.map(x => `<button class="chip" data-act="wcty" data-a="${x[0]}" aria-pressed="${W.cty === x[0]}">${x[1]}</button>`).join('')}</div>
        ${cty[2].length > 1 ? `<div class="tabs">${cty[2].map(l => `<button class="chip" data-act="wlg" data-a="${l}" aria-pressed="${lid === l}">${LG[l].name}</button>`).join('')}</div>` : ''}`, { st: 'flex:none' })}
      ${pan(`${esc(LG[lid].name)} · 揀球會`, `<table><thead><tr><th></th><th>球會</th><th>聲望</th><th class="n">資金</th><th class="hm">球場</th><th class="n hm">容量</th><th class="hm">董事局目標</th></tr></thead><tbody>${clubs.map(c => `<tr class="click ${W.cid === c ? 'sel' : ''}" data-act="wclub" data-a="${c}"><td>${badgeSVG(c, 26)}</td><td class="nm">${esc(CL[c].name)}</td><td class="num" style="color:${W.cid === c ? 'inherit' : 'var(--sel)'}">${stars(CL[c].rep)}</td><td class="n">${money(CL[c].bank * 1e6)}</td><td class="hm nm">${esc(CL[c].stadium)}</td><td class="n hm">${CL[c].cap.toLocaleString()}</td><td class="hm">${boardGoal(lid, c)}</td></tr>`).join('')}</tbody></table>`, { st: 'flex:1' })}
      <div class="row"><button class="btn" data-act="sback">返回</button><span style="margin-left:auto" class="mute">${W.cid ? esc(CL[W.cid].name) : '未揀球會'}</span><button class="btn y" data-act="wgo" ${W.cid ? '' : 'disabled'}>開始 ▶</button></div></div>`;
  }
}
function enterGame() { $('#start').hidden = true; $('#app').hidden = false; W.step = 0; SCR = myCid() ? 'home' : 'board'; render(); }
const SACT = {
  snew: () => { W.step = 1; showStart(); },
  sloadl: () => { W.step = 9; showStart(); },
  sback: () => { W.step = 0; showStart(); },
  scont: el => { const k = +el.dataset.a; if (k && loadGame(k)) { save(); enterGame(); } else toast('讀取失敗'); },
  wslot: el => { W.name = $('#wname').value; W.slot = +el.dataset.a; showStart(); },
  wcty: el => { W.name = $('#wname').value; W.cty = el.dataset.a; W.lg = CTRY.find(x => x[0] === W.cty)[2][0]; W.cid = null; showStart(); },
  wlg: el => { W.name = $('#wname').value; W.lg = el.dataset.a; W.cid = null; showStart(); },
  wclub: el => { W.name = $('#wname').value; W.cid = el.dataset.a; showStart(); },
  wgo: () => {
    W.name = $('#wname').value.trim() || '領隊';
    toast('建立緊新遊戲…');
    setTimeout(() => { newGame(W.name, W.cid, W.slot); MT = null; save(); enterGame(); }, 30);
  },
};

/* ---------- boot ---------- */
addEventListener('resize', () => { if (MT && MT.phase === 'live') { cancelAnimationFrame(MT.raf); MT.raf = requestAnimationFrame(drawPitch); } });
showStart();
