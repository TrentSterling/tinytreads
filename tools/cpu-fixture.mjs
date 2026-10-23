// Shared deterministic real-engine fixture; only loaded by headless QA.
export const setup=`
window.qaSetup=(seed,kind='plain',difficulty='hard',names=['Laser','Single Shot'],count=2)=>{
 POCKET.pauseClock();settings.sound=false;settings.difficulty=difficulty;settings.layout='plain';settings.wind=false;settings.lowGravity=false;settings.series=1;settings.rule='classic';
 cleanupDeal();Net.leave();Party.leave();configure(false,'local');G.seed=seed;G.seedLabel=String(seed);seedRng(seed);resetSeries();
 players=Array.from({length:count},(_,i)=>makeTank(i,'Tank '+i));
 for(const p of players)p.inventory=names.map(n=>({w:byName.get(n),used:false}));
 beginBattle();G.mode=count>2?'brawl':'local';G.brawlLocal=true;
 if(kind!=='natural'){
 terrain.fill(0);for(let x=0;x<W;x++){const h=kind==='lower'&&x>600?480:400;for(let y=h;y<FH;y++)terrain[y*W+x]=1;}
 mark(0,W-1);refreshSurface();placeTanks();
 if(kind==='wall')rectTerrain(575,260,50,140,1);
 if(kind==='buried'){rectTerrain(players[0].x-40,players[0].y-70,80,80,1);players[0].buried=true;}
 if(kind==='close'){players[1].x=players[0].x+65;players[1].y=players[0].y;}
 }
 G.time=G.tick=G.quiet=G.shotAge=0;G.turn=0;G.aiAim=null;G.locked=false;G.awaiting=false;overlay(null);seedRng(seed);updateHud(true);
};
window.qaSelfHits=0;const qaScore=addScore;addScore=function(t,points,owner){if(t.i===owner&&points>0)qaSelfHits++;return qaScore(t,points,owner);};
window.qaShot=()=>{
 const before=POCKET.state,hash=POCKET.terrainHash(),self=qaSelfHits,started=performance.now();prepareCPU();const cost=performance.now()-started;
 const p=active(),name=currentWeapon().name,aim={...G.aiAim},decisionRng=rs>>>0;p.angle=aim.angle;p.power=aim.power;G.aiAim=null;
 if(!fireNow())throw Error('shot rejected');let steps=0;while(G.locked&&steps++<120*30)simStep(STEP);
 if(G.locked)throw Error('shot never settled');if(G.shots!==before.turnCount+1)throw Error('turn did not advance exactly once');if(G.stats.safetyTimeouts)throw Error('shot hit safety timeout');if(POCKET.validate().length)throw Error(POCKET.validate().join(','));
 return {seed:G.seed,name,aim,cost,decisionRng,points:history.at(-1)?.points,selfHits:qaSelfHits-self,terrainChanged:POCKET.terrainHash()!==hash,buriedBefore:before.players[before.currentPlayer].buried,buriedAfter:players[before.currentPlayer].buried,turn:G.shots,steps,safetyTimeouts:G.stats.safetyTimeouts};
};`;
