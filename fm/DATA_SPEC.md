# FM 2001/02 data file spec

Each file `fm/data/<leagueId>.js` contains exactly one call:

```js
FM.addLeague({
  id:'eng1',            // league id (given in your brief)
  country:'ENG',        // FIFA code of the league's country ('EUR' for the guest file)
  name:'英超',           // Chinese name (given)
  ename:'Premier League',
  tier:1,               // given
  clubs:[
    {id:'ars', name:'Arsenal', short:'ARS', country:'ENG', stadium:'Highbury', cap:38419,
     col:['#EF0107','#FFFFFF'], rep:92, bank:15,
     p:[
       [1,'David Seaman','GK','ENG',1963,82],
       [14,'Thierry Henry','ST','FRA',1977,90],
       [8,'Fredrik Ljungberg','RM','SWE',1977,82,'F. Ljungberg'],
     ]},
  ]
});
```

Club fields
- `id`: lowercase 3–5 letters, unique within the file.
- `name`: common English name. `short`: 3-letter uppercase abbreviation.
- `country`: FIFA code of the club's country.
- `stadium`, `cap` (2001/02 capacity, integer).
- `col`: [primary, secondary] kit colours as hex.
- `rep`: club reputation 1–100 (Man United/Real Madrid ≈ 95, mid-table Premier League ≈ 70, Division Three ≈ 25–35).
- `bank`: approximate cash in £ millions (number, may be decimal).

Player row: `[shirtNo, fullName, pos, nat, birthYear, skill, shortName?]`
- `shirtNo`: real 2001/02 squad number if known, else 0.
- `fullName`: proper spelling with accents.
- `pos` — exactly one of: `GK RB LB CD DM CM RM LM AM ST`
  (CD = centre-back, DM = defensive mid, AM = attacking mid / second striker, wingers → RM/LM).
- `nat`: FIFA 3-letter code (ENG SCO WAL NIR IRL FRA GER ESP ITA NED BEL POR BRA ARG URU ...).
- `birthYear`: 4-digit year.
- `skill`: integer 30–95, FM 2001/02-style overall for the 2001/02 season (calibration below).
- `shortName` (optional): only when the automatic "First-initial. Rest" form is wrong,
  e.g. mononyms ('Rivaldo'), compound names ('J.S. Verón'), Spanish double surnames.

## Skill calibration (one scale across all leagues)
- 92–94: best in the world 2001/02 (Zidane 93, Figo 92, Rivaldo 91, Raúl 91)
- 88–90: world class (Henry 90, Van Nistelrooy 88, Vieira 88, Beckham 88, Batistuta 88, Shevchenko 90, Nedvěd 89, Buffon 89)
- 84–87: international stars (Owen 87, Keane 87, Scholes 86, Giggs 85, Hyypiä 84, Larsson 87)
- 78–83: strong top-flight starter at a big club (Gerrard 82, Lampard 79, Heskey 76 is a regular starter)
- 72–78: normal Premier League / Serie A / La Liga first-teamer at a mid-table club
- 64–71: top-flight squad player; Division One stand-out
- 58–66: Division One regular; SPL non-Old-Firm regular
- 52–60: Division Two regular
- 46–55: Division Three regular
- 38–50: youth/reserve prospects
Use the player's level IN 2001/02 (age-appropriate: a 17-year-old future star is still 50–62).

## Accuracy rules
- Squads as at the start of the 2001/02 season (after the summer 2001 transfer window, about 1 September 2001).
- Only real players who were registered with that club then. If you are not reasonably sure a player was there in 2001/02, leave him out. Wrong players are worse than missing ones.
- No player may appear at two clubs in your file.
- Target squad sizes: top flights 22–28; Division One 18–25; Divisions Two/Three as many as you genuinely recall (aim 14+). Include at least 2 GK per club where you can.
- Players on loan elsewhere for the whole season belong at the club they played for.

## Eras (start seasons) and the extra leagues

- Each start season has its own folder and entry in `fm/eras.js`: 2001/02 lives in `fm/data/*.js` (the original files), the others in `fm/data/<year>/` (1994, 1998, 2004, 2010). A page loads one era's files; switching era reloads `fm.html?era=YYYY`.
- League ids are the same in every era: `eng1 eng2 eng3 eng4 sco1 esp1 ita1 ger1 fra1 ned1 por1 tur1 bel1` plus `eur` (18 guest clubs from countries without a league in the game). League size may differ by era (1994/95 Premier League 22, Scottish top flight 10, Portugal/Belgium 16 in 2010/11); the calendar adapts.
- Money uses the same scale in every era (no inflation adjustment).
- `{ref:"eur.aja"}` inside a league's `clubs` moves an already-defined club (and its player ids) into that league. Used in 2001/02, where Ajax, PSV, Feyenoord, Porto, Benfica, Sporting, Boavista, Galatasaray, Fenerbahçe, Anderlecht and Club Brugge were first written as guest clubs.
- Same accuracy rule as above: a club or player we are not reasonably sure of is left out. Thin clubs are padded at game start with `XXX 青年軍 n` players at a level based on the club's reputation (`fillYouth()`).

### Building an era from a compact source

`node tools/fm-build-era.js <source.txt> <year>` writes `fm/data/<year>/*.js`. Source format (one item per line):

```
@eng1|英超|Premier League|1                  league: id|Chinese|English|tier
=Manchester United|94|30                      club: name|rep|bank (£m); stadium, capacity, colours, short and id come from the 2001/02 club of the same name
=Blackpool|56|2|BLA|Bloomfield Road|16220|#F68712,#FFFFFF     …or in full: |short|stadium|cap|col1,col2
=Basel|70|8|BAS|St. Jakob-Park|38512|#C8102E,#0060A9|SUI      guest club: add its country code
GK Edwin van der Sar NED 1970 84             player: pos name nation birthYear skill
ST Ronaldo BRA 1976 92 /Ronaldo               optional short name after " /"
```

The tool refuses to write if a player name appears twice in the era (two real players with one name need distinct full names, e.g. `Paul P. Robinson`), if a club is unknown without full details, or if a row is malformed. Once an era is published, only append to its files (saves store player ids).
