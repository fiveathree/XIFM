# CLAUDE.md — XIFM 傳奇十一人

Football-manager × gacha web game. UI language is Cantonese (Traditional Chinese, 粵語口語). Keep all player-facing text in that register.

## The user

- Not a programmer. Explain any setup they must do themselves step by step from the start, with current, exact button/menu names.
- Commits are made as `fiveathree <fiveathree@gmail.com>`; push to `main`.

## Files

| File | Role |
|---|---|
| `index.html` | The whole game: HTML + CSS + JS in one file. **This is the source of truth.** |
| `favicon.svg` | Standalone copy of the favicon (the page embeds it inline as a data URI in `<head>`). |
| `README.md` | Player-facing description (Cantonese). |
| `tools/check-data.js` | Data / card-ID stability check (see below). Not loaded by the game. |

No build step, no dependencies, no framework. Plain DOM + template strings. Only external resource is Google Fonts (Saira Condensed, Noto Sans TC).

The game was first published as a claude.ai Artifact. The page boots through `window.claude?.hot?.ready ...` and calls `window.claude?.hot?.snapshot` — these are optional-chained no-ops outside the Artifact viewer. Leave them or remove them; nothing else depends on them.

## Layout of `index.html` (search the section banners)

```
<style>                    design tokens on :root, dark-only theme (color-scheme: dark)
PLAYER DATABASE            const P = [...]  original players
EXPANSION                  MOREV (extra versions for existing players) + P.push(...) new players + NATN additions
2025/26 SEASON             V2526 (2025/26 versions appended to existing players) + P.push(...) new players + NATN
grade / CARDS / BYID / POOL / DUPV   derived card list
POSITIONS                  LINE, NEAR, ADJ, fit(), slotPos(), FORMS
TEAMS                      LEAGUES, NATCODE, LEGSC, DIFF, oppScorers()
PLAYER ATTRIBUTES          stats(), PROF, ST_OUT / ST_GK
TACTICS                    TAC, tacticFx()
STATE                      KEY='legendxi-v1', fresh(), save(), load(), migrate() (defaults for newer fields)
HELPERS                    $, esc, cardHTML(), toast, setCoins, stamina/injury helpers, LVMAX/BENCH/MAXSUB/UPC
TEAM EVAL                  evalTeam(slots?, stamina?)  → per-slot effective ratings, chemistry, att/mid/def/ovr
VIEWS                      go(), render() → rSquad (pitch, bench, presets) / rGacha / rAlbum (+ upgrade/sell) / rLeague
MATCH ENGINE               poisson, xg, simGoals, shootout, userSide, power, afterMatch, playMatch, reward
LEAGUE                     roundRobin, startLeague, nextRound, standings, rLeague (league / cup switch, friendly)
CUP                        CUPS, startCup, cupAdvance, cupNext, rCup
BOOT                       boot(): load + migrate state, starter pack on first run, render
```

## Player data format

```js
['Full Name', 'POS', 'NAT', [[season, club, rating], ...], 'Short name (optional)']
```

- `POS`: one of `GK CB LB RB CDM CM CAM LM RM LW RW ST`
- `NAT`: 3-letter code; must exist in `NATN` (code → Chinese name). Add new codes to the `Object.assign(NATN, {...})` call.
- `season`: `'2011/12'` for club seasons, `'2022'` for tournaments / calendar-year leagues. Display shortens `2011/12` → `11/12`.
- `club`: club or national-team name. Matching club names give chemistry, and `oppScorers()` uses them to name AI goal scorers, so keep spellings consistent (e.g. always `Man United`, `Bayern Munich`, `PSG`).
- `rating`: 50–105. Grade is derived: `>100 UR`, `>=90 SSR`, `>=80 SR`, `>=70 R`, else `C`.

### ⚠️ Card IDs must stay stable

A card's ID is `${playerIndex}-${versionIndex}` and is what players' saves store (`S.owned`, `S.slots[].c`). Therefore:

