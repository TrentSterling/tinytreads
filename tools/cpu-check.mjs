// Deterministic real-engine probes. Own muted headless browser; no input injection.
import {launch, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=resolve(process.argv[2]||'index.html'),out=resolve(process.argv[3]||'tools/out/cpu.json');
const page=await launch();
const setup=`
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
 const p=active(),name=currentWeapon().name,aim={...G.aiAim};p.angle=aim.angle;p.power=aim.power;G.aiAim=null;
 if(!fireNow())throw Error('shot rejected');let steps=0;while(G.locked&&steps++<120*30)simStep(STEP);
 if(G.locked)throw Error('shot never settled');if(G.shots!==before.turnCount+1)throw Error('turn did not advance exactly once');if(G.stats.safetyTimeouts)throw Error('shot hit safety timeout');if(POCKET.validate().length)throw Error(POCKET.validate().join(','));
 return {seed:G.seed,name,aim,cost,points:history.at(-1)?.points,selfHits:qaSelfHits-self,terrainChanged:POCKET.terrainHash()!==hash,buriedBefore:before.players[before.currentPlayer].buried,buriedAfter:players[before.currentPlayer].buried,turn:G.shots,steps,safetyTimeouts:G.stats.safetyTimeouts};
};`;
const result={source,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),probes:[],matches:[],contracts:[]};
try{
 await page.init(`localStorage.setItem('tiny-treads-settings',JSON.stringify({sound:false}));localStorage.setItem('pocket-reforged-settings',JSON.stringify({sound:false}));`);
 await page.goto(pathToFileURL(source).href);await until(()=>page.eval('!!window.POCKET'),{label:'boot'});await page.eval(setup);
 result.version=await page.eval('POCKET.version');result.userAgent=await page.eval('navigator.userAgent');
 const modeled=await page.eval('typeof predictLaser === "function"');
 if(modeled){
  const beamOracle=await page.eval(`(()=>{const cases=[];for(const name of ['Laser','Super Laser'])for(const width of [0,50,250,600])for(const angle of [0,5,175,180]){
   qaSetup(100,'plain','hard',[name]);if(angle>90)G.turn=1;if(width)rectTerrain(300,260,width,140,1);
   const p=active(),w=currentWeapon(),before=[POCKET.terrainHash(),rs,G.time,G.stats.shots],q=predict(p,angle,100,w,true),after=[POCKET.terrainHash(),rs,G.time,G.stats.shots];
   p.angle=angle;p.power=100;fireNow();cases.push({name,width,angle,predicted:q.value,actual:G.shotPoints,pure:JSON.stringify(before)===JSON.stringify(after)});
  }return cases})()`);
  assert.ok(beamOracle.every(q=>q.pure&&q.predicted===q.actual),JSON.stringify(beamOracle.filter(q=>!q.pure||q.predicted!==q.actual)));
  result.contracts.push({name:'32 beam predictions match actual immediate scores without mutating terrain/RNG/time/shots',cases:beamOracle});
  const budget=await page.eval(`(()=>{qaSetup(123,'plain','hard',['Single Shot','Big Shot','Laser','Super Laser','Single Shot','Big Shot','Laser','Super Laser','Single Shot','Big Shot']);const old=predict;let calls=0;predict=(...a)=>{calls++;return old(...a)};try{prepareCPU()}finally{predict=old}return calls})()`);
  assert.ok(budget<=740,JSON.stringify({budget}));result.contracts.push({name:'decision prediction calls bounded with duplicate inventory',calls:budget,limit:740});
  const noise=await page.eval(`(()=>{const rows=[];for(const difficulty of ['easy','normal','hard']){let maxAngle=0,maxPower=0;for(let seed=1;seed<=30;seed++){qaSetup(seed,'plain',difficulty,['Single Shot']);const ideal=solveAim(active(),currentWeapon());prepareCPU();maxAngle=Math.max(maxAngle,Math.abs(G.aiAim.angle-ideal.angle));maxPower=Math.max(maxPower,Math.abs(G.aiAim.power-ideal.power));}rows.push({difficulty,maxAngle,maxPower});}return rows})()`);
  assert.ok(noise[0].maxAngle>4&&noise[1].maxAngle>1&&noise[2].maxAngle<=.401);assert.ok(noise[0].maxPower>6&&noise[1].maxPower>2&&noise[2].maxPower<=.801);
  result.contracts.push({name:'difficulty retains original aim noise',rows:noise});
 }
 for(const kind of ['plain','wall','lower','close','buried'])for(const seed of [1,2,3,4,5,6,7,8,9,10,11,12]){
  const names=kind==='buried'?['Single Shot','Well Digger','Jump Jets']:kind==='close'?['Big Shot','Sniper Rifle','Laser']:['Laser','Single Shot','Super Laser','Sniper Rifle'];
  result.probes.push({kind,...await page.eval(`qaSetup(${seed},${JSON.stringify(kind)},'hard',${JSON.stringify(names)});qaShot()`)});
 }
 if(modeled){
  assert.ok(result.probes.filter(p=>p.kind==='lower').every(p=>p.points>0&&!p.name.includes('Laser')));
  assert.ok(result.probes.filter(p=>p.kind==='wall').every(p=>p.name!=='Laser'));
  assert.ok(result.probes.filter(p=>p.kind==='close').every(p=>p.selfHits===0));
 }
 assert.ok(result.probes.filter(p=>p.kind==='buried').every(p=>p.buriedBefore&&!p.buriedAfter));
 const names=['Single Shot','Big Shot','Laser','Super Laser','Sniper Rifle','Well Digger','Jump Jets','Homing Missile','Laser Battery','Worm'];
 for(const difficulty of ['easy','normal','hard'])for(const seed of [41,42]){
  await page.eval(`qaSetup(${seed},'natural',${JSON.stringify(difficulty)},${JSON.stringify(names)})`);
  const shots=[];for(let i=0;i<20;i++)shots.push(await page.eval('qaShot()'));
  const state=await page.eval('POCKET.state');assert.equal(state.scene,'results');assert.equal(state.turnCount,20);assert.ok(state.players.every(p=>p.remaining===0&&p.shots===10));assert.equal(state.stats.safetyTimeouts,0);
  result.matches.push({seed,difficulty,count:2,shots,state});
 }
 for(const seed of [51,52]){
  await page.eval(`qaSetup(${seed},'natural','normal',${JSON.stringify(names)},4)`);
  const shots=[];for(let i=0;i<40;i++)shots.push(await page.eval('qaShot()'));
  const state=await page.eval('POCKET.state');assert.equal(state.scene,'results');assert.equal(state.turnCount,40);assert.ok(state.players.every(p=>p.remaining===0&&p.shots===10));assert.equal(state.stats.safetyTimeouts,0);
  result.matches.push({seed,difficulty:'normal',count:4,shots,state});
 }
 const repeated=[];for(let i=0;i<2;i++)repeated.push(await page.eval(`qaSetup(123,'wall','normal',['Single Shot','Big Shot','Laser','Super Laser']);JSON.stringify((({cost,...shot})=>shot)(qaShot()))`));assert.equal(repeated[0],repeated[1]);result.contracts.push({name:'fixed seed reproduces identical decision and shot',passed:true});
 const checkpoints=await page.eval(`(()=>{const rows=[];for(const count of [2,4]){qaSetup(456,'plain','normal',${JSON.stringify(names)},count);qaShot();const snap=count===2?Net.snapshot():Party.snapshot(),before={hash:POCKET.terrainHash(),scores:players.map(p=>p.score),shots:G.shots,inventory:POCKET.inventory()};if(count===2)Net.applySnapshot(snap);else Party.applyState(snap);const after={hash:POCKET.terrainHash(),scores:players.map(p=>p.score),shots:G.shots,inventory:POCKET.inventory()};rows.push({count,equal:JSON.stringify(before)===JSON.stringify(after)});}return rows})()`);
 assert.ok(checkpoints.every(q=>q.equal));result.contracts.push({name:'duel and party checkpoint round trips preserve changed terrain, scores, shots and inventory',rows:checkpoints});
 const autonomous=await page.eval(`(()=>{qaSetup(817,'natural','normal',${JSON.stringify(names)},4);players.forEach((p,i)=>p.bot=i>0);settings.wind=settings.lowGravity=true;setRoundWind();let steps=0;while(G.scene==='battle'&&steps++<120*800){if(!G.locked&&G.turn===0){const a=solveAim(active(),currentWeapon());active().angle=a.angle;active().power=a.power;fireNow();}simStep(STEP);}return POCKET.state})()`);
 assert.equal(autonomous.scene,'results');assert.equal(autonomous.turnCount,40);assert.equal(autonomous.stats.safetyTimeouts,0);assert.ok(autonomous.players.every(p=>p.shots===10&&p.remaining===0));result.contracts.push({name:'autonomous three-CPU brawl completes with wind and low gravity',state:autonomous});
 result.logs=page.logs.filter(s=>s.startsWith('EXCEPTION')||s.startsWith('error'));assert.deepEqual(result.logs,[]);
 const shots=[...result.probes,...result.matches.flatMap(m=>m.shots)],costs=shots.map(s=>s.cost).sort((a,b)=>a-b);
 result.summary={shots:shots.length,completeMatches:result.matches.length,selfHitShots:shots.filter(s=>s.selfHits>0).length,totalPoints:shots.reduce((n,s)=>n+s.points,0),terrainChangeShots:shots.filter(s=>s.terrainChanged).length,decisionMs:{p50:costs[Math.floor(costs.length*.5)],p95:costs[Math.floor(costs.length*.95)],max:costs.at(-1)}};
 console.log(JSON.stringify(result.summary,null,2));
}finally{mkdirSync(resolve(out,'..'),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2));await page.kill();}
