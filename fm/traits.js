/* Player profile extras (球員檔案): height, foot, body type, role and special skills (playstyles, in the spirit of EA FC).
   Height and foot are real where Transfermarkt has them (fm/data/<era>/bio.js, tools/fm-bio.js), otherwise estimated
   from position and attributes (shown with 「約」). Weight, weak foot, skill moves, role and playstyles are worked out
   from the player's attributes (attrs in core.js), position and star status, so the same player keeps them in every era. */
const POSH = { GK: 190, CD: 187, RB: 178, LB: 177, RWB: 177, LWB: 177, DM: 182, CM: 179, RM: 176, LM: 176, AM: 176, RW: 174, LW: 174, CF: 180, ST: 183 };
function bioOf(pid) {
  const p = ps(pid), real = (FM.BIO || {})[pid], A = attrMap(pid), t = k => (hsh(p.name + '@' + k) % 1000) / 1000;
  let h = real && real[0], est = !h;
  if (!h) h = Math.round((POSH[p.pos] || 180) + ((A['頭球'] || A['手型'] || 70) - 70) * .12 + (t('h') - .5) * 12);
  let f = real && real[1];
  if (!f) f = /^L/.test(p.pos) ? (t('f') < .75 ? 'L' : 'R') : t('f') < .12 ? 'L' : t('f') < .15 ? 'B' : 'R';
  const w = Math.round((h - 100) * .88 + ((A['力量'] || 70) - 70) * .18 + (t('w') - .5) * 6);
  const tech = p.pos === 'GK' ? 40 : ((A['控球'] || 60) + (A['傳球'] || 60)) / 2;
  const weak = f === 'B' ? 5 : clamp(Math.round(1.2 + (tech - 60) / 22 + t('wf') * 1.6), 1, 5);
  const skill = p.pos === 'GK' ? 1 : clamp(Math.round(1 + ((A['控球'] || 60) - 55) / 11 + (/W|AM|CF/.test(p.pos) ? .6 : 0) + t('sm') * .8 - (p.pos === 'CD' ? 1 : 0)), 1, 5);
  return { h, w, f, est, weak, skill };
}
const attrMap = pid => { const a = attrs(pid), n = attrNames(pid), o = {}; n.forEach((k, i) => { o[k] = a[i]; }); return o; };
function bodyOf(pid, B) {
  const A = attrMap(pid), st = A['力量'] || 70, sp = A['速度'] || 70;
  if (B.h >= 188 && st >= 75) return '高大強壯';
  if (B.h >= 186) return '高瘦';
  if (B.h <= 172 && (A['控球'] || 0) >= 75) return '矮小靈活';
  if (st >= 84) return '健碩';
  if (sp >= 84 && st < 72) return '精瘦';
  return '標準';
}
function roleOf(pid, B) {
  const p = ps(pid), A = attrMap(pid), P = p.pos;
  if (P === 'GK') return A['出擊'] >= 82 ? '清道夫門將' : A['開球'] >= 82 ? '出球門將' : '傳統門將';
  if (P === 'CD') return A['傳球'] >= 72 ? '出球中堅' : A['頭球'] >= 84 ? '制空中堅' : A['力量'] >= 85 ? '硬朗中堅' : A['速度'] >= 80 ? '快速中堅' : '穩守中堅';
  if (/B$/.test(P)) return A['速度'] >= 82 && A['傳球'] >= 72 ? '進攻型邊衛' : A['搶截'] >= 78 ? '防守型邊衛' : '全能邊衛';
  if (P === 'DM') return A['傳球'] >= 84 ? '組織後腰' : A['搶截'] >= 82 ? '防守中場' : '屏障';
  if (P === 'CM') return A['體力'] >= 84 && A['搶截'] >= 70 ? '全能中場' : A['傳球'] >= 85 ? '中場大腦' : A['射門'] >= 80 ? '插上中場' : '前後走動';
  if (P === 'AM') return A['射門'] >= 86 ? '影子前鋒' : A['傳球'] >= 86 ? '十號位' : '進攻中場';
  if (/W$|M$/.test(P)) { const inv = (/^R/.test(P) && B.f === 'L') || (/^L/.test(P) && B.f === 'R'); return inv && A['射門'] >= 78 ? '內切射手' : A['速度'] >= 88 ? '邊路快馬' : A['傳球'] >= 80 ? '傳中專家' : '邊路球員'; }
  if (P === 'CF') return A['傳球'] >= 84 ? '假九號' : '影子前鋒';
  return A['射門'] >= 88 ? '終結者' : A['頭球'] >= 84 && A['力量'] >= 80 ? '目標中鋒' : A['速度'] >= 88 ? '快速前鋒' : A['傳球'] >= 82 ? '策應中鋒' : '禁區殺手';
}
// special skills: [name, score, description]; a score of 92+ (and a star) makes it a ★ version
const PSTYLE = [
  ['精準射門', A => Math.min(A['射門'], A['控球'] + 3), '射門角度刁鑽，罰球區頂位置特別準。'],
  ['大力射門', A => Math.min(A['射門'], A['力量'] + 6), '遠射力量大，守門員好難撲。'],
  ['一腳傳送', A => A['傳球'], '一腳傳出穿透防線嘅直線球。'],
  ['長傳轉移', A => Math.min(A['傳球'], 95) - 2, '大範圍轉移，一腳轉換攻勢。', P => /CD|DM|CM|B$/.test(P)],
  ['盤扭大師', A => A['控球'], '近身控球同轉身極靈活。'],
  ['快步', A => A['速度'] + 1, '起步快，幾步就擺脫對手。'],
  ['鐵肺', A => A['體力'], '全場九十分鐘都唔停跑。'],
  ['制空', A => A['頭球'], '高空球爭頂幾乎必勝。'],
  ['力量', A => A['力量'], '身體對抗贏多輸少。'],
  ['攔截', A => A['搶截'] + 1, '預判傳球路線，斷球一流。'],
  ['鏟斷', A => Math.min(A['搶截'], A['力量'] + 4), '時機準確嘅鏟截。', P => /CD|DM|B$|CM/.test(P)],
  ['罰球專家', (A, t) => Math.min(A['射門'], A['傳球']) + (t < .35 ? 6 : -8), '直接罰球同角球有威脅。'],
  ['冷靜終結', (A, t) => A['射門'] + (t < .5 ? 2 : -3), '單刀面對門將好冷靜。', P => /ST|CF|AM|W$/.test(P)],
];
const GSTYLE = [
  ['反應神速', A => A['反應'], '近距離撲救反應極快。'], ['撲救', A => A['撲救'], '撲救穩定，好少失手。'], ['出擊', A => A['出擊'], '快速出擊封阻單刀。'],
  ['遠傳', A => A['開球'], '大腳、手拋一下發動反擊。'], ['撲十二碼', (A, t) => A['反應'] + (t < .3 ? 4 : -10), '十二碼大戰嘅剋星。'],
];
function stylesOf(pid) {
  const p = ps(pid), A = attrMap(pid), star = typeof starOf === 'function' ? starOf(pid) : 0;
  const L = (p.pos === 'GK' ? GSTYLE : PSTYLE).map(([n, f, d, ok]) => ({ n, d, s: ok && !ok(p.pos) ? 0 : f(A, (hsh(p.name + '&' + n) % 1000) / 1000) }));
  const got = L.filter(x => x.s >= 84).sort((a, b) => b.s - a.s).slice(0, 5);
  got.forEach((x, i) => { x.plus = i < 2 && (x.s >= 94 || (star && i === 0 && x.s >= 89)); });
  if (pd(pid).sk >= 85 && ageOf(pid) >= 28 && hsh(p.name + 'lead') % 3 === 0) got.push({ n: '領袖', d: '更衣室領袖，帶動隊友。', plus: false });
  return got;
}
function traitPanel(pid) {
  const B = bioOf(pid), S = stylesOf(pid), st = n => `<span class="num" style="color:var(--sel)">${'★'.repeat(n)}</span><span class="num mute">${'☆'.repeat(5 - n)}</span>`;
  const foot = { R: '右腳', L: '左腳', B: '兩隻腳' }[B.f];
  return `<div class="pan"><h3>球員檔案 ${info('身高同慣用腳係真實資料（Transfermarkt）；冇資料嘅球員係估計，前面有「約」。風格、特殊球技、逆足同花式係按佢嘅能力同位置計出嚟：★ 係頂級版本。')}</h3><div class="pb">
    <dl class="kv kv2"><dt>身高</dt><dd>${B.est ? '約 ' : ''}${B.h} 厘米</dd><dt>體重</dt><dd>約 ${B.w} 公斤</dd><dt>身形</dt><dd>${bodyOf(pid, B)}</dd><dt>慣用腳</dt><dd>${foot}</dd><dt>逆足</dt><dd>${st(B.weak)}</dd><dt>花式</dt><dd>${st(B.skill)}</dd></dl>
    <div class="trole"><span class="mute">風格</span> <b>${roleOf(pid, B)}</b></div>
    <div class="tsty">${S.length ? S.map(x => `<span class="psty ${x.plus ? 'plus' : ''}" title="${esc(x.d)}">${x.plus ? '★ ' : ''}${x.n}</span>`).join('') : '<span class="mute">冇特殊球技</span>'}</div>
  </div></div>`;
}
