// Checks the card data in index.html and that no existing card ID changed.
// usage: node tools/check-data.js <old index.html> <new index.html>
//   e.g. git show HEAD:index.html > old.html && node tools/check-data.js old.html index.html
const fs=require('fs');
function load(f){
  const src=fs.readFileSync(f,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ================== STATE')[0];
  // every version map applied with P.forEach(p=>{if(MAP[p[0]])...}) — MOREV, V2526, and any later season block
  const maps=[...src.matchAll(/P\.forEach\(p=>\{if\((\w+)\[p\[0\]\]\)/g)].map(m=>m[1]);
  return new Function(src+`;return{P,CARDS,NATN,BYID,maps:{${maps.join(',')}}}`)();
}
const A=load(process.argv[2]),B=load(process.argv[3]);
const errs=[];
A.CARDS.forEach(c=>{const d=B.BYID[c.id];if(!d||d.name!==c.name||d.season!==c.season||d.club!==c.club||d.r!==c.r)errs.push(`ID CHANGED ${c.id} ${c.name} ${c.season}`)});
Object.entries(B.maps).forEach(([m,o])=>Object.keys(o).forEach(k=>{const n=B.P.filter(p=>p[0]===k).length;if(n!==1)errs.push(`${m} key matches ${n} players: ${k}`)}));
const names=B.P.map(p=>p[0]);names.forEach((n,i)=>{if(names.indexOf(n)!==i)errs.push('DUP NAME '+n)});
const POS='GK CB LB RB CDM CM CAM LM RM LW RW ST'.split(' ');
const added=B.CARDS.filter(c=>!A.BYID[c.id]);
B.CARDS.forEach(c=>{if(!B.NATN[c.nat])errs.push(`NAT ${c.nat} ${c.name}`);if(!POS.includes(c.pos))errs.push(`POS ${c.pos} ${c.name}`)});
added.forEach(c=>{if(c.r>100||c.r<50)errs.push(`RATING ${c.r} ${c.name}`);if(!/^(\d{4}\/\d{2}|\d{4})$/.test(c.season))errs.push(`SEASON ${c.season} ${c.name}`)});
B.P.forEach(p=>{const s=p[3].map(v=>v[0]);s.forEach((x,i)=>{if(s.indexOf(x)!==i)errs.push(`DUP SEASON ${p[0]} ${x}`)})});
const g={};B.CARDS.forEach(c=>g[c.g]=(g[c.g]||0)+1);
console.log('cards',A.CARDS.length,'->',B.CARDS.length,'| players',A.P.length,'->',B.P.length,'|',JSON.stringify(g));
console.log(errs.length?errs.join('\n'):'ALL CHECKS PASSED');
process.exit(errs.length?1:0);
