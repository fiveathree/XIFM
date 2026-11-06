// Usage: node tools/fm-sim.js tools/fm-sim-season.js  (run from repo root) — bundles data + fm/core.js + fm/match.js and runs the given test script
const fs=require('fs'),vm=require('vm');
const files=['eng1','eng2','eng3','eng4','sco1','esp1','ita1','ger1','fra1','eur'].map(f=>'fm/data/'+f+'.js');
let src='var FM={leagues:[],seasons:{},addLeague(L){this.leagues.push(L)},addSeason(y,p){this.seasons[y]=p}};var localStorage={s:{},getItem(k){return this.s[k]??null},setItem(k,v){this.s[k]=v},removeItem(k){delete this.s[k]}};\n';
for(const f of [...files,'fm/core.js','fm/match.js'])src+=fs.readFileSync(f,'utf8').replace(/if \(typeof module[^\n]*\n/,'')+'\n';
src+=fs.readFileSync(process.argv[2],'utf8');
vm.runInThisContext(src,{filename:'bundle.js'});
