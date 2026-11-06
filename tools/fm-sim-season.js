newGame('Test','eng1.liv',1);
while(G.day<dn(2002,5,20)+off(G.era)) nextDay();
let g=0,n=0,hw=0,dr=0;for(const f of G.fx)if(f.hg!=null&&G.comp[f.c].t==='L'){n++;g+=f.hg+f.ag;if(f.hg>f.ag)hw++;if(f.hg==f.ag)dr++}
console.log('era',G.era,'leagues',G.plg.join(' '),'| goals/game',(g/n).toFixed(2),'home %',(hw/n*100).toFixed(0),'draw %',(dr/n*100).toFixed(0));
for(const l of ['eng1','esp1','eng3']){const pl=G.lgm[l].flatMap(c=>roster(c)).sort((a,b)=>pd(b).s.gl-pd(a).s.gl).slice(0,5);console.log(l,pl.map(p=>ps(p).sn+' '+pd(p).s.gl+'/'+pd(p).s.ap).join(', '))}
console.log('champions',G.plg.map(l=>l+':'+clubShort(standings(G.comp[l].tab)[0].c)).join(' '));
console.log('unplayed league games',G.fx.filter(f=>G.comp[f.c].t==='L'&&f.hg==null).length,'| cups won',Object.values(G.comp).filter(c=>c.t!=='L').map(c=>c.id+':'+(c.win?clubShort(c.win):'-')).join(' '));
