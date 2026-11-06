// Correct stadium names and capacities for an era's clubs (the build tool copies them from older data).
// usage: node tools/fm-stadiums.js <era>      — only stadium and cap change, nothing else in the files
const fs = require('fs'), path = require('path');
const era = process.argv[2];
const FIX = {
  2004: {
    'Manchester City': ['City of Manchester Stadium', 47726], 'Porto': ['Estádio do Dragão', 50033], 'Benfica': ['Estádio da Luz', 65272], 'Sporting CP': ['Estádio José Alvalade', 50095],
    'Lille': ['Stadium Lille Métropole', 18185], 'Coventry City': ['Highfield Road', 23489], 'Huddersfield Town': ['Galpharm Stadium', 24500], 'Wigan Athletic': ['JJB Stadium', 25138],
  },
  2010: {
    'Porto': ['Estádio do Dragão', 50033], 'Juventus': ['Stadio Olimpico di Torino', 27994], 'Lille': ['Stadium Lille Métropole', 18185], 'Espanyol': ['Estadi Cornellà-El Prat', 40500],
    'Huddersfield Town': ['Galpharm Stadium', 24500], 'Wigan Athletic': ['DW Stadium', 25138], 'Benfica': ['Estádio da Luz', 65272], 'Sporting CP': ['Estádio José Alvalade', 50095],
  },
  2020: {
    'Manchester City': ['Etihad Stadium', 55017], 'Arsenal': ['Emirates Stadium', 60704], 'Liverpool': ['Anfield', 53394], 'Manchester United': ['Old Trafford', 74310], 'Chelsea': ['Stamford Bridge', 40343],
    'Tottenham Hotspur': ['Tottenham Hotspur Stadium', 62850], 'West Ham United': ['London Stadium', 60000], 'Everton': ['Goodison Park', 39414], 'Leicester City': ['King Power Stadium', 32261],
    'Brighton & Hove Albion': ['Amex Stadium', 31876], 'Brentford': ['Brentford Community Stadium', 17250], 'Bournemouth': ['Vitality Stadium', 11307], 'Wolverhampton Wanderers': ['Molineux Stadium', 31750],
    'Newcastle United': ["St James' Park", 52305], 'Aston Villa': ['Villa Park', 42657], 'Leeds United': ['Elland Road', 37792], 'Southampton': ["St Mary's Stadium", 32384], 'Crystal Palace': ['Selhurst Park', 25486],
    'Burnley': ['Turf Moor', 21944], 'Fulham': ['Craven Cottage', 22384], 'Sheffield United': ['Bramall Lane', 32050], 'West Bromwich Albion': ['The Hawthorns', 26688],
    'Huddersfield Town': ["John Smith's Stadium", 24500], 'Hull City': ['KCOM Stadium', 25586], 'Stoke City': ['bet365 Stadium', 30089], 'Bolton Wanderers': ['University of Bolton Stadium', 28723],
    'Wigan Athletic': ['DW Stadium', 25138], 'Swansea City': ['Liberty Stadium', 21088], 'Coventry City': ["St Andrew's", 29409], 'Reading': ['Madejski Stadium', 24161], 'Doncaster Rovers': ['Keepmoat Stadium', 15231],
    'Barcelona': ['Camp Nou', 99354], 'Real Madrid': ['Santiago Bernabéu', 81044], 'Atlético Madrid': ['Wanda Metropolitano', 68456], 'Real Sociedad': ['Reale Arena', 39500], 'Athletic Bilbao': ['San Mamés', 53289],
    'Valencia': ['Mestalla', 49430], 'Juventus': ['Allianz Stadium', 41507], 'Napoli': ['Stadio Diego Armando Maradona', 54726], 'Udinese': ['Dacia Arena', 25144], 'Atalanta': ['Gewiss Stadium', 21300],
    'Lyon': ['Groupama Stadium', 59186], 'Bordeaux': ['Matmut Atlantique', 42115], 'Lille': ['Stade Pierre-Mauroy', 50186], 'Nice': ['Allianz Riviera', 36178], 'Paris Saint-Germain': ['Parc des Princes', 47929],
    'Rennes': ['Roazhon Park', 29778], 'Lens': ['Stade Bollaert-Delelis', 38223], 'Marseille': ['Stade Vélodrome', 67394], 'Ajax': ['Johan Cruyff Arena', 55865], 'Porto': ['Estádio do Dragão', 50033],
    'Benfica': ['Estádio da Luz', 64642], 'Sporting CP': ['Estádio José Alvalade', 50095], 'Galatasaray': ['Türk Telekom Stadium', 52280], 'Beşiktaş': ['Vodafone Park', 42590], 'Fenerbahçe': ['Ülker Stadyumu', 47834],
    'Trabzonspor': ['Medical Park Stadyumu', 40782], 'Bayern Munich': ['Allianz Arena', 75024], 'Borussia Dortmund': ['Signal Iduna Park', 81365], 'Schalke 04': ['Veltins-Arena', 62271], 'Bayer Leverkusen': ['BayArena', 30210],
    'VfL Wolfsburg': ['Volkswagen Arena', 30000], 'Borussia Mönchengladbach': ['Borussia-Park', 54057], 'Eintracht Frankfurt': ['Deutsche Bank Park', 51500], 'VfB Stuttgart': ['Mercedes-Benz Arena', 60449],
    'Hertha BSC': ['Olympiastadion', 74475], 'Mainz 05': ['Opel Arena', 34000], 'SC Freiburg': ['Schwarzwald-Stadion', 24000], '1. FC Köln': ['RheinEnergieStadion', 50000], 'Werder Bremen': ['Weserstadion', 42100],
    'Arminia Bielefeld': ['SchücoArena', 27300], 'Celtic': ['Celtic Park', 60411], 'Rangers': ['Ibrox Stadium', 50817], 'Club Brugge': ['Jan Breydel Stadium', 29062],
  },
};
FIX[2025] = Object.assign({}, FIX[2020], {
  'Manchester City': ['Etihad Stadium', 61470], 'Liverpool': ['Anfield', 61276], 'Everton': ['Hill Dickinson Stadium', 52888], 'Fulham': ['Craven Cottage', 29589], 'West Ham United': ['London Stadium', 62500],
  'Hull City': ['MKM Stadium', 25586], 'Reading': ['Select Car Leasing Stadium', 24161], 'Bolton Wanderers': ['Toughsheet Community Stadium', 28723], 'Wigan Athletic': ['Brick Community Stadium', 25138],
  'Swansea City': ['Swansea.com Stadium', 21088], 'Coventry City': ['Coventry Building Society Arena', 32609], 'Doncaster Rovers': ['Eco-Power Stadium', 15231], 'Sunderland': ['Stadium of Light', 49000],
  'Nottingham Forest': ['City Ground', 30404], 'Barcelona': ['Spotify Camp Nou', 45401], 'Real Madrid': ['Santiago Bernabéu', 83186], 'Atlético Madrid': ['Riyadh Air Metropolitano', 70460],
  'Espanyol': ['RCDE Stadium', 40000], 'Udinese': ['Bluenergy Stadium', 25144], 'Atalanta': ['Gewiss Stadium', 24950], 'Galatasaray': ['RAMS Park', 52280], 'Beşiktaş': ['Tüpraş Stadyumu', 42590],
  'Fenerbahçe': ['Şükrü Saracoğlu Stadium', 47834], 'Trabzonspor': ['Papara Park', 40782], 'VfB Stuttgart': ['MHPArena', 60449], 'Mainz 05': ['Mewa Arena', 33305], 'SC Freiburg': ['Europa-Park Stadion', 34700],
  'Hamburger SV': ['Volksparkstadion', 57000], 'Leeds United': ['Elland Road', 37645], 'Burnley': ['Turf Moor', 21944], 'Southampton': ["St Mary's Stadium", 32384], 'Leicester City': ['King Power Stadium', 32259],
});
const fix = FIX[era]; if (!fix) { console.log('no fixes for era ' + era); process.exit(0); }
const dir = path.join('fm/data', era); let n = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const fp = path.join(dir, f); let s = fs.readFileSync(fp, 'utf8');
  for (const [name, [st, cap]] of Object.entries(fix)) {
    const re = new RegExp('(name:' + JSON.stringify(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',[^\\n]*?stadium:)"[^"]*", cap:\\d+');
    if (re.test(s)) { s = s.replace(re, `$1${JSON.stringify(st)}, cap:${cap}`); n++; }
  }
  fs.writeFileSync(fp, s);
}
console.log(`era ${era}: ${n} stadiums set`);
