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
  <div class="tbtns">${cid ? `<button class="tb cash" data-go="finance" title="球會資金（撳入去睇財政）"><b class="num">${G.inf ? '∞' : money(G.clubs[cid].cash)}</b><small>資金</small></button>` : ''}<button class="tb" data-go="mail" aria-label="收件箱"><span class="dot ${unread ? 'on' : ''}"></span><small>收件箱</small></button>
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
  if (MT) MT.dr = null;   // an unconfirmed substitution / tactics-board draft is dropped
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
  const a = d.arw ?? 2; t.push(`<span class="arw a${a}" title="狀態：${ARWN[a]}">${ARWI[a]}</span>`);
  if (d.inj) t.push(`<span class="tag t-inj" title="${esc(d.injn)}">重傷 · 休息 ${d.inj} 日</span>`);
  else if (d.lin) t.push(`<span class="tag t-lin" title="${esc(d.injn)}：可以上陣，但能力 −8%，受傷機會高啲，有機會變重傷">輕傷 ${d.lin} 日</span>`);
  if (d.sus) t.push(`<span class="tag t-sus">停賽 ${d.sus}</span>`);
  if (d.s && d.s.yc) t.push(`<span class="crd cy" title="今季黃牌 ${d.s.yc} 張">${d.s.yc}</span>`);
  if (d.s && d.s.rc) t.push(`<span class="crd cr" title="今季紅牌 ${d.s.rc} 張">${d.s.rc}</span>`);
  if (d.list) t.push('<span class="tag t-ls">放售</span>');
  if (d.c !== 'free' && d.ct <= G.season) t.push('<span class="tag t-ex">約滿</span>');
  return t.join('');
}
function shirtsHTML(cid, xi, formName, drag) {
  const col = CL[cid].col, slots = FORMS[formName], sp = G.clubs[cid].sp || {}, cap = xi.includes(sp.cap) ? sp.cap : bestFor('cap', xi.filter(Boolean));
  return xi.map((pid, i) => { const [pos, x, y] = slots[i]; return `<div class="shirt ${drag ? 'dg' : ''} ${drag && UI.sel === 'x' + i ? 'selp' : ''}" ${drag ? `data-i="${i}"` : ''} style="left:${x}%;top:${y}%">${drag ? `<b class="sp">${pos}</b>` : ''}<i style="background:${col[0]};color:${col[1]}">${pid ? pd(pid).no || '' : ''}</i>${pid && pid === cap ? '<b class="capb" title="隊長">C</b>' : ''}<span class="${pid && fitP(pid, pos) < .85 ? 'bad' : ''}">${pid ? esc(ps(pid).sn) : pos}</span>${drag && pid ? `<em class="rt ${fitP(pid, pos) < 1 ? 'down' : ''}" title="${fitP(pid, pos) < 1 ? `本位能力 ${pd(pid).sk}` : '能力'}">${Math.round(pd(pid).sk * fitP(pid, pos))}</em>` : ''}</div>`; }).join('');
}
/* custom formation: dragging a shirt to an empty spot copies the formation into club.cust, registered as FORMS['C:'+cid] */
const CUSTK = cid => 'C:' + cid;
const isCust = f => f.startsWith('C:');
const fname = f => isCust(f) ? '自訂' : f;
const FLIST = () => Object.keys(FORMS).filter(k => !isCust(k));
const formOpts = cur => FLIST().map(f => opt(f, f, cur)).join('') + (myClub().cust ? opt(CUSTK(myCid()), '自訂', cur) : '');
function regCustom() { for (const cid in G.clubs) { const c = G.clubs[cid]; if (c.cust) FORMS[CUSTK(cid)] = c.cust; if (isCust(c.form) && !FORMS[c.form]) c.form = '4-4-2'; } }
function slotAt(x, y) {
  const side = (l, r, c) => x < 22 ? l : x > 78 ? r : c;
  if (y >= 86) return 'GK'; if (y >= 70) return x < 25 ? 'LB' : x > 75 ? 'RB' : 'CD'; if (y >= 55) return side('LWB', 'RWB', 'DM');
  if (y >= 40) return side('LM', 'RM', 'CM'); if (y >= 31) return side('LW', 'RW', 'AM'); if (y >= 22) return side('LW', 'RW', 'CF'); return side('LW', 'RW', 'ST');
}
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
    const d = pd(pid), p = ps(pid), bad = slot && fitP(pid, slot) < .85;
    return `<tr class="click ${sel}" data-act="sq" data-k="${k}"><td class="n hm">${d.no || ''}</td><td class="n ${bad ? 'pbad' : ''}" title="${esc(POSN[p.pos])}">${slot || p.pos}</td><td class="nm">${pl(pid)}${slot && slot !== p.pos ? ` <span class="mute">(${[p.pos, ...pos2Of(p)].join('/')})</span>` : ''}</td><td>${pTags(pid)}</td><td>${Math.round(d.cond)}${cbar(d.cond)}</td><td class="n hm">${form(pid) ? form(pid).toFixed(1) : '–'}</td><td class="n">${slot && fitP(pid, slot) < 1 ? `<span class="${bad ? 'pbad' : ''}" title="本位 ${d.sk}，踢${esc(POSN[slot])}打 ${Math.round(fitP(pid, slot) * 100)}%">${Math.round(d.sk * fitP(pid, slot))}</span> <s class="mute">${d.sk}</s>` : d.sk}</td>
      <td class="hm"><select data-ch="ord" data-a="${pid}" aria-label="個人指令">${Object.entries(ORDERS).map(([v, t]) => opt(v, t, c.ord[pid] || 'n')).join('')}</select></td></tr>`;
  };
  const probs = lineupProblems(cid), plans = c.plans || [], cur = c.plan ?? 0;
  main(`${hdr('陣容', `${[0, 1, 2].map(i => `<button class="chip" data-act="plan" data-a="${i}" aria-pressed="${cur === i}">方案 ${'ABC'[i]}${plans[i] ? '' : '（空）'}</button>`).join('')}<button class="btn sm" data-act="plansave">存入方案 ${'ABC'[cur]}</button><button class="btn" data-act="autopick">自動排陣</button>${info('拖住球場上嘅球衣：放喺另一件球衣上面就對調兩個球員，放喺空位就移動嗰個位置（變自訂陣式）。用滑鼠亦可以由左邊名單拖人入球場。撳一個再撳另一個都可以對調。踢非本位會扣能力（同一般足球遊戲一樣）：能力一欄會顯示扣咗之後嘅數，劃咗線嗰個係本位能力。同一類位置唔扣（前鋒↔中鋒、右中場↔右翼、左中場↔左翼、右閘↔右翼衛、左閘↔左翼衛）；相近位置扣少啲（例如左閘踢右閘、防守中場踢中場約扣 5–10%），同一條線其他位置扣 20%，跨線扣 32%，門將同出面球員互換扣 70%。紅色＝扣得多。方案 A／B／C：撳「存入」記低陣式同陣容，之後一撳就換返。')}${probs.length ? `<span class="bad">${esc(probs.slice(0, 2).join('；'))}</span>` : ''}`)}
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
  if (sh) { e.preventDefault(); try { sh.setPointerCapture(e.pointerId); } catch (x) { } }
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
      ${pan(`隊長 · 定位球 ${info('揀隊長同各種定位球主罰。揀「自動」或者揀咗嘅人唔喺場上，就由場上最適合嘅人負責。隊長喺場會令全隊表現略為提升。角球同長罰球睇傳球同控球，短罰球（直接射門）睇射門同傳球，十二碼睇射門同控球。')}`, `<table class="spt"><tbody>${Object.entries(SPR).map(([k, t]) => { const ros = roster(cid).filter(p => ps(p).pos !== 'GK').sort((a, b) => SPW[k](b) - SPW[k](a)), cur = (c.sp || {})[k], auto = bestFor(k, c.xi.filter(Boolean)); return `<tr><td style="width:90px">${t}</td><td><select class="inp" data-ch="sp" data-a="${k}" aria-label="${t}"><option value="">自動${auto ? `（${esc(ps(auto).sn)}）` : ''}</option>${ros.map(p => `<option value="${p}" ${p === cur ? 'selected' : ''}>${esc(ps(p).sn)} · ${ps(p).pos} · ${Math.round(k === 'cap' ? pd(p).sk : k === 'pk' ? attrs(p)[5] : k === 'fks' ? (attrs(p)[5] + attrs(p)[4]) / 2 : attrs(p)[4])}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table>`)}
      ${pan('打法', `<table><tbody>${Object.entries(STYLE).map(([k, v]) => `<tr><td style="width:120px">${STYLEN[k]} ${info(STYLEI[k])}</td><td><div class="row">${v.map((t, i) => `<button class="chip" data-act="sty" data-a="${k}:${i}" aria-pressed="${c.sty[k] === i}">${t}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>`)}
    </div>
    ${pan(fname(f), `<div class="pitchv">${PITCHV}${shirtsHTML(cid, f === c.form ? c.xi : Array(11).fill(null), f)}</div>`, { t: 1 })}
  </div>`);
};

/* ---------- 訓練 ---------- */
SCREENS.training = () => {
  const c = myClub(), ros = roster(myCid());
  const avgC = ros.length ? Math.round(sum(ros.map(p => pd(p).cond)) / ros.length) : 0, low = ros.filter(p => pd(p).cond < 70).length, inj = ros.filter(p => pd(p).inj || pd(p).lin).length;
  main(`${hdr('訓練')}
  <div class="cols c2 m-stack">
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr)">
      ${pan(`強度 ${info('重訓練：後生球員進步快啲，但體能回復慢，仲有少量受傷風險。輕訓練：回復快，進步慢。每個星期一計一次。')}`, `<div class="row">${chips([[0, '輕'], [1, '中'], [2, '重']], c.tr.int, 'trint')}</div>`)}
      ${pan(`重點 ${info('進攻／防守／戰術：比賽中對應能力有少量加成。均衡：冇加成。')}`, `<div class="row">${chips([['bal', '均衡'], ['att', '進攻'], ['def', '防守'], ['tac', '戰術']], c.tr.foc, 'trfoc')}</div>`)}
      ${pan('球隊狀況', `<dl class="kv"><dt>平均體能</dt><dd>${avgC}${cbar(avgC)}</dd><dt>體能低過 70</dt><dd>${low} 人</dd><dt>傷兵</dt><dd>${inj} 人</dd><dt>教練等級</dt><dd>${c.st.coach} / 5</dd><dt>每日回復</dt><dd>約 ${([7, 6, 4.5][c.tr.int] + c.st.physio * .4).toFixed(1)} 體能</dd></dl>`, { t: 1 })}
    </div>
    ${pan('傷兵名單', inj ? `<table><thead><tr><th>球員</th><th>傷勢</th><th class="n">日</th></tr></thead><tbody>${ros.filter(p => pd(p).inj || pd(p).lin).map(p => `<tr><td class="nm">${pl(p)}</td><td>${esc(pd(p).injn)} ${pd(p).inj ? '<span class="tag t-inj">重傷</span>' : '<span class="tag t-lin">輕傷・可上陣</span>'}</td><td class="n">${pd(p).inj || pd(p).lin}</td></tr>`).join('')}</tbody></table>` : '<p class="note">冇傷兵。</p>', { t: 1 })}
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
// search table columns: [header, sort key, default direction (1 up, -1 down)]
const POSORD = Object.keys(POSN);
const SRCOL = {
  name: ['球員', r => ps(r[0]).name, 1], club: ['球會', r => clubName(pd(r[0]).c), 1], age: ['歲', r => ageOf(r[0]), 1], pos: ['位', r => POSORD.indexOf(ps(r[0]).pos), 1],
  sk: ['能力', r => pd(r[0]).sk, -1], val: ['身價', r => r[1], -1], w: ['週薪', r => pd(r[0]).w, -1], st: ['狀態', r => (pd(r[0]).inj ? -20 : pd(r[0]).lin ? -10 : 0) + (pd(r[0]).arw ?? 2), -1],
};
const SRCLS = { name: '', club: 'hm', age: 'n', pos: 'n', sk: 'n', val: 'n', w: 'n hm', st: 'hm' };
function srHead() { const f = UI.sr, k = SRCOL[f.sort] ? f.sort : 'sk', dir = f.dir || SRCOL[k][2]; return Object.entries(SRCOL).map(([c, [t]]) => `<th class="${SRCLS[c]} srt ${c === k ? 'on' : ''}" data-act="srs" data-a="${c}" title="撳一下排序，再撳反轉">${t}${c === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join(''); }
// a club's current squad (live: transfers, injuries, suspensions), from any club name in the search table
function clubPanel(cid) {
  const c = G.clubs[cid], ros = [...roster(cid)].sort((a, b) => POSORD.indexOf(ps(a).pos) - POSORD.indexOf(ps(b).pos) || pd(b).sk - pd(a).sk);
  const moves = G.tlog.filter(x => x.to === cid || x.from === cid).slice(0, 6);
  modal(esc(clubName(cid)), `<div class="row"><span class="mute">${esc(LG[c.lg] ? LG[c.lg].name : '')}</span><span class="mute">球場 ${esc(CL[cid].stadium)}</span><span class="mute">${ros.length} 人</span><span class="mute">傷 ${ros.filter(p => pd(p).inj || pd(p).lin).length} · 停賽 ${ros.filter(p => pd(p).sus).length}</span></div>
    <table><thead><tr><th class="n">#</th><th class="n">位</th><th>球員</th><th class="n">歲</th><th class="n">能力</th><th class="n hm">身價</th><th>狀態</th></tr></thead><tbody>${ros.map(p => `<tr class="click" data-pl="${p}"><td class="n">${pd(p).no || ''}</td><td class="n">${ps(p).pos}</td><td class="nm">${esc(ps(p).name)}</td><td class="n">${ageOf(p)}</td><td class="n">${pd(p).sk}</td><td class="n hm">${money(valueOf(p))}</td><td>${pTags(p)}</td></tr>`).join('')}</tbody></table>
    ${moves.length ? `<div class="lbl">最近轉會</div><table><tbody>${moves.map(x => `<tr><td class="n">${fdate(x.d, 's')}</td><td class="nm">${esc(ps(x.pid).sn)}</td><td>${x.to === cid ? `由 ${esc(clubName(x.from))} 加盟` : `去 ${esc(clubName(x.to))}`}</td><td class="n">${x.fee ? money(x.fee) : '自由'}</td></tr>`).join('')}</tbody></table>` : ''}`, 'tall');
}
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
  const k = SRCOL[f.sort] ? f.sort : 'sk', dir = f.dir || SRCOL[k][2], key = SRCOL[k][1];
  out.sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir || pd(b[0]).sk - pd(a[0]).sk; });
  return [out.length, out.slice(0, 200).map(([pid, v]) => { const d = pd(pid); return `<tr class="click" data-pl="${pid}"><td class="nm">${esc(ps(pid).name)}</td><td class="nm hm">${d.c !== 'free' ? `<button class="lnk" data-act="clubv" data-a="${d.c}" title="睇 ${esc(clubName(d.c))} 而家嘅陣容">${esc(clubName(d.c))}</button>` : esc(clubName(d.c))}</td><td class="n">${ageOf(pid)}</td><td class="n">${ps(pid).pos}</td><td class="n">${d.sk}</td><td class="n">${money(v)}</td><td class="n hm">${money(d.w)}</td><td class="hm">${pTags(pid)}</td></tr>`; }).join('')];
}
SCREENS.search = () => {
  const f = UI.sr, [n, rows] = searchRows();
  const mc = G.clubs[G.mgr.cid];
  main(`${hdr('球員搜尋', `${mc ? `<span class="tag t-ls" style="margin-right:8px">資金 ${G.inf ? '∞' : money(mc.cash)}</span>` : ''}<span class="mute" id="srn">${n.toLocaleString()} 人${n > 200 ? '（顯示頭 200）' : ''}</span>`)}
  <div class="row"><input class="inp" data-in="sr" data-a="q" placeholder="姓名或球會" value="${esc(f.q)}" style="flex:1 1 160px">
    <select class="inp" data-ch="sr" data-a="pos" aria-label="位置">${opt('', '全部位置', f.pos)}${[['G', '門將'], ['D', '後衛'], ['M', '中場'], ['A', '前鋒']].map(([v, t]) => opt(v, t, f.pos)).join('')}${Object.entries(POSN).map(([v, t]) => opt(v, v + ' ' + t, f.pos)).join('')}</select>
    <select class="inp" data-ch="sr" data-a="lg" aria-label="聯賽">${opt('', '全部聯賽', f.lg)}${PLG().map(l => opt(l, LG[l].name, f.lg)).join('')}${opt('eur', '歐洲球會', f.lg)}${opt('free', '自由球員', f.lg)}</select>
    <input class="inp num" data-in="sr" data-a="age" placeholder="最大年齡" value="${esc(f.age)}" inputmode="numeric" style="width:90px">
    <input class="inp num" data-in="sr" data-a="val" placeholder="身價上限 £m" value="${esc(f.val)}" inputmode="decimal" style="width:110px">
</div>
  ${pan('結果', `<table><thead><tr>${srHead()}</tr></thead><tbody id="srt">${rows}</tbody></table>`, { st: 'flex:1' })}`);
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
    else { const wl = myCid() ? willing(pid, myCid()) : 2, mine2 = roster(myCid()).filter(x => x !== pid).sort((a, b) => pd(b).sk - pd(a).sk);
      act = `<div class="row"><span class="mute">球員意願</span><span class="tag wl${wl}">${WILLN[wl]}</span>${info('睇球會大細、會唔會有正選、合約剩幾耐、有冇放售、年紀等等。「唔會去」出幾多都冇用；「唔太想」會要求高啲人工；「好想去」人工可以少少。')}${d.c !== 'free' ? `<span class="mute">賣方心目中約 ${money(askingPrice(pid))}</span>${info('後生、正選主力、合約仲長嘅球員，球會會要溢價先肯放。')}` : ''}</div>
      <div class="row">轉會費 £<input class="inp num" id="pf" value="${P.fee ?? (d.c === 'free' ? 0 : valueOf(pid))}" style="width:120px" inputmode="numeric" ${d.c === 'free' ? 'disabled' : ''}>${d.c !== 'free' ? `<select class="inp" id="pn" aria-label="付款">${[[1, '一次過'], [2, '分 2 年'], [3, '分 3 年']].map(([v, t]) => opt(v, t, P.n || 1)).join('')}</select><select class="inp" id="psw" aria-label="加球員交換" style="max-width:200px"><option value="">唔加球員</option>${mine2.map(x => `<option value="${x}" ${x === P.swap ? 'selected' : ''}>+ ${esc(ps(x).sn)} · ${ps(x).pos} · ${pd(x).sk} · ${money(valueOf(x))}</option>`).join('')}</select>${info('分期：今日只付第一期，其餘喺之後每季開季時自動付；賣方會當遲收嘅錢少少折扣，所以總數要多啲。加球員：將你一個球員一齊交換，賣方需要嗰個位置會計足身價，唔需要就打折；嗰個球員自己都要肯去。')}` : ''}<button class="btn y" data-act="bid">${d.c === 'free' ? '傾合約' : '出價'}</button>${P.counter ? `<button class="btn" data-act="bidc">出 ${money(P.counter)}</button>` : ''}</div>`; }
  }
  modal(`${esc(p.name)}`, `<div class="pf">${d.c !== 'free' && d.c !== 'ret' ? badgeSVG(d.c, 64) : ''}<div><div class="D" style="font-size:20px">${esc(clubName(d.c))}</div><div class="mute">${POSN[p.pos]}（${p.pos}）${pos2Of(p).length ? `，次位置 ${pos2Of(p).map(q => `${POSN[q]}（${q}）`).join('、')}` : ''} · ${ageOf(pid)} 歲 · ${esc(natName(p.nat))} · #${d.no || '—'}</div><div>${pTags(pid)}</div></div><div class="gcard g-${GRADE(d.sk)} pfc"><span class="r">${d.sk}</span><span class="g">${GRADE(d.sk)}</span></div></div>
    <dl class="kv kv2"><dt>身價</dt><dd>${money(valueOf(pid))}</dd><dt>週薪</dt><dd>${money(d.w)}</dd><dt>合約至</dt><dd>${d.c === 'free' ? '—' : d.ct + ' 年 6 月'}</dd><dt>體能</dt><dd>${Math.round(d.cond)}${cbar(d.cond)}</dd><dt>表現</dt><dd>${form(pid) ? form(pid).toFixed(1) : '–'}</dd><dt>傷病</dt><dd>${d.inj ? `${esc(d.injn)}（${d.inj} 日）` : '冇'}</dd></dl>
    <div class="attrs">${an.map((n, k) => `<div><span>${n}</span><b class="num">${a[k]}</b><div class="bar"><i style="width:${a[k]}%;background:${a[k] >= 85 ? 'var(--win)' : a[k] >= 70 ? 'var(--sel)' : a[k] >= 55 ? '#9cc0ff' : 'var(--loss)'}"></i></div></div>`).join('')}</div>
    <table><thead><tr><th class="n">上陣</th><th class="n">入球</th><th class="n">助攻</th><th class="n">黃牌</th><th class="n">紅牌</th><th class="n">最佳</th><th class="n">平均評分</th></tr></thead><tbody><tr><td class="n">${s.ap}</td><td class="n">${s.gl}</td><td class="n">${s.as}</td><td class="n">${s.yc}</td><td class="n">${s.rc}</td><td class="n">${s.mom}</td><td class="n">${s.ap ? (s.rt / s.ap).toFixed(2) : '–'}</td></tr></tbody></table>
    <div class="pact">${P.msg ? `<p class="msg">${esc(P.msg)}</p>` : ''}${act}</div>`);
}

/* ---------- 轉會市場 ---------- */
SCREENS.market = () => {
  const t = UI.mk, me = myCid();
  let body;
  if (t === 'off') body = G.off.length ? `<table><thead><tr><th>球員</th><th>出價球會</th><th class="n">報價</th><th class="n hm">身價</th><th class="n">期限</th><th></th></tr></thead><tbody>${G.off.map(o => `<tr><td class="nm">${pl(o.pid)}</td><td class="nm">${esc(clubName(o.from))}</td><td class="n">${money(o.fee)}</td><td class="n hm">${money(valueOf(o.pid))}</td><td class="n">${fdate(o.exp, 's')}</td><td class="nowrap"><button class="btn sm y" data-act="accept" data-a="${o.id}">接受</button> <button class="btn sm" data-act="cofopen" data-a="${o.id}" ${o.ok ? 'disabled' : ''}>還價</button> <button class="btn sm" data-act="reject" data-a="${o.id}">拒絕</button>${o.ok ? ' <span class="tag t-ls">已傾掂</span>' : o.last ? ' <span class="tag t-ex">最後報價</span>' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="note">暫時冇報價。放售球員會多啲人問。</p>';
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
  main(`${hdr('賽程', `<select class="inp" data-ch="fxc" aria-label="球會">${PLG().concat('eur').filter(l => G.lgm[l]).map(l => `<optgroup label="${esc(LG[l].name)}">${byRep(G.lgm[l]).map(c => opt(c, clubName(c), cid)).join('')}</optgroup>`).join('')}</select>`)}
  ${pan(`${esc(clubName(cid))} · ${list.length} 場`, `<table><thead><tr><th class="n">日期</th><th>賽事</th><th class="hm">圈數</th><th class="n">主客</th><th>對手</th><th class="n">比數</th><th class="hm">入球</th></tr></thead><tbody>${list.map(f => { const h = f.h === cid, r = resOf(f, cid); return `<tr class="${f.d === G.day && f.hg == null ? 'sel' : ''}"><td class="n">${fdate(f.d, 's')}</td><td>${esc(compName(f.c))}</td><td class="hm">${roundName(f)}</td><td class="n">${f.n ? '中' : h ? '主' : '客'}</td><td class="nm">${esc(clubName(h ? f.a : f.h))}</td><td class="n">${scoreTxt(f)} ${wdl(r)}</td><td class="hm sc">${f.sc ? f.sc.filter(x => x[1] === (h ? 'h' : 'a')).map(x => `${esc(x[2])} ${x[0]}'`).join('、') : ''}</td></tr>`; }).join('')}</tbody></table>`, { st: 'flex:1' })}`);
  const s = $('#main tr.sel') || [...$$('#main tbody tr')].find(tr => tr.querySelector('td:nth-child(6)').textContent === '–');
  if (s) s.scrollIntoView({ block: 'center' });
};

/* ---------- 積分榜 ---------- */
const CTRY = [['ENG', '英格蘭', ENG], ['SCO', '蘇格蘭', ['sco1']], ['ESP', '西班牙', ['esp1']], ['ITA', '意大利', ['ita1']], ['GER', '德國', ['ger1']], ['FRA', '法國', ['fra1']], ['NED', '荷蘭', ['ned1']], ['POR', '葡萄牙', ['por1']], ['TUR', '土耳其', ['tur1']], ['BEL', '比利時', ['bel1']]];
// countries with leagues in this game (or, before a game exists, in the loaded era)
const ctrs = (have = G ? PLG() : PLAY_LG) => { return CTRY.map(([c, n, l]) => [c, n, l.filter(x => have.includes(x))]).filter(x => x[2].length); };
function zoneOf(l, i, n) {
  const Z = { eng1: [[4, 'cl'], [6, 'ue'], [n - 3, ''], [n, 'dn']], eng2: [[2, 'up'], [6, 'po'], [n - 3, ''], [n, 'dn']], eng3: [[2, 'up'], [6, 'po'], [n - 4, ''], [n, 'dn']], eng4: [[3, 'up'], [7, 'po']], sco1: [[2, 'cl'], [4, 'ue']], esp1: [[4, 'cl'], [7, 'ue']], ita1: [[4, 'cl'], [7, 'ue']], ger1: [[4, 'cl'], [7, 'ue']], fra1: [[3, 'cl'], [6, 'ue']], ned1: [[2, 'cl'], [4, 'ue']], por1: [[2, 'cl'], [4, 'ue']], tur1: [[2, 'cl'], [4, 'ue']], bel1: [[1, 'cl'], [3, 'ue']] }[l] || [];
  for (const [lim, z] of Z) if (i < lim) return z ? 'zone-' + z : '';
  return '';
}
SCREENS.tables = () => {
  const T = UI.tb, cty = ctrs().find(x => x[0] === T.c), lid = cty[2].includes(T.l) ? T.l : cty[2][0], comp = G.comp[lid], st = standings(comp.tab), me = myCid();
  const played = G.fx.filter(f => f.c === lid && f.hg != null).map(f => f.r), maxR = Math.max(...G.fx.filter(f => f.c === lid).map(f => f.r));
  const r = T.r != null && T.lid === lid ? T.r : played.length ? Math.max(...played) : 0;
  const rfx = G.fx.filter(f => f.c === lid && f.r === r);
  main(`${hdr('積分榜', info('左邊色條：綠＝歐聯／升班，藍＝歐洲足協盃，黃＝升級附加賽，紅＝降班。'))}
  <div class="tabs">${chips(ctrs().map(x => [x[0], x[1]]), T.c, 'tbc')}</div>
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
  const K = UI.rk, cty = ctrs().find(x => x[0] === K.c), lids = K.l ? [K.l] : cty ? cty[2] : PLG();
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
    ${pan('準則', `<div class="lbl">國家</div><div class="vlist">${[['', '全部'], ...ctrs().map(x => [x[0], x[1]])].map(([v, t]) => `<button class="nb" data-act="rkc" data-a="${v}" aria-current="${(K.c || '') === v && !K.l}">${t}</button>`).join('')}</div>
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
    ${pan('歷屆冠軍', G.hist.length ? `<table><thead><tr><th>球季</th>${PLG().map(l => `<th class="${['eng3', 'eng4'].includes(l) ? 'hm' : ''}">${LG[l].name}</th>`).join('')}</tr></thead><tbody>${G.hist.map(h => `<tr><td class="n">${seasonTxt(h.s)}</td>${PLG().map(l => `<td class="nm ${['eng3', 'eng4'].includes(l) ? 'hm' : ''}">${esc(clubShort(h.champs[l]))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="note">第一季仲未完。</p>')}
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
    ${pan(m ? esc(m.t) : '—', m ? `<p class="mute num" style="margin-top:0">${fdate(m.d)}</p><div class="mbody">${m.b}</div>${off ? `<div class="row" style="margin-top:12px"><button class="btn y" data-act="accept" data-a="${off.id}">接受報價</button><button class="btn" data-act="cofopen" data-a="${off.id}" ${off.ok ? 'disabled' : ''}>還價</button><button class="btn" data-act="reject" data-a="${off.id}">拒絕</button><button class="btn" data-pl="${off.pid}">睇球員</button></div>` : m.act && m.act.k === 'offer' ? '<p class="note">報價已經處理或者過期。</p>' : ''}` : '', { t: 1 })}
  </div>`);
};

/* ---------- 存檔 ---------- */
SCREENS.save = () => {
  const meta = loadMeta();
  main(`${hdr('存檔', info('每次推進日子同重要操作都會自動儲存到而家用緊嘅存檔位。匯出可以將存檔複製去第二部機。'))}
  <div class="cols c2 m-stack">
    ${pan('存檔位', `<table><tbody>${[1, 2, 3].map(s => { const m = meta[s], conf = UI.del === s; return `<tr class="${G.slot === s ? 'me' : ''}"><td class="n">${s}</td><td class="nm">${m ? metaLine(m) : '<span class="mute">空</span>'}</td><td>${conf ? `<button class="btn sm r" data-act="sdel" data-a="${s}">確定刪除</button> <button class="btn sm" data-act="sdelc" data-a="">取消</button>` : `<button class="btn sm" data-act="ssave" data-a="${s}">存到呢度</button> ${m && G.slot !== s ? `<button class="btn sm" data-act="sload" data-a="${s}">讀取</button>` : ''} ${m ? `<button class="btn sm" data-act="sdelc" data-a="${s}">刪除</button>` : ''}`}</td></tr>`; }).join('')}</tbody></table>`)}
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
    case 'goal': return `⚽ 入球！${nm(e.p)}（${t}）${x === 'pen' ? '射入十二碼' : x === 'co' ? '角球頂入' : x === 'fk' ? '罰球直接射入' : x === 'fkh' ? '罰球傳中頂入' : x === 'hd' ? '頭槌頂入' : x === 'ls' ? '遠射破網' : x === 'dr' ? '連過幾人後射入' : '起腳破網'}${e.p2 ? `，${nm(e.p2)} 助攻` : ''}`;
    case 'miss': return `${nm(e.p)}（${t}）${x === 'ls' ? '遠射高出' : x === 'fk' ? '罰球射偏' : x === 'hd' ? '頭槌頂高' : '射門偏出'}`;
    case 'save': return `${nm(e.p2) || '門將'} 撲出 ${nm(e.p)}（${t}）嘅${x === 'hd' ? '頭槌' : x === 'ls' ? '遠射' : x === 'fk' ? '罰球' : '射門'}`;
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
  const rad = Math.max(6, Math.min(W, H) * .03), lab = [];
  for (const S of [M.h, M.a]) {
    const home = S.key === 'h', col = CL[S.cid].col;
    S.on.forEach((o, i) => {
      if (!o.pid) return;
      let X = home ? (100 - o.y) * .5 : 100 - (100 - o.y) * .5, Y = home ? o.x : 100 - o.x;
      X = clamp(X + (o.slot === 'GK' ? sh * .15 : sh) + Math.sin(t + i * 1.7) * 1.2, 3, 97); Y = clamp(Y + (M.ball[1] - 50) * .12 + Math.cos(t * .8 + i) * 1.5, 5, 95);
      const p = ease(S.key + i, X, Y);
      const cx = px(p[0]), cy = py(p[1]), d = pd(o.pid);
      x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fillStyle = col[0]; x.fill(); x.lineWidth = 2 * dpr; x.strokeStyle = col[1]; x.stroke();
      // shirt number inside the dot
      x.fillStyle = col[1]; x.font = `800 ${Math.round(rad * 1.05)}px "Saira Condensed",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (d.no) x.fillText(d.no, cx, cy + rad * .05);
      lab.push([cx, cy, ps(o.pid).sn, Math.round(d.sk * fitP(o.pid, o.slot)), Math.round(d.cond), fitP(o.pid, o.slot) < 1]);
    });
  }
  // name, then ability · stamina under each player (drawn after all dots so no dot covers a label)
  const fs1 = Math.max(9, Math.round(rad * .78));
  x.textBaseline = 'top'; x.lineJoin = 'round';
  for (const [cx, cy, name, ab, cond, off] of lab) {
    x.font = `700 ${fs1}px "Noto Sans TC",sans-serif`;
    const hw = x.measureText(name).width / 2 + 3 * dpr, ty = cy + rad + 2 * dpr, nx = clamp(cx, hw, W - hw); x.lineWidth = 3 * dpr; x.strokeStyle = 'rgba(0,20,10,.85)';
    x.strokeText(name, nx, ty); x.fillStyle = '#fff'; x.fillText(name, nx, ty);
    const t2 = `${ab}`, t3 = ` · ${cond}%`, y2 = ty + fs1 * 1.1;
    x.font = `800 ${fs1}px "Saira Condensed",sans-serif`;
    const w2 = x.measureText(t2).width, w3 = x.measureText(t3).width, x0 = nx - (w2 + w3) / 2;
    x.textAlign = 'left';
    x.strokeText(t2, x0, y2); x.fillStyle = off ? '#ff8a8a' : '#ffe066'; x.fillText(t2, x0, y2);
    x.strokeText(t3, x0 + w2, y2); x.fillStyle = cond >= 75 ? '#7dffa8' : cond >= 55 ? '#ffb03a' : '#ff6f6f'; x.fillText(t3, x0 + w2, y2);
    x.textAlign = 'center';
  }
  const b = ease('ball', M.ball[0], M.ball[1]);
  const lb = MT.lb || b.slice(); MT.rot = (MT.rot || 0) + Math.hypot(b[0] - lb[0], b[1] - lb[1]) * .25; MT.lb = b.slice();
  drawBall(x, px(b[0]), py(b[1]), rad * .8, MT.rot, dpr);
  MT.raf = requestAnimationFrame(drawPitch);
}
// a classic black-and-white football: shadow, white ball, a centre pentagon and five patches round the edge; turns as it moves
function drawBall(x, cx, cy, r, rot, dpr) {
  x.save();
  x.beginPath(); x.ellipse(cx + r * .25, cy + r * .9, r * .9, r * .35, 0, 0, 7); x.fillStyle = 'rgba(0,0,0,.3)'; x.fill();
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = '#fff'; x.fill(); x.clip();
  const pent = (px0, py0, s, a) => { x.beginPath(); for (let k = 0; k < 5; k++) { const t = a + k * 2 * Math.PI / 5 - Math.PI / 2; x[k ? 'lineTo' : 'moveTo'](px0 + Math.cos(t) * s, py0 + Math.sin(t) * s); } x.closePath(); x.fill(); };
  x.fillStyle = '#111';
  pent(cx, cy, r * .38, rot);
  for (let k = 0; k < 5; k++) { const t = rot + k * 2 * Math.PI / 5 - Math.PI / 2 + Math.PI / 5; pent(cx + Math.cos(t) * r * 1.02, cy + Math.sin(t) * r * 1.02, r * .36, rot + Math.PI); }
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = Math.max(1, .6 * dpr);
  for (let k = 0; k < 5; k++) { const t = rot + k * 2 * Math.PI / 5 - Math.PI / 2; x.beginPath(); x.moveTo(cx + Math.cos(t) * r * .38, cy + Math.sin(t) * r * .38); x.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); x.stroke(); }
  x.restore();
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.lineWidth = Math.max(1, dpr); x.strokeStyle = '#222'; x.stroke();
  // soft highlight
  const g = x.createRadialGradient(cx - r * .35, cy - r * .4, 0, cx - r * .35, cy - r * .4, r);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = g; x.fill();
}
function breakPanel() {
  const M = MT.M, k = M.pause;
  modal(k === 'ht' ? '半場' : '加時', `<div class="big" style="text-align:center">${esc(clubShort(M.h.cid))} ${M.h.g} - ${M.a.g} ${esc(clubShort(M.a.cid))}</div>${statsHTML(M)}<div class="row" style="justify-content:center"><button class="btn" data-act="msub">換人 · 戰術</button><button class="btn y" data-act="mcont">${k === 'ht' ? '開始下半場' : '開始加時'}</button></div>`, 'sm');
}
// counter-offer on a bid for one of the user's players (fixed-size popup)
function cofPanel(id, msg) {
  const o = G.off.find(x => x.id === id); if (!o) return closeModal();
  const ask = o.ok ? o.fee : roundMoney(o.fee * 1.2);
  modal(`還價 · ${esc(ps(o.pid).sn)}`, `<div class="row"><span class="mute">買家</span><b>${esc(clubName(o.from))}</b></div>
    <div class="row"><span class="mute">而家報價</span><b class="num">${money(o.fee)}</b><span class="mute">身價 ${money(valueOf(o.pid))}</span>${o.last ? '<span class="tag t-ex">最後報價</span>' : ''}</div>
    <div class="row">你想要 £<input class="inp num" id="cofv" value="${ask}" style="width:140px" inputmode="numeric" ${o.ok ? 'disabled' : ''}><button class="btn" data-act="cof" data-a="${id}" ${o.ok ? 'disabled' : ''}>還價</button>${info('買家心入面有個最高價，你唔會知。叫價喺嗰個價以內佢會即刻答應；高過就會加少少價再還畀你，最多傾三轉。叫得太離譜，對方可能直接退出。')}</div>
    <p class="msg" style="min-height:1.4em">${msg ? esc(msg) : ''}</p>
    <div class="row"><button class="btn y" data-act="cofacc" data-a="${id}">以 ${money(o.fee)} 接受</button><button class="btn" data-act="mclose">遲啲先決定</button></div>`, 'sm');
}
function subPanel() {
  const M = MT.M, S = M[M.u], col = CL[S.cid].col;
  // all changes go into a draft (MT.dr) until 確認; closing the popup throws the draft away
  if (!MT.dr) MT.dr = { on: S.on.map(o => ({ ...o })), form: S.form, orig: S.on.map(o => o.pid).filter(Boolean) };
  const D = MT.dr, onSet = new Set(D.on.map(o => o.pid).filter(Boolean)), orig = new Set(D.orig);
  const ins = [...onSet].filter(p => !orig.has(p)), left = 3 - S.subs - ins.length;
  const bench = [...S.bench, ...D.orig].filter(p => !onSet.has(p));
  const cc = c => c >= 75 ? 'cg' : c >= 55 ? 'cw' : 'cb';
  const changed = ins.length || D.form !== S.form || D.on.some((o, i) => o.pid !== S.on[i]?.pid || o.slot !== S.on[i]?.slot || o.x !== S.on[i]?.x || o.y !== S.on[i]?.y);
  const shirts = D.on.map((o, i) => {
    const pid = o.pid, f = pid ? fitP(pid, o.slot) : 1, cond = pid ? Math.round(pd(pid).cond) : 0;
    return `<div class="shirt dg ${pid && MT.sel === pid ? 'selp' : ''} ${pid && !orig.has(pid) ? 'newin' : ''}" data-mi="${i}" style="left:${o.x}%;top:${o.y}%"><b class="sp">${o.slot}</b><i style="background:${col[0]};color:${col[1]}">${pid ? pd(pid).no || '' : ''}</i><span class="${f < .85 ? 'bad' : ''}">${pid ? esc(ps(pid).sn) : '冇人'}</span>${pid ? `<em class="rt ${f < 1 ? 'down' : ''}">${Math.round(pd(pid).sk * f)} · <b class="${cc(cond)}">${cond}%</b></em>` : ''}</div>`;
  }).join('');
  const benchH = bench.map(p => { const cond = Math.round(pd(p).cond), out = orig.has(p); return `<div class="mbc ${out ? 'out' : ''}" data-mb="${p}"><b class="n">${ps(p).pos}</b><span class="nm">${esc(ps(p).sn)}${out ? ' <span class="tag t-ex">換出</span>' : ''}</span><span class="n">${pd(p).sk}</span><span class="n ${cc(cond)}">${cond}%</span></div>`; }).join('') || '<div class="mute">冇後備</div>';
  modal(`換人 · 戰術（仲可以換 ${Math.max(0, left)} 個${ins.length ? `，${ins.length} 個未確認` : ''}）`, `<div class="mtbw">
    <div class="mtbl"><div class="lbl">戰術板 ${info('拖住球衣：放喺另一件球衣上面＝兩個人對調位置；放喺空位＝將佢移去嗰度（位置跟住變）；拖去右邊後備＝換人。由右邊拖後備落球衣上面都係換人。換出咗嘅球員會留喺後備名單（標住「換出」），未確認之前可以拖返入去。唔想拖：撳一件球衣揀咗佢，再撳另一件球衣對調，或者撳後備換入。全部排好撳「確認」先正式生效；撳「還原」或者關閉就當冇改過。數字係扣咗位置之後嘅能力 · 體力。')}</div><div class="pitchv" id="mtb">${PITCHV}${shirts}</div></div>
    <div class="mtbr"><div class="lbl">後備（拖落球衣換人）</div><div id="mtbench">${benchH}</div>
    <div class="row" style="margin-top:10px"><button class="btn y" data-act="mconf" ${changed ? '' : 'disabled'}>確認${ins.length ? `換人（${ins.length}）` : '改動'}</button><button class="btn" data-act="mundo" ${changed ? '' : 'disabled'}>還原</button></div>
    <div class="lbl" style="margin-top:10px">陣式</div><select class="inp" data-ch="mform">${formOpts(D.form)}</select>
    <div class="lbl" style="margin-top:10px">打法（即時生效）</div>${Object.entries(STYLE).map(([k, v]) => `<div class="row" style="margin-bottom:4px"><span style="width:64px">${STYLEN[k]}</span>${v.map((t, i) => `<button class="chip" data-act="msty" data-a="${k}:${i}" aria-pressed="${S.sty[k] === i}">${t}</button>`).join('')}</div>`).join('')}</div></div>`, 'tall');
}
// apply the draft: each new player replaces one of the players taken off (a real substitution, counted and logged)
function mConfirm() {
  const M = MT.M, S = M[M.u], D = MT.dr; if (!D) return;
  const onSet = new Set(D.on.map(o => o.pid).filter(Boolean)), orig = new Set(D.orig);
  const ins = [...onSet].filter(p => !orig.has(p)), outs = D.orig.filter(p => !onSet.has(p));
  if (S.subs + ins.length > 3) return toast('最多只可以換 3 個');
  ins.forEach((p, k) => { const o = S.on.find(x => x.pid === outs[k]); if (o) doSub(M, S, o, p); });
  S.form = D.form; S.on = D.on.map(o => ({ ...o }));
  MT.dr = null; MT.sel = null; MT.pos = {};
  toast(ins.length ? `換咗 ${ins.length} 個人` : '已更新陣容'); updLive(); closeModal();
}
/* in-match tactics board: drag shirts to swap / move, drag between the pitch and the bench to substitute; taps work too */
let MDRG = null;
function mbTarget(e) {
  MDRG.g.hidden = true; const el = document.elementFromPoint(e.clientX, e.clientY); MDRG.g.hidden = false;
  if (!el) return null;
  const sh = el.closest('#mtb .shirt[data-mi]'); if (sh && !(MDRG.sh && +sh.dataset.mi === MDRG.src)) return { i: +sh.dataset.mi, el: sh };
  if (MDRG.sh) { const b = el.closest('#mtbench [data-mb]'); if (b) return { b: b.dataset.mb, el: b }; }
  const p = el.closest('#mtb'); if (p && MDRG.sh) { const r = p.getBoundingClientRect(); return { move: [clamp((e.clientX - r.left) / r.width * 100, 5, 95), clamp((e.clientY - r.top) / r.height * 100, 5, 95)] }; }
  return null;
}
// draft substitution: bench player inPid takes slot i (the player there goes to the bench list)
function mbSub(i, inPid) {
  const S = MT.M[MT.M.u], D = MT.dr, o = D.on[i];
  if (!o.pid) return toast('嗰個位冇人，揀另一個');
  const orig = new Set(D.orig), willIns = D.on.filter((x, k) => k !== i && x.pid && !orig.has(x.pid)).length + (orig.has(inPid) ? 0 : 1);
  if (S.subs + willIns > 3) return toast(S.subs >= 3 ? '已經換晒 3 個' : `最多仲可以換 ${3 - S.subs} 個`);
  o.pid = inPid; MT.sel = null; return true;
}
function mbDone() { subPanel(); }
function mbClear(d) { if (d.g) d.g.remove(); d.el.classList.remove('dragging'); $$('.dropon').forEach(x => x.classList.remove('dropon')); }
document.addEventListener('pointerdown', e => {
  if (MDRG || !MT || !MT.M || !MT.dr || !$('#mtb')) return;
  const sh = e.target.closest('#mtb .shirt[data-mi]'), b = !sh && e.target.closest('#mtbench [data-mb]');
  if (!sh && !b) return;
  MDRG = { sh: !!sh, src: sh ? +sh.dataset.mi : b.dataset.mb, el: sh || b, x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false };
  e.preventDefault(); try { MDRG.el.setPointerCapture(e.pointerId); } catch (x) { }
});
document.addEventListener('pointermove', e => {
  if (!MDRG || e.pointerId !== MDRG.id) return;
  if (!MDRG.on) {
    if (Math.hypot(e.clientX - MDRG.x0, e.clientY - MDRG.y0) < 6) return;
    const pid = MDRG.sh ? MT.dr.on[MDRG.src].pid : MDRG.src;
    if (!pid) { MDRG = null; return; }
    MDRG.on = true; MDRG.g = Object.assign(document.createElement('div'), { className: 'dghost', textContent: ps(pid).sn });
    document.body.appendChild(MDRG.g); MDRG.el.classList.add('dragging');
  }
  MDRG.g.style.left = e.clientX + 'px'; MDRG.g.style.top = e.clientY + 'px';
  const t = mbTarget(e); $$('.dropon').forEach(x => x.classList.remove('dropon')); if (t && t.el) t.el.classList.add('dropon');
});
document.addEventListener('pointerup', e => {
  if (!MDRG || e.pointerId !== MDRG.id) return;
  const d = MDRG, t = d.on ? mbTarget(e) : null, D = MT.dr;
  mbClear(d); MDRG = null;
  if (!d.on) {   // taps: shirt = select, a second shirt = swap; bench = bring on for the selected player
    if (d.sh) {
      const pid = D.on[d.src].pid, j = D.on.findIndex(o => o.pid && o.pid === MT.sel);
      if (MT.sel && pid && MT.sel !== pid && j >= 0) { [D.on[j].pid, D.on[d.src].pid] = [D.on[d.src].pid, D.on[j].pid]; MT.sel = null; } else MT.sel = MT.sel === pid ? null : pid;
    } else { const j = D.on.findIndex(o => o.pid && o.pid === MT.sel); if (j < 0) toast('先撳球場上要換走嘅球員'); else mbSub(j, d.src); }
    return mbDone();
  }
  if (!t) return mbDone();
  if (d.sh && t.i != null) { const a = D.on[d.src], b = D.on[t.i]; [a.pid, b.pid] = [b.pid, a.pid]; }
  else if (d.sh && t.b) mbSub(d.src, t.b);
  else if (!d.sh && t.i != null) mbSub(t.i, d.src);
  else if (d.sh && t.move) { const o = D.on[d.src]; o.x = Math.round(t.move[0]); o.y = Math.round(t.move[1]); o.slot = slotAt(o.x, o.y); }
  mbDone();
});
document.addEventListener('pointercancel', () => { if (MDRG) { mbClear(MDRG); MDRG = null; } });
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
  const m0 = G.mail.filter(m => !m.rd).length, o0 = G.off.length;
  MT = null; nextDay(); afterAdvance();
  // feedback: the date in the top bar flashes and a toast names the new day (and anything that arrived)
  if (!userFxToday()) {
    const nm = G.mail.filter(m => !m.rd).length - m0, no = G.off.length - o0;
    toast(`📅 ${fdate(G.day)}${nm > 0 ? ` · ${nm} 封新郵件` : ''}${no > 0 ? ` · ${no} 個新報價` : ''}`);
    const t = $('#top .tinfo .club small.num'); if (t) { t.classList.remove('dayflash'); void t.offsetWidth; t.classList.add('dayflash'); }
  }
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
  srs: el => { const f = UI.sr, k = el.dataset.a; f.dir = f.sort === k ? -(f.dir || SRCOL[k][2]) : SRCOL[k][2]; f.sort = k; render(); },
  clubv: el => clubPanel(el.dataset.a),
  cofopen: el => cofPanel(+el.dataset.a),
  cof: el => { const id = +el.dataset.a, ask = Math.max(0, Math.round(+$('#cofv').value || 0)); const r = counterOffer(id, ask); save(); if (r.gone) { closeModal(); toast(r.msg); render(); } else { cofPanel(id, r.msg); render(); } },
  cofacc: el => { closeModal(); toast(acceptOffer(+el.dataset.a)); save(); render(); },
  reject: el => { const id = +el.dataset.a; G.off = G.off.filter(o => o.id !== id); save(); render(); toast('已拒絕報價'); },
  unlist: el => { pd(el.dataset.a).list = 0; save(); render(); },
  pull: el => { closeModal(); doPull(+el.dataset.a); },
  renewopen: el => openPlayer(el.dataset.a, 'renew'),
  build: el => { const [s, cost, days] = el.dataset.a.split(':').map(Number), c = myClub(); if (!G.inf && c.cash < cost) return toast('資金唔夠'); fin(myCid(), 'build', -cost); c.build = { seats: s, done: G.day + days }; save(); render(); toast('工程開始'); },
  job: el => { takeJob(el.dataset.a); save(); go('home'); },
  tbc: el => { UI.tb.c = el.dataset.a; UI.tb.l = ctrs().find(x => x[0] === el.dataset.a)[2][0]; UI.tb.r = null; render(); },
  tbl: el => { UI.tb.l = el.dataset.a; UI.tb.r = null; render(); },
  tbr: el => { UI.tb.r = +el.dataset.a; UI.tb.lid = (ctrs().find(x => x[0] === UI.tb.c)[2].includes(UI.tb.l) ? UI.tb.l : ctrs().find(x => x[0] === UI.tb.c)[2][0]); render(); },
  rkt: el => { UI.rk.t = el.dataset.a; render(); },
  rkc: el => { UI.rk.c = el.dataset.a; UI.rk.l = ''; render(); },
  rkl: el => { UI.rk.l = el.dataset.a; render(); },
  rkk: el => { UI.rk.k = el.dataset.a; render(); },
  ssave: el => { G.slot = +el.dataset.a; save(); render(); toast(`已存到存檔位 ${G.slot}`); },
  sload: el => openSlot(+el.dataset.a),
  sdelc: el => { UI.del = el.dataset.a ? +el.dataset.a : null; render(); },
  sdel: el => { deleteSave(+el.dataset.a); UI.del = null; render(); toast('已刪除'); },
  sexp: () => { const t = $('#sx'); t.value = pack(); t.select(); const manual = () => toast('已匯出，請手動複製'); try { navigator.clipboard.writeText(t.value).then(() => toast('已複製'), manual); } catch (e) { manual(); } },
  simp: () => { const v = $('#sx').value.trim(), k = G.slot; try { const g = JSON.parse(v), y = g.era || 2001; localStorage.setItem(SKEY(k), v); if (y !== ERA.y) { const m = loadMeta(); m[k] = { mgr: g.mgr.name, cid: g.mgr.cid, cn: '', era: y, day: g.day, season: g.season }; localStorage.setItem('xifm-fm-meta', JSON.stringify(m)); return toEra(y, 'slot=' + k); } if (!loadGame(k)) throw 0; MT = null; save(); go('home'); toast('匯入成功'); } catch (e) { toast('存檔格式唔啱'); } },
  // profile
  pstep: el => { UI.pm.step = el.dataset.a || null; UI.pm.msg = ''; drawPlayer(); },
  list: () => { const d = pd(UI.pm.pid); d.list = d.list ? 0 : 1; save(); drawPlayer(); render(); },
  release: () => { const m = releasePlayer(UI.pm.pid); save(); closeModal(); render(); toast(m); },
  renew: () => { const P = UI.pm, w = +$('#pw').value, y = +$('#py').value; P.wage = w; P.yrs = y; const r = renewContract(P.pid, w, y); P.msg = r.msg; if (r.ok) { P.step = null; save(); render(); } drawPlayer(); },
  bid: () => { const P = UI.pm, fee = Math.max(0, Math.round(+$('#pf').value || 0)); P.fee = fee; P.n = +($('#pn')?.value || 1); P.swap = $('#psw')?.value || null; const r = userBid(P.pid, fee, P.n, P.swap); P.msg = r.msg; P.counter = r.counter; if (r.ok) { P.fee = r.fee; P.step = 'ct'; } drawPlayer(); },
  bidc: () => { const P = UI.pm, v = P.counter; $('#pf').value = v; ACT.bid(); },
  offerct: () => { const P = UI.pm, w = +$('#pw').value, y = +$('#py').value; P.wage = w; P.yrs = y; if (!G.inf && myClub().cash < Math.round(P.fee / (P.n || 1))) { P.msg = '資金唔夠'; return drawPlayer(); } if (P.swap && pd(P.swap).c !== myCid()) P.swap = null; const r = contractTalk(P.pid, w, y); P.msg = r.msg; if (r.ok) { completeSigning(P.pid, P.fee, w, y, P.n || 1, P.swap); save(); closeModal(); render(); toast(`簽入 ${ps(P.pid).sn}！`); return; } drawPlayer(); },
  // match
  mstart: startLive,
  mquick: () => { MT.M = newMatch(MT.f, false); runToEnd(MT.M); MT.phase = 'ft'; save(); render(); },
  mspd: el => { MT.spd = +el.dataset.a; if (MT.timer) { pauseLive(); runLive(); } else render(); $$('[data-act="mspd"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.a == MT.spd)); },
  mrun: () => { if (MT.timer) pauseLive(); else runLive(); updLive(); },
  msub: () => { if (MT.timer) { pauseLive(); MT.resume = true; } MT.sel = null; MT.dr = null; subPanel(); },
  mconf: () => mConfirm(),
  mundo: () => { MT.dr = null; MT.sel = null; subPanel(); },
  msel: el => { MT.sel = el.dataset.a; subPanel(); },
  msubin: el => { if (!MT.sel) return toast('先揀要換走嘅球員'); if (!userSub(MT.M, MT.sel, el.dataset.a)) return toast(MT.M[MT.M.u].subs >= 3 ? '已經換晒 3 個' : '換唔到'); MT.sel = null; subPanel(); updLive(); },
  msty: el => { const [k, v] = el.dataset.a.split(':'); MT.M[MT.M.u].sty[k] = +v; subPanel(); },
  mcont: () => { MT.M.pause = null; closeModal(); runLive(); },
  mskip: () => { pauseLive(); runToEnd(MT.M); MT.phase = 'ft'; closeModal(); save(); render(); },
  mdone: () => { cancelAnimationFrame(MT.raf); playToday(); MT = null; save(); go('home'); },
};
const CH = {
  sp: el => { const c = myClub(); c.sp = c.sp || {}; if (el.value) c.sp[el.dataset.a] = el.value; else delete c.sp[el.dataset.a]; save(); render(); },
  ord: el => { const c = myClub(); if (el.value === 'n') delete c.ord[el.dataset.a]; else c.ord[el.dataset.a] = el.value; save(); },
  form: el => { myClub().form = el.value; save(); render(); },
  ment: el => { myClub().sty.ment = +el.value; save(); },
  sr: el => { UI.sr[el.dataset.a] = el.value; render(); },
  fxc: el => { UI.fxc = el.value; render(); },
  cup: el => { UI.cup = el.value; render(); },
  price: el => { myClub().price = clamp(Math.round(+el.value || 1), 1, 200); save(); render(); },
  mform: el => { const D = MT.dr, sl = FORMS[el.value]; D.form = el.value; D.on = sl.map((x, i) => ({ pid: D.on[i] ? D.on[i].pid : null, slot: x[0], x: x[1], y: x[2] })); subPanel(); },
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
  UI.srt = setTimeout(() => { const [n, rows] = searchRows(); $('#srt').innerHTML = rows; $('#srn').textContent = `${n.toLocaleString()} 人${n > 200 ? '（顯示頭 200）' : ''}`; }, 180);
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
const byRepStatic = lid => [...LG[lid].cids].sort((a, b) => CL[b].rep - CL[a].rep);
function boardGoal(lid, cid) { const rank = byRepStatic(lid).indexOf(cid) + 1, n = LG[lid].cids.length; return rank <= 1 ? '爭奪聯賽冠軍' : rank <= 4 ? '打入前四' : rank <= n / 2 ? '前半部完成' : rank <= n - 4 ? '安全護級' : '避免降班'; }
const eraOf = m => m.era || 2001;
const metaLine = m => `<span class="tag t-ls">${esc(FM.ERAS[eraOf(m)]?.n || eraOf(m))}</span> ${esc(m.mgr)} · ${esc(m.cn || (m.cid && eraOf(m) === ERA.y ? clubName(m.cid) : m.cid ? m.cid : '待業'))} · ${seasonTxt(m.season)} ${fdate(m.day, 's')}`;
// a page holds one era's data: going to another era's save or new game reloads with ?era=
const toEra = (y, q) => { location.href = `fm.html?era=${y}&${q}`; };
function openSlot(k) {
  const m = loadMeta()[k]; if (!m) return toast('讀取失敗');
  if (eraOf(m) !== ERA.y) return toEra(eraOf(m), 'slot=' + k);
  if (loadGame(k)) { MT = null; save(); enterGame(); } else toast('讀取失敗');
}
function showStart() {
  cancelAnimationFrame(MT?.raf); if (MT) pauseLive();
  $('#app').hidden = true; $('#modal').hidden = true; const s = $('#start'); s.hidden = false;
  const meta = loadMeta(), last = +localStorage.getItem('xifm-fm-last') || 0, cont = meta[last] ? last : [1, 2, 3].find(k => meta[k]);
  if (W.step === 0) {
    s.innerHTML = `<div class="emb"><div class="xi">XI</div><div class="mg">經理</div><div class="yr">2002</div><div class="sub">傳奇十一人 · 經理生涯</div></div>
    <div class="smenu"><button class="btn y" data-act="snew">開新遊戲</button><button class="btn" data-act="scont" data-a="${cont || ''}" ${cont ? '' : 'disabled'}>繼續</button><button class="btn" data-act="sloadl">讀取存檔</button><a class="btn full" href="index.html" style="text-align:center;text-decoration:none">返回傳奇十一人</a></div>`;
  } else if (W.step === 9) {
    s.innerHTML = `<div class="swiz">${pan('讀取存檔', `<table><tbody>${[1, 2, 3].map(k => `<tr><td class="n">${k}</td><td class="nm">${meta[k] ? metaLine(meta[k]) : '<span class="mute">空</span>'}</td><td>${meta[k] ? `<button class="btn sm y" data-act="scont" data-a="${k}">讀取</button>` : ''}</td></tr>`).join('')}</tbody></table>`)}<div class="row"><button class="btn" data-act="sback">返回</button></div></div>`;
  } else {
    const cs = ctrs(PLAY_LG), cty = cs.find(x => x[0] === W.cty) || cs[0], lid = cty[2].includes(W.lg) ? W.lg : cty[2][0];
    const clubs = byRepStatic(lid);
    s.innerHTML = `<div class="swiz">
      ${pan('開新遊戲', `<div class="tabs"><span class="mute" style="align-self:center">開局球季</span>${Object.entries(FM.ERAS).map(([y, E]) => `<button class="chip" data-act="wera" data-a="${y}" aria-pressed="${+y === ERA.y}">${E.n}</button>`).join('')}${info(ERA.d || '')}</div>
        <div class="row" style="margin-top:8px"><label>領隊名 <input class="inp" id="wname" maxlength="20" value="${esc(W.name)}" placeholder="你嘅名"></label><span class="mute">存檔位</span>${[1, 2, 3].map(k => `<button class="chip" data-act="wslot" data-a="${k}" aria-pressed="${W.slot === k}">${k}${meta[k] ? '（會覆蓋）' : ''}</button>`).join('')}</div>
        <div class="tabs" style="margin-top:8px">${cs.map(x => `<button class="chip" data-act="wcty" data-a="${x[0]}" aria-pressed="${cty[0] === x[0]}">${x[1]}</button>`).join('')}</div>
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
  scont: el => openSlot(+el.dataset.a),
  wera: el => { const y = +el.dataset.a; if (y !== ERA.y) toEra(y, 'new=1'); },
  wslot: el => { W.name = $('#wname').value; W.slot = +el.dataset.a; showStart(); },
  wcty: el => { W.name = $('#wname').value; W.cty = el.dataset.a; W.lg = ctrs(PLAY_LG).find(x => x[0] === W.cty)[2][0]; W.cid = null; showStart(); },
  wlg: el => { W.name = $('#wname').value; W.lg = el.dataset.a; W.cid = null; showStart(); },
  wclub: el => { W.name = $('#wname').value; W.cid = el.dataset.a; showStart(); },
  wgo: () => {
    W.name = $('#wname').value.trim() || '領隊';
    toast('建立緊新遊戲…');
    setTimeout(() => { newGame(W.name, W.cid, W.slot); MT = null; save(); enterGame(); }, 30);
  },
};

/* ---------- boot: load one era's data (fm/eras.js), then the start screen ---------- */
function loadEra(y) {
  return new Promise((ok, bad) => {
    const E = FM.ERAS[y]; let n = E.files.length;
    for (const f of E.files) {
      const s = document.createElement('script'); s.src = E.dir + f + '.js'; s.async = false; // keep file order
      s.onload = () => { if (--n === 0) ok(); }; s.onerror = () => f === 'pos2' ? (--n === 0 && ok()) : bad(new Error(f + '.js'));
      document.head.appendChild(s);
    }
  }).then(() => indexEra(y));
}
addEventListener('resize', () => { if (MT && MT.phase === 'live') { cancelAnimationFrame(MT.raf); MT.raf = requestAnimationFrame(drawPitch); } });
(function boot() {
  const q = new URLSearchParams(location.search), meta = loadMeta(), last = +localStorage.getItem('xifm-fm-last') || 0;
  let y = +q.get('era') || (meta[last] ? eraOf(meta[last]) : 2001);
  if (!FM.ERAS[y]) y = 2001;
  const s = $('#start'); s.hidden = false; s.innerHTML = '<p class="D" style="font-size:22px;position:relative">載入緊球員資料…</p>';
  loadEra(y).then(() => {
    if (q.has('era')) history.replaceState(null, '', location.pathname);
    if (q.get('slot')) return openSlot(+q.get('slot'));
    if (q.get('new')) W.step = 1;
    showStart();
  }, e => { s.innerHTML = `<p class="bad" style="position:relative">載入資料失敗（${esc(e.message)}），請重新整理頁面。</p>`; });
})();
