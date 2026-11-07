# 經理生涯模式（XI 經理 2002）— development plan

Goal: a new mode inside XIFM that plays like **EA Sports' *The F.A. Premier League Football Manager 2001/2002*** (Football Manager 2001 / 2002), with the real 2001/02 players, real players added season by season, plus XIFM's gacha as an extra way to sign players.

Decisions already made by the user:
- Lives **inside XIFM as a separate page** `fm.html` (own save, own economy). XIFM's `index.html` gets an entry button.
- Leagues: **England Premier League + Divisions One/Two/Three, Scottish Premier League, La Liga, Serie A, Bundesliga, French Division 1, Eredivisie, Portuguese, Turkish and Belgian top flights**, plus 18 European guest clubs for European cups. (The last four were added in Nov 2026; saves made before keep their nine leagues.)
- **Transfers stay**; gacha is an **extra channel**: a pulled player joins your club straight away (takes a squad place, draws a wage), paid for with club money.
- **Start seasons (eras): 1994/95, 1998/99, 2001/02, 2004/05, 2010/11, 2020/21, 2025/26**, each with its own real squads (`fm/eras.js`, `fm/data/<year>/`). 2001/02 has the deepest data (~3,700 players); the other eras cover the big clubs well and lower divisions thinly (see DATA_SPEC.md).
- Follow the user's coding principles: least code, browser-native features first, no framework, no build step. Every page needs a favicon and an og:image. Aim for one screen without page scrolling (panels may scroll inside).

Legal: do **not** use EA / Premier League names, logos or crests, or real club crests. Club badges are generic shields in club colours with the 3-letter short name. Real player and club names are fine. Screen layout may follow the 2001 game's structure, but the art is our own.

---

## 1. What is done (in this repo)

| File | State |
|---|---|
| `fm/DATA_SPEC.md` | Data format + skill calibration. Read before touching data. |
| `fm/data/*.js` | **Done.** 2001/02 squads: eng1 (20 clubs), eng2 (24), eng3 (24), eng4 (24), sco1 (12), esp1 (20), ita1 (18), ger1 (18), fra1 (18), eur (18 guest clubs). ~3,670 real players. Cross-file duplicates removed (mid-season movers kept at their 1 Sep 2001 club). |
| `tools/fm-check-data.js` | Validator: `node tools/fm-check-data.js fm/data/eng1.js` |
| `fm/core.js` | **Done, tested headless.** Data index, state, calendar, leagues, cups, Europe, promotion/relegation + play-offs, finances, AI transfers, user bids/contracts, gacha, season rollover, save/load. No DOM. |
| `fm/match.js` | **Done, tested headless.** Minute-by-minute engine used for every match; supports live play (pause, subs, formation/tactic changes). |
| `tools/fm-sim.js` + `tools/fm-sim-season.js` | Headless harness: `node tools/fm-sim.js tools/fm-sim-season.js` simulates a season and prints goals/game, top scorers, tables. |
| `fm.html` | Meta tags, full CSS for every screen (plus the ui.js additions block and phone rules), layout skeleton, script tags. |
| `fm/ui.js` | **Done (Nov 2026).** All 24 screens below, delegated click/change/input handlers, live match view, start screen + new-game wizard. Tested at 1280×800 and 390×844: no page scroll, no overflow, no console errors. |
| `fm/favicon.svg`, `og-fm.png` | **Done.** `index.html` has the 「經理生涯 01/02」 entry link and its own `og-xifm.png`. |

**UI conventions (ui.js)** — keep these when adding screens:
- A screen is `SCREENS.name = arg => main(html)`; nav entry in `NAVG` + title in `TITLE`; screens that need a club go in `NEEDCLUB` (unemployed managers are sent to 董事局).
- Buttons use `data-act="x"` → `ACT.x(el)`; selects/inputs use `data-ch="x"` → `CH.x(el)`; links `data-go` / `data-pl`. Never redeclare a core/match global (`R D G step ev card goal form off fin training …`) — run the clash check in §3 Step 3.
- Explanations go behind `info(text)` (ⓘ popover, fixed 260×150), never as long inline text. Dialogs use `modal()`; `.mbox` has a fixed height (`.sm` / default / `.tall`) so buttons and tabs never move when content changes.
- Call `save()` (wraps `saveGame()` + remembers the last slot) after every advance and every state change.
- Phone (≤760 px): wrap multi-panel screens in `.cols ... m-stack` (panels stack and scroll as one); give low-priority table columns class `hm`.

