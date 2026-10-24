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

No build step, no dependencies, no framework. Plain DOM + template strings. Only external resource is Google Fonts (Saira Condensed, Noto Sans TC).

The game was first published as a claude.ai Artifact. The page boots through `window.claude?.hot?.ready ...` and calls `window.claude?.hot?.snapshot` — these are optional-chained no-ops outside the Artifact viewer. Leave them or remove them; nothing else depends on them.

## Layout of `index.html` (search the section banners)

```
<style>                    design tokens on :root, dark-only theme (color-scheme: dark)
PLAYER DATABASE            const P = [...]  original players
EXPANSION                  MOREV (extra versions for existing players) + P.push(...) new players + NATN additions
grade / CARDS / BYID / POOL / DUPV   derived card list
POSITIONS                  LINE, NEAR, ADJ, fit(), slotPos(), FORMS
TEAMS                      LEAGUES, NATCODE, LEGSC, DIFF, oppScorers()
PLAYER ATTRIBUTES          stats(), PROF, ST_OUT / ST_GK
TACTICS                    TAC, tacticFx()
STATE                      KEY='legendxi-v1', fresh(), save(), load()
HELPERS                    $, esc, cardHTML(), toast, setCoins (+ secret-code handler near the tab binding)
TEAM EVAL                  evalTeam()  → per-slot effective ratings, chemistry, att/mid/def/ovr
VIEWS                      go(), render() → rSquad / rGacha / rAlbum / rLeague
MATCH ENGINE               poisson, xg, simGoals, buildEvents, playMatch, reward
LEAGUE                     roundRobin, startLeague, nextRound, standings
BOOT                       boot(): load state, starter pack on first run, render
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

- **Only append.** Add new players at the end of `P` (or via `P.push`), and new versions at the end of a player's version list (or via `MOREV`).
- **Never** insert, reorder or delete players or versions; never reorder `MOREV` application. Doing so silently swaps or breaks everyone's collection.
- Changing a rating, club name or season text in place is fine (the ID doesn't change), but changing a rating across the 100 line changes UR status.
- Duplicate player names are not allowed (check before adding).
- UR (>100) is reserved for one prime-legend card per player; currently 11: Pelé, Maradona, Cruyff, Di Stéfano, Beckenbauer, Ronaldo Nazário, Zidane, Ronaldinho, Maldini, Messi, C. Ronaldo.

Quick sanity script (Node):

```bash
python3 -c "import re;s=open('index.html').read();open('/tmp/x.js','w').write(re.findall(r'<script>(.*?)</script>',s,re.S)[0])"
node --check /tmp/x.js
node -e "const s=require('fs').readFileSync('/tmp/x.js','utf8').split('/* ================== STATE')[0];eval(s+';const g={};CARDS.forEach(c=>g[c.g]=(g[c.g]||0)+1);console.log(CARDS.length,g);const n=P.map(p=>p[0]);console.log(\"dup names\",n.filter((x,i)=>n.indexOf(x)!==i));console.log(\"missing NAT\",[...new Set(CARDS.map(c=>c.nat))].filter(x=>!NATN[x]))')"
```

## Game rules (where to tune)

**Gacha** — `RATES` (UR 0.6 / SSR 4 / SR 14 / R 33 / C 48.4 %). Single 100, ten-pull 900; 10th card re-rolled to SR+ if none in the batch (`rollGrade(true)`: UR 3 / SSR 20 / SR 77). Duplicates refund `DUPV` (C 10, R 30, SR 120, SSR 500, UR 3000).

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

**Match** — `xg(att, def) = 1.35·e^((att−def)/10)` clamped [0.15, 4.5], × both sides' tempo; goals are Poisson. Home side +1.5. AI team uses one rating for att and def, plus difficulty offset (`DIFF`: 新手 −18, 職業 −9, 世界級 0). Scorers weighted by position and `(eff/80)^3`. The 90-minute feed ticks every 55 ms; "跳到完場" skips.

**Rewards** — win 300 / draw 120 / loss 60 + 20 per goal; friendlies ×0.5. Season-end bonus by finishing position (3000, 1800, 1200, 800, 500, 300, 200, 100, 50) × difficulty (0.5 / 1 / 2). Minimum 7 players to kick off.

**Leagues** — `LEAGUES` entries `{n, e, teams: [[name, rating], ...]}` (8 AI teams each + the user → 18 rounds). `legend` league uses `LEGSC` for named scorers; national teams map through `NATCODE`.

**New game** — 3000 coins + 17-card starter pack (1 attacking SR, rest C/R) and an auto-picked XI.

**Secret codes** — tap `.logo` 5× within ~700 ms gaps → modal. `GOAT` toggles `S.inf` (unlimited coins: display ∞, pulls free); `SIUUU` +100,000.

## State shape (`localStorage['legendxi-v1']`)

```js
{ coins, inf?, owned: {cardId: count}, team, form, tactic?,
  slots: [{x, y, c: cardId|null} ×11], diff,
  league: null | {k, diff, teams, rounds, round, table, log, done?},
  stats: {pulls, w, d, l}, starter: true }
```

When adding fields, give them defaults at read time (`S.tactic || 'balanced'` pattern) so old saves keep working. If a change is incompatible, bump `KEY` (this wipes everyone's progress — ask the user first).

## Design

Floodlit night-match look: navy `--night` background, amber `--amber` accent, chalk-white text; Saira Condensed for numbers/display, Noto Sans TC for body. Card grade colours: C grey, R blue, SR purple, SSR gold, UR animated iridescent. Must stay usable at ~400 px phone width (pitch and cards scale with `clamp()`); respect `prefers-reduced-motion`.

## Ideas not done yet

- Real player photos / club badges (licensing — currently text only)
- Substitutions, injuries, fatigue; second-half tactic changes
- Player upgrade / merge duplicates instead of auto-refund
- Cups / knockout tournaments, multiple saved squads
- Cloud save (would need a backend, e.g. Cloudflare Worker + KV)
- Data for 2025/26 season and later transfers
