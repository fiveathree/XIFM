// node tools/fm-check-data.js fm/data/eng1.js  — validates a data file against DATA_SPEC.md
const fs=require('fs');const POS=new Set('GK RB LB CD DM CM RM LM AM ST'.split(' '));
let errs=0;const out=[];
global.FM={addLeague(L){
  const ids=new Set(),names=new Map();let n=0;
  for(const c of L.clubs){if(c.ref){out.push('ref '+c.ref);continue}
    if(ids.has(c.id)){out.push('dup club id '+c.id);errs++}ids.add(c.id);
    for(const k of ['id','name','short','country','stadium','cap','col','rep','bank','p'])if(c[k]==null){out.push(c.id+' missing '+k);errs++}
    const gk=c.p.filter(p=>p[2]==='GK').length;
    for(const p of c.p){n++;
      const bad=!Number.isInteger(p[0])||typeof p[1]!=='string'||!POS.has(p[2])||!/^[A-Z]{3}$/.test(p[3])||!(p[4]>=1950&&p[4]<=1996)||!(p[5]>=30&&p[5]<=95);
      if(bad){out.push('bad row '+c.id+' '+JSON.stringify(p));errs++}
      if(names.has(p[1])){out.push('dup player '+p[1]+' in '+names.get(p[1])+' & '+c.id);errs++}names.set(p[1],c.id);
    }
    out.push(`${c.id.padEnd(5)} ${String(c.p.length).padStart(2)} players, ${gk} GK, avg ${(c.p.reduce((t,p)=>t+p[5],0)/c.p.length).toFixed(1)}`);
  }
  out.unshift(`${L.id}: ${L.clubs.length} clubs, ${n} players`);
}};
require(require('path').resolve(process.argv[2]));
console.log(out.join('\n'));console.log(errs?`ERRORS: ${errs}`:'OK');process.exit(errs?1:0);
