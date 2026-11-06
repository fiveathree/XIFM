newGame('Test','eng1.liv',1);
while(G.day<dn(2002,5,12)) nextDay();
let g=0,n=0,hw=0,dr=0;for(const f of G.fx)if(f.hg!=null&&G.comp[f.c].t==='L'){n++;g+=f.hg+f.ag;if(f.hg>f.ag)hw++;if(f.hg==f.ag)dr++}
console.log('goals/game',(g/n).toFixed(2),'home %',(hw/n*100).toFixed(0),'draw %',(dr/n*100).toFixed(0));
for(const l of ['eng1','esp1','eng3']){const pl=G.lgm[l].flatMap(c=>roster(c)).sort((a,b)=>pd(b).s.gl-pd(a).s.gl).slice(0,5);console.log(l,pl.map(p=>ps(p).sn+' '+pd(p).s.gl+'/'+pd(p).s.ap).join(', '))}
const st=standings(G.comp.eng1.tab);console.log(st.slice(0,4).map(x=>clubShort(x.c)+' '+x.pts).join(' '));
