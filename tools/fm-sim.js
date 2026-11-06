// Usage: node tools/fm-sim.js tools/fm-sim-season.js  (run from repo root; FM_ERA=1994 picks another era)
// Bundles the era's data + fm/core.js + fm/match.js and runs the given test script.
const fs=require('fs'),vm=require('vm');
const era=+(process.env.FM_ERA||2001);
global.FM={leagues:[],seasons:{},era,addLeague(L){this.leagues.push(L)},addSeason(y,p){this.seasons[y]=p}};
global.localStorage={s:{},getItem(k){return this.s[k]??null},setItem(k,v){this.s[k]=v},removeItem(k){delete this.s[k]}};
vm.runInThisContext(fs.readFileSync('fm/eras.js','utf8'));
const E=FM.ERAS[era];if(!E)throw new Error('unknown era '+era);
let src='';
for(const f of [...E.files.map(f=>E.dir+f+'.js').filter(f=>fs.existsSync(f)),'fm/core.js','fm/match.js'])src+=fs.readFileSync(f,'utf8').replace(/if \(typeof module[^\n]*\n/,'')+'\n';
src+=fs.readFileSync(process.argv[2],'utf8');
vm.runInThisContext(src,{filename:'bundle.js'});