Headless results (one full 2001/02 season, all 9 leagues, all cups): about 20 s in Node (~55 ms per game day). Season-sim numbers: 2.5 goals/game, home win 40 %, draw 25 %. Champions are plausible (Man United/Arsenal/Leeds, Real Madrid, Juventus, Bayern, Celtic/Rangers, Lyon). Top scorers reach 40–50 in all competitions, which is a little high (see §5).

Data quality notes (tell the user, don't hide): Division Three and some small Bundesliga/La Liga clubs have thin squads (some only 2–10 known players). `fillYouth()` pads every club to 18 with clearly-labelled placeholders named `XXX 青年軍 n`, set near the club's level. Skill ratings are our own estimates, not the original game's numbers. Shirt numbers are 0 (auto-assigned) for many smaller clubs.

---

## 2. Architecture (keep it)

**Eras** — `fm.html` loads `fm/eras.js`, `core.js`, `match.js`, `ui.js`; `ui.js` then loads one era's data files and calls `indexEra(year)` (core) which fills `LG CL PS CLUBS PLAY_LG` and `ERA` (real CL groups `ERA.cl`, English UEFA entrants `ERA.ueEng`). Switching era reloads with `?era=YYYY` (`&new=1` opens the wizard, `&slot=k` loads a save). A save stores `G.era` and its league list `G.plg`; game-state loops use `PLG()` / `GCL()` (not `PLAY_LG` / `CLUBS`) so old saves without the new leagues keep working. The calendar is the 2001/02 one shifted by 364 days per season, earlier or later. Europe: first season uses `ERA.cl` when given, otherwise qualifiers by reputation (`QSPOTS` per league); later seasons use last season's table.

Plain `<script>` tags, globals, no modules: `FM` registry → `fm/data/*.js` → `fm/core.js` → `fm/match.js` → `fm/ui.js`.

**IDs**
- Club id `cid` = `leagueId.clubId` (e.g. `eng1.liv`). Fixed for ever, even after promotion (current league is `G.clubs[cid].lg`).
- Player id `pid` = `cid.index` for 2001/02 data, `s2002.cid.index` for later-season patches, `y<n>` for generated youth.
- ⚠️ Same rule as XIFM cards: in data files **only append** players to a club's `p` array. Never insert/reorder/delete existing rows once a release is out — saves store pids.

**State** `G` (see `newGame()` in core.js): `mgr`, `season`, `day` (integer UTC day number), `clubs[cid]` (lg, cash, cap, price, rep, form, sty, xi[11], sb[5], ord{pid:order}, tr{int,foc}, st{coach,physio,scout}, conf, exp, goal, build, fin{w,s}), `pl[pid]` (c, no, sk, cond, fm[last5 ratings], inj days, injn, sus, w wage/week, ct contract-end year, list, s season stats), `y` (generated youth static data), `comp`, `fx`, `mail`, `news`, `off` (offers for user's players), `tlog`, `hist`, `trophies`, `jobs`, `lgm` (league membership), `qual`, `inf` (cheat).
- Static player data: `ps(pid)`; dynamic: `pd(pid)`. Rosters: `roster(cid)` (index rebuilt by `reindex()`; use `movePlayer()` to change clubs).
- Save: `saveGame()` / `loadGame(slot)` / `deleteSave(slot)`, 3 slots, `localStorage['xifm-fm-<slot>']` + meta `xifm-fm-meta`. `pack()` compacts to ~0.8 MB per slot. If quota errors appear, move saves to IndexedDB (native, no library).

**Daily loop**
- `userFxToday()` → if the user has an unplayed match today, the UI must open the match screen before advancing.
- `nextDay()` → sims all of today's remaining fixtures, advances one day, then: recovery, injury countdown, weekly finances + training (Mondays), AI market + offers (within window), cup draws (`maybeDraw`), job offers, monthly board review, and `rollover()` on 1 July.
- Transfer window: 1 Jul → deadline 28 Mar (the 2001/02 English rule). `inWindow(day)`.

**Competitions** (`G.comp`): `t:'L'` league (`tab`), `t:'K'` knockout (`rd` rounds, `ties`, `alive`), `t:'G'` Champions League (8 groups of 4 → two-legged knockout; group thirds drop into UEFA Cup round 3). 2001/02 CL groups are the real ones (`CL01`). Cups: FA Cup, League Cup, Scottish Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France, CL, UEFA Cup, English play-offs (po2/po3/po4). Single-leg cup draws go to extra time + penalties (no replays). Clashes are moved by `resolveClashes()`.

**Promotion**: England only (3 down/2 up + play-off winner; Div 2↔3 4 down/3 up + play-off). No relegation out of Division Three, and none in the other countries (no lower divisions in the data). League sizes therefore stay as they start (e.g. the 1994/95 Premier League stays at 22).

**Match engine** (`match.js`): `newMatch(fx, live)` → `step(M)` per minute → `M.pause` = `'ht'` / `'et'` stops a live game until the UI clears it → `finish()` writes results, stats, form, cards/suspensions, injuries, then `recordResult()` in core. Live helpers for the UI: `userSub(M,out,in)`, `userSwap(M,a,b)`, `userForm(M,form)`, and `M[M.u].sty` / `.ord` can be edited mid-match. `runToEnd(M)` = "skip to full time" (AI makes the user's subs). `M.ev` events: `goal miss save tackle yc rc rc2 inj sub ht et pens pmiss ft` with `m` (minute label), `s` ('h'/'a'), `p`, `p2`, `x`. `M.ball` = [x%, y%] for the pitch drawing. `M.mom` = man of the match.

---

## 3. Build steps (all done — kept as the screen spec)

### Step 1 · `fm/ui.js` ✅
Render with template strings into `#top`, `#nav`, `#main`, `#tick`, `#modal`, `#toast` (all CSS already in `fm.html`). One delegated click handler using `data-go="screen"`, `data-pl="pid"` (opens player profile), `data-act="name"`. `go(screen,arg)` → `render()`. Call `saveGame()` after every advance and every important action.

Screens (Cantonese labels; nav groups 球隊 / 轉會 / 球會 / 賽事 / 系統):

1. **Start screen** (`#start`): emblem disc "XI 經理 2002" (CSS `.emb` ready), buttons 開新遊戲 · 繼續 · 讀取存檔 · 返回傳奇十一人 (`index.html`). New-game wizard: manager name + slot → country → league → club list (name, reputation stars, cash, stadium, capacity, board goal) → 開始 (`newGame(name,cid,slot)`).
2. **Top bar**: club badge (SVG shield in `CL[cid].col`; tap 5× → secret-code box: `GOAT` toggles `G.inf` (unlimited money), `SIUUU` +£100m), screen title, club name, next match line ("英超 · 主場 對 X · 18/8"), date `fdate(G.day)`, 收件箱 (dot when unread), 陣容, 選單 (phone), **下一日 ▶**. Next: if `userFxToday()` → match screen; else `nextDay()`. Also a "直到下場比賽" action that loops `nextDay()` until a user match day, an unread offer, or 60 days.
3. **主頁 Home**: next match card, mini league table around the user, last 5 results, latest mail, cash, board confidence bar.
4. **陣容 Squad** (the original's "Individual Orders" screen): blue-cell table — # · 位置 (slot from the formation; red if out of position) · 球員 · 狀態 tags (傷 / 停賽 / NON EU via `EU` set / 放售 / 約滿) · 體能 · 狀態 (form 0.0) · 能力 · 指令 (select `ORDERS`). Sections 正選 (11) / 後備 (5) / 預備組. Click a row then another row = swap (any section). Right side: vertical pitch with shirts (`.pitchv`, `.shirt`). Buttons 自動排陣 (`autoPick`), 陣式 select.
   *Built as the original's three columns:* list · 球場模擬 (big pitch) · 陣式 list, plus 方案 A/B/C (`club.plans`, `club.plan`). Pitch drag (pointer events, works on touch): shirt onto shirt = swap; shirt onto empty grass = move that slot → custom formation saved in `club.cust`, registered as `FORMS['C:'+cid]` by `regCustom()` on every render (position from `slotAt(x,y)`); list row onto shirt (mouse) = put that player in.
5. **戰術 Tactics**: formation chips (`FORMS`) with pitch preview; `STYLE` selects: 心態 · 傳球 · 節奏 · 防守方式 · 越位陷阱; one-line explanation for each.
6. **訓練 Training**: intensity 輕/中/重 (`tr.int`), focus 均衡/進攻/防守/戰術 (`tr.foc`: 'bal' 'att' 'def' 'tac'); show squad condition summary. Heavy = faster growth, slower recovery, small injury risk.
7. **職員 Staff**: coach / physio / scout levels 1–5; upgrade cost `level² × £50k`, wage shown (core charges weekly). Scout level raises gacha SR odds.
8. **球員搜尋 Search**: filters name / position / league (+ 自由球員) / max age / max value / sort; table (max 200 rows): name, club, age, pos, skill, value (`valueOf`), wage. Row → profile.
9. **Player profile modal**: name, club, pos (`POSN`), age, nationality (`natName`), skill, grade, value, wage, contract, condition, form, injury, 8 attributes with bars (`attrs`, `attrNames`), season stats. Own player: 放售/取消 (`d.list`), 續約 (`renewContract`), 解約 (`releasePlayer`, needs an in-page confirm). Other player: 出價 → `userBid(pid,fee)` (counter offer button when `counter`), then contract form → `contractTalk(pid,wage,years)` → `completeSigning(pid,fee,wage,years)`.
10. **轉會市場 Market**: tabs 收到報價 (`G.off`: 接受 → `acceptOffer(id)` / 拒絕), 我放售嘅球員, 轉會紀錄 (`G.tlog`).
11. **球探抽卡 Gacha**: reuse the XIFM card look (`.gcard`, `.flip` CSS ready). Single / ten-pull at `pullCost(1|10)`, rates table (`GRATES`, grade by skill: UR ≥90, SSR 85–89, SR 77–84, R 68–76, C <68), scout bonus. `gachaPull(n)` → flip animation; each card shows 已加盟 (or 球隊滿員，退還… if `full`). Note on screen: pulled players come from any club in the world, free of fee, on a new contract.
12. **合約 Contracts**: own players sorted by contract end — age, skill, wage, end year, value, 續約 button.
13. **財政 Finance**: cash, this week and this season by category (`fin.w`, `fin.s` keys: gate tv merch spon prize tin | wage staff tout scout build), ticket price input (`c.price`) with expected crowd (`attendance()`).
14. **球場 Stadium**: name, capacity, average crowd, expansions (+2,000 seats £3m / 120 days; +5,000 £8m / 240 days) → `c.build = {seats, done: day}` (core completes it).
15. **董事局 Board**: confidence bar, season goal (`c.goal`, `c.exp`), current position, manager reputation, job offers (`G.jobs` → `takeJob(cid)`). When unemployed (`G.mgr.cid == null`) this is the home screen.
16. **賽程 Fixtures**: user's fixtures all competitions (date, comp, H/A, opponent, score, scorers `f.sc`); club selector to view any club.
17. **積分榜 Tables**: country tabs → league; full table with zone stripes (CSS `zone-cl/ue/up/po/dn`); round results.
18. **盃賽 Cups**: pick competition → CL group tables + knockout rounds (ties, aggregate, pens).
19. **數據排名 Ratings** (the original's RATINGS screen): left lists 國家 / 級別 / 準則 (入球 · 助攻 · 紙牌 · 最佳球員 · 狀態); right top 60 in three columns. Tabs 球員 / 球會 / 獎項 (`G.hist[].aw`).
20. **歷史 History**: champions per season, user's career (`G.hist[].me`), trophies.
21. **收件箱 Mail**: list + body (HTML from core, already escaped); actions `act.k === 'offer'`.
22. **存檔 Save**: 3 slots (save / load / delete with in-page confirm), export (copy JSON) / import (paste).
23. **Match screen**:
    - Pre-match: both line-ups with skill/condition, competition/round/venue, quick formation + tactic change, buttons 調整陣容 / 開波 / 快速結果 (`runToEnd`).
    - Live: score bar (`.mtop`), canvas pitch (horizontal; 22 dots placed from formation `x,y`, both teams shifted toward `M.ball`, eased with requestAnimationFrame), commentary feed from `M.ev` (Cantonese lines per event type), stats (控球 `S.pos`, 射門 `sh`, 射中 `sot`, 角球 `co`, 犯規 `fo`, 黃/紅牌), speed 1× (350 ms/min) · 2× · 4×, 換人 · 戰術 (pause → tactics-board modal: drag to swap/move/substitute as a draft, 確認 applies; max `MAXSUBS` = 5 subs; formation; style), 跳到完場.
    - Half time / extra time: `M.pause` set → show panel, 繼續 clears it.
    - Full time: summary, MOM, 繼續 → `playToday()` → home.
24. **Phone** (≤760 px): CSS already switches to a drawer nav (`#nav[data-open]`, `#menuBtn`) and one column; hide low-priority table columns with class `hm`.

### Step 2 · Assets & integration ✅
- `fm/favicon.svg` (shield + "XI" + 2002, navy/blue/yellow) and `og-fm.png` 1200×630 at repo root (render an HTML card with the pre-installed Playwright and screenshot it).
- `index.html`: add an entry to the mode in the header (e.g. a "經理生涯 01/02" link to `fm.html`). `index.html` should also get an og:image (user rule).
- Update `README.md` (Cantonese, player-facing) and the root `CLAUDE.md` (files table, link to this plan, how to run the tools).

### Step 3 · Test ✅ (two headless seasons: both rollovers, promotion/relegation, Europe qualification, save → load identical; browser run of every screen + a live match with subs at both sizes)
- Global-name clash check for ui.js: `node -e "const fs=require('fs'),n=f=>new Set([...fs.readFileSync(f,'utf8').matchAll(/^(?:const|let|function|async function)\s+([$\w]+)/gm)].map(m=>m[1])),u=n('fm/ui.js'),e=new Set([...n('fm/core.js'),...n('fm/match.js'),'D','off','G']);console.log([...u].filter(x=>e.has(x)))"` must print `[]`.
- `node tools/fm-sim.js tools/fm-sim-season.js` after any engine change; keep goals/game ≈ 2.5–2.7.
- Headless test of two seasons including rollover, promotion, Europe qualification, save → load round trip.
- Playwright: start a game, play one live match, make a sub, skip to full time, advance a week, open every screen at 1280×800 and 390×844; no page scroll, no console errors.
- Then commit as `fiveathree <fiveathree@gmail.com>` and push to `main`.

---

## 4. Adding later seasons ("逐年加真實球員")
Create `fm/data/s2002.js` and add a `<script>` tag after the other data files:
```js
FM.addSeason(2002, { clubs: {
  'eng1.mun': [[0,'Rio Ferdinand','CD','ENG',1978,86]],   // summer 2002 signing, rows as in DATA_SPEC.md
  'eng1.ars': [[0,'Gilberto Silva','DM','BRA',1976,84]],
}});
```
- At the 2002 rollover these players join the named club (or become free agents if the key is unknown). Real moves of **existing** players between clubs are not handled yet — add a `moves: [[pid or name, toCid]]` list to the patch and apply it in `rollover()` next to the `patch.clubs` loop.
- Never edit earlier season files' row order.

## 5. Known simplifications / ideas
- No cup replays (2001/02 FA Cup had them); CL has one group stage + knockout instead of the real second group stage; UEFA Cup format is approximate; 2001/02 UEFA Cup entrants are picked by reputation except the English four.
- No loans, no work-permit rules (NON EU is shown only), no youth academy screen, no AI manager names, no international football.
- AI clubs' players can be sold to the user; gacha takes players from any club for free (by design).
- Top scorers run a bit high (≈45 in all competitions) — tune `POSW` / goal probability in `attack()` if wanted.
- Performance: ~55 ms per game day in Node; fine for clicking day by day. "直到下場比賽" over a week takes ~0.4 s.

## 6. Club life (fm/life.js + fm/life-ui.js)
- `fm/life.js` (logic, loaded after match.js; also loaded by tools/fm-sim.js) and `fm/life-ui.js` (screens, loaded after ui.js; ui.js boots on DOMContentLoaded so these are in place).
- 職員: seven roles in `STAFFR` (coach fit physio gk yth scout pr), levels in `c.st`, named people in `c.staff`, applicants in `c.cand` (refreshed every 28 days). Hiring pays a signing fee (+ half the old one's fee as compensation).
- 訓練: team building `TEAMB` (cohesion `c.coh`, default 60 = no effect; match factor 1 + (coh − 60)/1500 via `lifeF()` in `sideRatings`), individual training `d.tf` (加操 / 休養 / 學新位置 → learned positions `d.p2x`, used by `fitP`).
- 傳媒: pre-match press conference (from 3 days before, once per fixture; `pressQs`/`pressApply` → `G.mot` motivation % for that fixture), statements `STATE` every 14 days.
- 宣傳: fans `c.fans` (default = rep; above rep raises gate/merch/sponsorship), club campaigns `PROMO`, player promotion `PPROMO`, popularity `d.pop` (stars ≥70, superstars ≥85: extra merch, gate, higher wage demands, complain after 3 weeks without a game).
- Save: player fields 20–22 (pop×10, p2x, tf); club fields are stored as is.

## 7. 傳奇十一人 merged in (fm/xi.js + fm/xi-ui.js + fm/xi.css)
- Cards: `cardHTML(pid)` (the main game's card art; grade from ability via `GRADE`), card level `d.clv` 0–5 (+1 rating each; `effOf` adds it; packed field 23).
- 陣容 is a card board on a turf pitch (`SCREENS.squad` in xi-ui.js): drag cards between pitch, bench and the reserve list, or onto grass to move a position (custom formation via `moveSlot`). Team strength tiles come from `sideRatings` on a board side. The in-match tactics board shows the same cards.
- 默契加成 `chemMap`: nationality links in the eleven, +1 (3+ team-mates) / +2 (6+), for every club, added in `sideRatings`.
- 戰術風格 `TACP` (the main game's seven tactics): sets the sliders and adds `tacFit` att/def by how the players' attributes compare with their overall (user club only, `c.tac`).
- 球探抽卡: banner + pack opening overlay (`xPull`); own players can come out (a fifth of a grade's picks) as duplicate cards. Collection `G.cards {pid: copies}`; 卡冊 (`SCREENS.album`) with grade/line/search filters; upgrades and selling duplicates in the player sheet (`cardPanel`).
- Ability over time (fm/life.js): long injuries (≥25 days) may cost 1–3 ability for good (`injuryToll`, older and longer = likelier, physio helps); at season end players 23 or under get −1…+2 by playing-time share (`playBonus`); players who were in your squad keep a record (`d.skc` current season, `d.skh` last 15 seasons; packed field 24) shown as 能力紀錄 in the player sheet, and a 球員能力變化 mail at season end.
- Youth stand-ins (青年軍): `fillYouth` uses `lineShort`, where wingers/forwards beyond the three a club needs also count as midfielders; `trimYouth()` (on load) drops stand-ins a club no longer needs. Five quick taps on the club badge (top left) toggle unlimited money `G.inf`.
- 合約 (xi-ui.js): sortable columns (`CTCOL`), 解約 with a confirm click (`releasePlayer`: half the remaining wages), 青年軍 for players 21 or under (`d.yt`, packed field 25: not `avail` for first-team selection, counts as regular playing time in `playBonus`, youth coach ×1.5; cleared when the player changes club).
- 青年軍 (xi.js youth academy + `SCREENS.youth`): made-up prospects (`makeProspect`, `G.y[pid].pro`, hidden potential `pot`, seen through the youth coach as `potSeen`), 6 at a new game and 3–5 every season start (`youthSeason`), academy level `c.ya` 1–5, a weekly youth game with results `c.yr` and growth towards potential (`youthWeek`). Generated players now get real-sounding names (`youthName`).
- Squad limit `SQMAX` 45 active players: scout pulls beyond it sign as 超額 extras (`d.xs`, packed field 26, not `avail`), registered automatically when a place frees (`fillExtras`, called from `movePlayer`) or by hand. 合約 has a one-click release mode (`UI.ct.mass`: every row click releases).
- 球探抽卡 pools (`gachaPool(o)`, `gachaPull(n, o)`): 當代球員 or 傳奇球星 (`fm/legends.js`, built from index.html by `node tools/fm-legends.js`; card id `L<index>`, made into a player aged 27 on first pull by `makeLegend`; legends whose full name is a real player of the era are left out), filtered by nation, line, league and 新星 (21 or under). Legends cost ×3, filtered pools ×1.5; a grade the pool lacks falls to the next one. The album has the same 當代 / 傳奇 switch. Re-run tools/fm-legends.js after adding players to index.html (only append there, so ids stay stable).
- 合約 one-click mode also releases by condition (ability below N, optionally older than M, youth team only if ticked; confirm click shows count and total compensation).
- Card grade is position-aware (`gradeP` / `gradeOf` in core.js: keepers and defenders +2, DM/CM +1 before the GRADE bands), and tools/fm-legends.js has a `UR_DESIGN` list of career-mode UR legends in goal, defence and midfield (40 UR legends in all).
- Youth competitions (xi.js `youthWeek`): U18 and U21 leagues (double round robin against your league's clubs' youth sides, `c.yc`), U18 青年足總盃 knockout (`YCUP`), separate line-ups `c.yl[t]` (`yAuto` picks best pairs; an empty place is an unnamed academy kid at `yFill`), youth appearances `c.yap` count for season-end growth. Squad screen's reserve list can be filtered by line or position.
