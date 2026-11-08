/* 球場 screen: a drawing of your ground (four stands in club colours, corners, upper tiers, works in progress, the
   badge on the centre circle) and the expansion planner (cost, finish date, expected effect, preview on the drawing).
   Logic lives in fm/core.js (stdOf, buildOpts, buildEffect, startBuild, finishBuilds, stadName). */
UI.gd = UI.gd || { st: 'W', k: null };
const GDSTD = [['W', '主看台'], ['E', '對面看台'], ['N', '北看台'], ['S', '南看台'], ['C', '角位']];
function groundSVG(cid, prev) {
  const c = G.clubs[cid], S = stdOf(c), [ca, cb] = CL[cid].col || ['#33415e', '#c9d6f0'], builds = c.builds || [];
  const P = { x: 120, y: 92, w: 160, h: 116 }, gap = 5;
  const depth = s => clamp(12 + 44 * Math.sqrt(s / 40000), 12, 62);
  const bOn = st => builds.find(b => b.st === st);
  // a stand's rectangle at distance d0..d1 from the pitch
  const R = (st, d0, d1) => st === 'W' ? [P.x, P.y + P.h + gap + d0, P.w, d1 - d0] : st === 'E' ? [P.x, P.y - gap - d1, P.w, d1 - d0]
    : st === 'N' ? [P.x - gap - d1, P.y, d1 - d0, P.h] : [P.x + P.w + gap + d0, P.y, d1 - d0, P.h];
  const rect = ([x, y, w, h], a) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" ${a}/>`;
  let g = '';
  const D = {};
  for (const st of ['W', 'E', 'N', 'S']) {
    const s = S[st].s, d = depth(s), up = S[st].t ? d * .38 : 0; D[st] = d;
    g += rect(R(st, 0, d - up), `fill="url(#seat)" stroke="#0b1530" stroke-width="1"`);
    if (up) g += rect(R(st, d - up, d), `fill="url(#seat2)" stroke="#0b1530" stroke-width="1"`);
    for (let k = 1; k <= S[st].r; k++) { const dd = (d - up) * (1 - k * .14); g += rect(R(st, dd, dd + .8), 'fill="#ffffff55"'); }
    const b = bOn(st);
    if (b) { const add = Math.max(depth(s + b.seats) - d, b.k === 'tier' ? 14 : 7); g += rect(R(st, d, d + add), 'fill="url(#works)" stroke="#ffcf3a" stroke-width="1" stroke-dasharray="3 2"') + (() => { const [x, y, w, h] = R(st, d, d + add); return `<text x="${x + w / 2}" y="${y + h / 2}" dy="3" class="gst" ${st === 'N' || st === 'S' ? `transform="rotate(${st === 'N' ? -90 : 90} ${x + w / 2} ${y + h / 2})"` : ''}>施工中</text>`; })(); }
    if (prev && prev.st === st) { const add = depth(s + prev.seats) - d; g += rect(R(st, d, d + Math.max(add, prev.k === 'tier' ? 14 : 7)), 'class="gprev"'); }
    // stand name + seats
    const [x, y, w, h] = R(st, 0, d), cx = x + w / 2, cy = y + h / 2, vert = st === 'N' || st === 'S';
    g += `<text x="${cx}" y="${cy}" class="gst" ${vert ? `transform="rotate(${st === 'N' ? -90 : 90} ${cx} ${cy})"` : ''} dy="3.5">${STDN[st]} ${(s / 1000).toFixed(1)}k</text>`;
  }
  // corners: NW, NE, SE, SW in build order
  const corner = (k, cls) => {
    const [cx, cy, sx, sy] = [[P.x - gap, P.y - gap, -1, -1], [P.x + P.w + gap, P.y - gap, 1, -1], [P.x + P.w + gap, P.y + P.h + gap, 1, 1], [P.x - gap, P.y + P.h + gap, -1, 1]][k];
    const dx = (sx < 0 ? D.N : D.S) * .9, dy = (sy < 0 ? D.E : D.W) * .9;
    return `<path d="M${cx} ${cy} h${sx * dx} q0 ${sy * dy * .2} ${-sx * dx * .25} ${sy * dy * .55} q${-sx * dx * .35} ${sy * dy * .45} ${-sx * dx * .75} ${sy * dy * .45} Z" ${cls}/>`;
  };
  for (let k = 0; k < 4; k++) {
    if (k < S.cn) g += corner(k, 'fill="url(#seat)" stroke="#0b1530" stroke-width="1"');
    else if (k === S.cn && bOn('C')) g += corner(k, 'fill="url(#works)" stroke="#ffcf3a" stroke-width="1" stroke-dasharray="3 2"');
    else if (k === S.cn && prev && prev.st === 'C') g += corner(k, 'class="gprev"');
    else g += corner(k, 'fill="#0e1a36" stroke="#1d2b4f" stroke-width="1"');
  }
  // pitch
  const stripes = Array.from({ length: 8 }, (_, k) => `<rect x="${P.x + k * P.w / 8}" y="${P.y}" width="${P.w / 8}" height="${P.h}" fill="${k % 2 ? '#2f8a4c' : '#2a7e45'}"/>`).join('');
  const L = 'fill="none" stroke="#e8f5ec" stroke-opacity=".75" stroke-width="1"';
  const pitch = `${stripes}<rect x="${P.x + 4}" y="${P.y + 4}" width="${P.w - 8}" height="${P.h - 8}" ${L}/><line x1="200" y1="${P.y + 4}" x2="200" y2="${P.y + P.h - 4}" ${L}/><circle cx="200" cy="150" r="15" ${L}/>
    <rect x="${P.x + 4}" y="${150 - 26}" width="22" height="52" ${L}/><rect x="${P.x + P.w - 26}" y="${150 - 26}" width="22" height="52" ${L}/><rect x="${P.x + 4}" y="${150 - 11}" width="8" height="22" ${L}/><rect x="${P.x + P.w - 12}" y="${150 - 11}" width="8" height="22" ${L}/>`;
  const badge = badgeSVG(cid, 26).replace('<svg ', '<svg x="187" y="137" ');
  const lights = [[P.x - 58, P.y - 52], [P.x + P.w + 58, P.y - 52], [P.x + P.w + 58, P.y + P.h + 52], [P.x - 58, P.y + P.h + 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#glow)"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff8d8"/>`).join('');
  return `<svg class="gsvg" viewBox="0 0 400 300" role="img" aria-label="${esc(stadName(cid))}">
    <defs>
      <pattern id="seat" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${ca}"/><rect width="4" height="1.2" fill="${cb}" opacity=".35"/></pattern>
      <pattern id="seat2" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${ca}"/><rect width="4" height="4" fill="#000" opacity=".28"/><rect width="4" height="1.2" fill="${cb}" opacity=".3"/></pattern>
      <pattern id="works" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#2b2410"/><rect width="3.5" height="7" fill="#e0b300" opacity=".75"/></pattern>
      <radialGradient id="glow"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="40" y="18" width="320" height="264" rx="34" fill="#0a1430" stroke="#1d2b4f"/>
    ${g}${pitch}${badge}${lights}
  </svg>`;
}
SCREENS.stadium = () => {
  const c = myClub(), cid = myCid(), S = stdOf(c), U = UI.gd, home = G.fx.filter(f => f.h === cid && f.att && !f.n), avg = home.length ? Math.round(sum(home.map(f => f.att)) / home.length) : 0;
  const opts = buildOpts(cid, U.st), sel = opts.find(o => o.k === U.k) || null, hist = (FM.STADIA || {})[CL[cid].name] || [];
  const works = (c.builds || []).map(b => { const pc = clamp((G.day - b.start) / Math.max(1, b.done - b.start), 0, 1); return `<div class="gwork"><div><b>${b.st === 'C' ? '角位看台' : STDN[b.st] + (b.k === 'tier' ? ' · 上層' : ' · 加建座位')}</b> <span class="mute">+${b.seats.toLocaleString()} 座位${b.shut ? ` · 施工期間封咗 ${b.shut.toLocaleString()} 個` : ''}</span></div><div class="bar"><i style="width:${Math.round(pc * 100)}%;background:var(--sel)"></i></div><div class="mute">${fdate(b.done)} 完成 · 仲有 ${Math.max(0, b.done - G.day)} 日</div></div>`; }).join('');
  const optCard = o => {
    const e = buildEffect(cid, o.seats), pay = e.perSeason > 0 ? o.cost / e.perSeason : 0;
    return `<div class="gopt ${U.k === o.k ? 'on' : ''}" data-act="gdk" data-a="${o.k}">
      <div class="gtop"><b>${o.n}</b><span class="num">+${o.seats.toLocaleString()} 座位</span></div>
      <div class="mute">${o.d}</div>
      <dl class="kv"><dt>費用</dt><dd class="num">${money(o.cost)}</dd><dt>工期</dt><dd>${o.days} 日 · 預計 ${fdate(G.day + o.days)} 完成</dd>
        <dt>預期效果</dt><dd>每場多大約 ${e.extra.toLocaleString()} 人入場（按而家入座率 ${Math.round(e.fill * 100)}%）· 門票每場 +${money(e.perGame)} · 一季 +${money(e.perSeason)}（約 ${e.games} 場主場）${pay ? ` · 大約 ${pay < 1 ? '1 季內' : pay.toFixed(1) + ' 季'}回本` : ''}${o.shut ? ` · 施工期間少咗 ${o.shut.toLocaleString()} 個座位` : ''}</dd></dl>
      <div class="row"><button class="btn sm y" data-act="gdbuild" data-a="${U.st}:${o.k}" ${o.ok ? '' : 'disabled'}>${o.ok ? `興建 · ${money(o.cost)}` : esc(o.why)}</button>${U.k === o.k ? '<span class="note">預覽：圖上黃色虛線位</span>' : '<span class="note">撳呢格喺圖上預覽</span>'}</div></div>`;
  };
  const stInfo = U.st === 'C' ? `已起 ${S.cn} / 4 個角 · ${(S.cs || 0).toLocaleString()} 座位` : `${S[U.st].s.toLocaleString()} 座位 · 加建過 ${S[U.st].r} 次 · ${S[U.st].t ? '有上層' : '冇上層'}`;
  main(`${hdr('球場', `<span class="mute">${esc(stadName(cid))}</span>${hist.length ? info(`球場歷史：${hist.filter(h => h[0]).map(h => `${h[0]}/${String(h[0] + 1).slice(2)} 起 ${h[1]}${h[2] ? `（${h[2].toLocaleString()}）` : ''}`).join('；') || hist[0][1]}。真實球會喺邊季搬場或者改名，遊戲都會跟住。`) : ''}`)}
  <div class="cols c2 m-stack gwrap">
    <div class="cols" style="grid-template-rows:minmax(0,1fr) auto">
      ${pan(esc(stadName(cid)), groundSVG(cid, sel ? { st: U.st, k: sel.k, seats: sel.seats } : null), { st: 'min-height:0', cls: 'gpan' })}
      ${pan('數據', `<dl class="kv gkv"><dt>容量</dt><dd class="big num">${c.cap.toLocaleString()}</dd><dt>今季平均入場</dt><dd>${avg ? avg.toLocaleString() : '—'}</dd><dt>入座率</dt><dd>${avg ? Math.round(avg / c.cap * 100) + '%' : '—'}</dd><dt>票價</dt><dd>£${c.price}（去「財政」改）</dd><dt>每個座位造價</dt><dd>${money(seatCost())}</dd></dl>`)}
    </div>
    <div class="cols" style="grid-template-rows:auto auto minmax(0,1fr);min-height:0">
      <div class="row">${GDSTD.map(([k, n]) => `<button class="chip" data-act="gdst" data-a="${k}" aria-pressed="${U.st === k}">${n}</button>`).join('')}</div>
      ${works ? pan('施工中', works) : pan(`${U.st === 'C' ? '角位' : STDN[U.st]}`, `<p class="mute" style="margin:0">${stInfo}</p>`)}
      ${pan(`擴建 · ${U.st === 'C' ? '角位' : STDN[U.st]}${info('擴建會喺工期完咗嗰個星期落成。預期效果按而家嘅入座率同票價計：入座率越高、票價越貴，回本越快。成績、對手同宣傳會影響入座率。每個看台可以加建座位兩次、起一次上層；四個角位可以逐個填。同一個看台一次只可以有一項工程。')}`, `<div class="gopts">${opts.map(optCard).join('')}</div>`, { t: 1, st: 'min-height:0' })}
    </div>
  </div>`);
};
Object.assign(ACT, {
  gdst: el => { UI.gd = { st: el.dataset.a, k: null }; render(); },
  gdk: el => { if (UI.gd.k === el.dataset.a) return; UI.gd.k = el.dataset.a; render(); },
  gdbuild: el => {
    const [st, k] = el.dataset.a.split(':'), err = startBuild(myCid(), st, k); if (err) return toast(err);
    UI.gd.k = null; save(); render(); toast('工程開始！');
  },
});