- **Only append.** Add new players at the end of `P` (or via `P.push`), and new versions at the end of a player's version list (or via a version map).
- **Never** insert, reorder or delete players or versions; never reorder the version-map blocks (`MOREV`, then `V2526`). Doing so silently swaps or breaks everyone's collection.
- For a new season, add a **new block after the last one** (just before `const grade=`), same shape as the 2025/26 block: `const V2627={'Exact Name':[[season, club, rating]]}; P.forEach(p=>{if(V2627[p[0]])p[3].push(...V2627[p[0]])}); P.push(...new players); Object.assign(NATN,{...})`. Don't edit earlier blocks' order.
- Changing a rating, club name or season text in place is fine (the ID doesn't change), but changing a rating across the 100 line changes UR status.
- Duplicate player names are not allowed (check before adding).
- UR (>100) is reserved for one prime-legend card per player; currently 11: Pelé, Maradona, Cruyff, Di Stéfano, Beckenbauer, Ronaldo Nazário, Zidane, Ronaldinho, Maldini, Messi, C. Ronaldo.

Data check (Node) — run after any data change, before committing. It compares against the last commit and fails if any existing card ID now points at a different card, if a version-map name matches no player, or on duplicate names, unknown nations/positions, ratings outside 50–100 for new cards, or a repeated season for one player:

```bash
git show HEAD:index.html > /tmp/old.html && node tools/check-data.js /tmp/old.html index.html
```

Currently 1308 cards (UR 11 · SSR 144 · SR 397 · R 614 · C 142), 793 players. Also syntax-check the script:

```bash
node -e "const s=require('fs').readFileSync('index.html','utf8');require('fs').writeFileSync('/tmp/x.js',s.match(/<script>([\s\S]*?)<\/script>/)[1])" && node --check /tmp/x.js
```

## Game rules (where to tune)

**Gacha** — `RATES` (UR 0.6 / SSR 4 / SR 14 / R 33 / C 48.4 %). Single 100, ten-pull 900; 10th card re-rolled to SR+ if none in the batch (`rollGrade(true)`: UR 3 / SSR 20 / SR 77). Duplicates are kept as spare copies (`S.owned[id] > 1`); they are sold for `DUPV` (C 10, R 30, SR 120, SSR 500, UR 3000) from the player sheet or the album's "sell all" button.

**Upgrades** — `S.lv[id]` 0–`LVMAX` (5). Level n→n+1 costs n+1 spare copies + `UPC[grade]×(n+1)` coins (free with `S.inf`). Each level gives +1 rating (`R(c)` = `c.r + lv`) and +1 to every attribute. Grade stays that of the base card. Use `R(c)` (not `c.r`) anywhere strength matters.

**Positions** — `slotPos(x,y)` maps a pitch slot's % coordinates (y=0 is the opponent goal) to a position, so dragging a card changes its role. `fit(cardPos, slotPos)`: same 1.0, `NEAR` neighbour 0.93, same line 0.84, adjacent line 0.72, else 0.58, GK mismatch 0.35. Effective rating = `round(rating × fit) + chemistry`.

**Chemistry** — per player, count links (same club +1, same nation +1) to the other 10: ≥2 → +1, ≥4 → +2, ≥6 → +3.

**Team strength** (`evalTeam`) — empty slot counts as 25. `att` = 60% attackers avg + 40% midfield avg (+ line-count tweaks); `def` = 50% defenders + 25% GK + 25% midfield. One player cannot appear twice (different versions of the same `pi` are blocked).

**Attributes** (`stats(c)`) — six values derived from rating + `PROF[pos]` offset + a deterministic ±4 per-player tilt from a name hash. Not stored; same player keeps the same shape across eras. Outfield: 速度 射門 傳球 盤扭 防守 體能. GK: 撲救 手型 開球 反應 速度 站位. Capped at 99 except UR cards (cap = rating).

**Tactics** (`TAC`, `tacticFx`) — returns `{att, def, tempo}` bonuses. Stat-driven ones scale with a fit score `k` in [-4, 4]:
- 控球傳導 possession: avg 傳球 of outfield → att/def, tempo 0.85
- 高位壓迫 press: avg (速度+體能) → att, tempo 1.12
- 快速反擊 counter: attackers' 速度 → att, def +3
- 邊路傳中 wing: wide players' 速度 + ST 體能 → att, def −1
- 擺大巴 bus: att −6, def +6, tempo 0.8 · 全力進攻 allout: att +6, def −6, tempo 1.2

**Match** — `xg(att, def) = 1.35·e^((att−def)/10)` clamped [0.15, 4.5], × both sides' tempo. Home side +1.5 (none when `opts.neutral`). AI team uses one rating for att and def, plus difficulty offset (`DIFF`: 新手 −18, 職業 −9, 世界級 0). Scorers weighted by position and `(eff/80)^3`.
User matches (`playMatch`) run minute by minute (55 ms/tick): each minute re-rates the user's current lineup, rolls a goal for each side with p = xg·tempo/90, and drains stamina. Auto-pause at 45' (half-time panel); "換人 · 戰術" pauses any time. Up to `MAXSUB` (5) subs from the bench copy; subbed-off players can't return; the tactic can change mid-match (match-only, `S.tactic` unchanged). "跳到完場" runs the rest instantly, auto-subbing injuries. `opts.knockout`: a draw goes to `shootout()` (76 % per kick). AI-vs-AI games use the one-shot Poisson `simGoals`.

**Stamina & injuries** — `S.fit[id]` 0–100 (only values < 100 stored). Per minute on the pitch: outfield −(0.30 − (體能−60)·0.004) clamped [0.12, 0.36] × tempo; GK −0.1. Below 70: −1 rating per 4 points (`fatPen`). After each user match (`afterMatch`): players who played keep end stamina +12, everyone else +25 (a league bye counts as rest). Injury chance per player-minute 0.0001 (0.0002 below 55 stamina); an injured player leaves the pitch and misses 1–3 matches (`S.inj[id]`, counts down after each user match). Injured cards can't be picked; "自動排最強" skips them and allows for tiredness.

**Bench & presets** — `S.bench`: 7 card ids or null. Auto-pick fills it with the best keeper, defender, midfielder, attacker, then the best of the rest. `S.squads`: 3 presets `{form, tactic, slots, bench}`; loading drops cards no longer owned.

**Cups** (`CUPS`) — single-leg knockout on neutral ground. `ucl` takes the top 3 of each of the 5 club leagues (16 teams, prize ×1.5); the others take a league's top 7 + the user (8 teams). `S.cup.br` = rounds of ties `{a, b, ga, gb, pa?, pb?, w}`, team 0 = user. Once the user is out, the rest is simulated to show the champion. Prize by how far you got (`CUPPZ`: champion 4000, runner-up 2000, semi 1000, quarter 500, last 16 250) × difficulty (0.5 / 1 / 2).

**Rewards** — win 300 / draw 120 / loss 60 + 20 per goal (cup ties too, a shoot-out counts as a draw); friendlies ×0.5. Season-end bonus by finishing position (3000, 1800, 1200, 800, 500, 300, 200, 100, 50) × difficulty (0.5 / 1 / 2). Minimum 7 players to kick off.

**Leagues** — `LEAGUES` entries `{n, e, teams: [[name, rating], ...]}` (8 AI teams each + the user → 18 rounds), rated for 2025/26. Keep each list sorted strongest first: cups take teams by position. Team names should match card club names so AI goals get real scorers. Leagues/cups already in progress keep the copy of the teams they started with. `legend` league uses `LEGSC` for named scorers; national teams map through `NATCODE`.

**New game** — 3000 coins + 17-card starter pack (1 attacking SR, rest C/R) and an auto-picked XI.

**Secret codes** — tap `.logo` 5× within ~700 ms gaps → modal. `GOAT` toggles `S.inf` (unlimited coins: display ∞, pulls free); `SIUUU` +100,000.

## State shape (`localStorage['legendxi-v1']`)

```js
{ coins, inf?, owned: {cardId: count}, team, form, tactic?,
  slots: [{x, y, c: cardId|null} ×11], bench: [cardId|null ×7], diff,
  lv: {cardId: level}, fit: {cardId: stamina<100}, inj: {cardId: matchesLeft},
  squads: [null | {form, tactic, slots, bench} ×3],
  league: null | {k, diff, teams, rounds, round, table, log, done?},
  cup: null | {k, diff, teams, br, log, done: null|{stage, prize}, champ},
  stats: {pulls, w, d, l}, starter: true }
```

When adding fields, give them defaults in `migrate()` (or at read time, `S.tactic || 'balanced'` pattern) so old saves keep working. If a change is incompatible, bump `KEY` (this wipes everyone's progress — ask the user first).

## Design

Floodlit night-match look: navy `--night` background, amber `--amber` accent, chalk-white text; Saira Condensed for numbers/display, Noto Sans TC for body. Card grade colours: C grey, R blue, SR purple, SSR gold, UR animated iridescent. Must stay usable at ~400 px phone width (pitch and cards scale with `clamp()`); respect `prefers-reduced-motion`.

## Ideas not done yet

- Real player photos / club badges (licensing — currently text only)
- Cloud save (would need a backend, e.g. Cloudflare Worker + KV)
- Data for 2026/27 and the 2026 World Cup (then re-rate `LEAGUES` again)
- Red cards, two-legged ties, cup group stages, AI-side fatigue

Done: substitutions / injuries / fatigue / in-match tactic changes, player upgrades with duplicates, knockout cups, 3 saved squad presets, 2025/26 season data (versions + summer 2025 transfers).

Tip for testing the match engine without waiting: in the browser console, start a match and call `$('#mskip').click()`.
