// Verify original-main Easy/Normal behavior and preserved Hard behavior in real play.
// Quick-battle setup and fresh seed corpus adapted from independent player-outcomes.mjs.
import {launch,until} from './cdp.mjs';
import {setup} from './cpu-fixture.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const paths=process.argv.slice(2);
assert.equal(paths.length,3,'Usage: node tools/cpu-difficulty-parity.mjs ORIGINAL_MAIN/index.html PRIOR_0c80efa/index.html index.html');
const out=resolve('tools/out/difficulty-parity');mkdirSync(out,{recursive:true});
const seeds=Array.from({length:128},(_,i)=>(Math.imul(0x27d4eb2d,i+1009)^0x165667b1)>>>0);
const shapes=[{id:'740-up8',distance:740,dy:-8},{id:'820-up2',distance:820,dy:-2},{id:'820-wind',distance:820,dy:0,wind:-16},{id:'780-lowGravity',distance:780,dy:0,lowGravity:true}];
const groups=shapes.flatMap(q=>['easy','normal','hard'].map(difficulty=>({...q,difficulty,seeds})));
const freshSetup=`window.dpSetup=q=>{qaSetup(q.seed,'plain',q.difficulty,['Single Shot','Big Shot','Laser','Super Laser']);const sx=190,tx=sx+q.distance;players[0].x=sx;players[1].x=tx;terrain.fill(0);for(let x=0;x<W;x++){const h=x>(sx+tx)/2?400+q.dy:400;for(let y=h;y<FH;y++)terrain[y*W+x]=1;}mark(0,W-1);refreshSurface();for(const p of players){p.y=surface[Math.round(p.x)];p.vx=p.vy=0;}settings.wind=!!q.wind;G.wind=q.wind||0;settings.lowGravity=!!q.lowGravity;seedRng(q.seed);};`;
const battleSetup=`window.dpBattle=(seed,difficulty,layout,wind,lowGravity)=>{
 POCKET.pauseClock();Net.leave();Party.leave();cleanupDeal();G.time=G.tick=0;settings.sound=false;settings.difficulty=difficulty;settings.layout=layout;settings.wind=wind;settings.lowGravity=lowGravity;settings.pool='classic';settings.series=1;settings.rule='classic';
 const clock=Date.now,rng=Math.random;try{Date.now=()=>seed;Math.random=()=>0;dealQuick();}finally{Date.now=clock;Math.random=rng;}POCKET.advance(12,false);if(G.scene!=='battle')throw Error('quick-deal failed');
 const initialInventory=players.map(p=>p.inventory.map(s=>s.w.name)),initialState={time:G.time,tick:G.tick,rng:rs>>>0,terrain:POCKET.terrainHash()};let steps=0;const startSelf=qaSelfHits,decisions=[],savedPrepare=prepareCPU;prepareCPU=function(){const rngBefore=rs>>>0;savedPrepare();decisions.push({turn:G.shots,weapon:currentWeapon().name,angle:G.aiAim.angle,power:G.aiAim.power,rngBefore,rngAfter:rs>>>0});};
 try{while(G.scene==='battle'&&steps++<120*800){if(!G.locked&&G.turn===0){const a=solveAim(active(),currentWeapon());active().angle=a.angle;active().power=a.power;if(!fireNow())throw Error('human fire rejected');}simStep(STEP);}}finally{prepareCPU=savedPrepare;}
 return{seed,difficulty,layout,wind,lowGravity,initialInventory,initialState,decisions,state:POCKET.state,history:history.map(h=>({...h})),selfHitEvents:qaSelfHits-startSelf,steps,finalTerrain:POCKET.terrainHash()};
};`;
const reports=[];
for(let index=0;index<paths.length;index++){
 const source=resolve(paths[index]),label=['baseline','prior','candidate'][index],page=await launch(),r={label,source,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),groups:[],singleWeapon:[],matches:[]};
 try{
  await page.init(`for(const key of ['tiny-treads-settings','pocket-reforged-settings'])localStorage.setItem(key,JSON.stringify({sound:false}));`);
  await page.goto(pathToFileURL(source).href);await until(()=>page.eval('!!window.POCKET'));await page.eval(setup);await page.eval(freshSetup);
  for(const g of groups){const rows=await page.eval(`(()=>{const g=${JSON.stringify(g)},rows=[];for(const seed of g.seeds){dpSetup({...g,seed});const old=predict;let calls=0;predict=(...a)=>{calls++;return old(...a)};let shot;try{shot=qaShot()}finally{predict=old}rows.push({...shot,calls});}return rows})()`);r.groups.push({...g,rows});}
  // One modeled option must not consume a lower-difficulty comparison-gate draw.
  for(const difficulty of ['easy','normal']){const rows=await page.eval(`(()=>{const rows=[];for(let seed=1;seed<=24;seed++){qaSetup(seed,'plain',${JSON.stringify(difficulty)},['Single Shot']);rows.push(qaShot());}return rows})()`);r.singleWeapon.push({difficulty,rows});}
  await page.eval(battleSetup);const layouts=['plain','hills','ridge','bowl','terraces','arches'];
  for(const difficulty of ['easy','normal','hard'])for(let i=0;i<12;i++){
   const m=await page.eval(`dpBattle(${6173+i*1009},${JSON.stringify(difficulty)},${JSON.stringify(layouts[i%6])},${i%3===1},${i%4===3})`);
   assert.equal(m.state.scene,'results');assert.equal(m.state.turnCount,20);assert.equal(m.state.stats.safetyTimeouts,0);assert.ok(m.state.players.every(p=>p.shots===10&&p.remaining===0));r.matches.push(m);
  }
  r.errors=page.logs.filter(s=>s.startsWith('error')||s.startsWith('EXCEPTION'));assert.deepEqual(r.errors,[]);
 }finally{await page.kill();writeFileSync(resolve(out,label+'.json'),JSON.stringify(r));}
 reports.push(r);console.log(`${label}: 1536 fresh shots, 48 single-option shots, 36 complete matches`);
}
// Beam predictor diagnostic error metadata changed, but commanded aim must be exact.
const stableShot=({cost,calls,aim,...rest})=>({...rest,angle:aim.angle,power:aim.power});
const stableMatch=m=>({initialInventory:m.initialInventory,initialState:m.initialState,decisions:m.decisions,history:m.history,terrain:m.finalTerrain,scores:m.state.players.map(p=>p.score),shots:m.state.turnCount,timeouts:m.state.stats.safetyTimeouts,selfHits:m.selfHitEvents,steps:m.steps});
const summary={sources:reports.map(r=>({label:r.label,sourceSha256:r.sourceSha256})),groups:[],matchParity:[],singleWeaponParity:48,maxCalls:0};
for(let i=0;i<groups.length;i++){
 const current=reports[2].groups[i],reference=reports[current.difficulty==='hard'?1:0].groups[i];
 for(let j=0;j<current.rows.length;j++){assert.deepEqual(stableShot(current.rows[j]),stableShot(reference.rows[j]));assert.ok(current.rows[j].calls<=752);summary.maxCalls=Math.max(summary.maxCalls,current.rows[j].calls);}
 const row={id:current.id,difficulty:current.difficulty,exactParity:true,reference:current.difficulty==='hard'?'0c80efa':'original-main'};
 for(const r of reports){const rows=r.groups[i].rows;row[r.label]={shots:rows.length,hits:rows.filter(s=>s.points>0).length,points:rows.reduce((n,s)=>n+s.points,0),selfHitShots:rows.filter(s=>s.selfHits>0).length};}
 row.newMissesVsBaseline=current.rows.filter((s,j)=>s.points<=0&&reports[0].groups[i].rows[j].points>0).map(s=>s.seed);assert.equal(row.newMissesVsBaseline.length,0);summary.groups.push(row);
}
for(let i=0;i<2;i++)assert.deepEqual(reports[2].singleWeapon[i].rows.map(stableShot),reports[0].singleWeapon[i].rows.map(stableShot));
for(let i=0;i<reports[2].matches.length;i++){
 const current=reports[2].matches[i],reference=reports[current.difficulty==='hard'?1:0].matches[i];assert.deepEqual(stableMatch(current),stableMatch(reference));summary.matchParity.push({seed:current.seed,difficulty:current.difficulty,exactParity:true,reference:current.difficulty==='hard'?'0c80efa':'original-main'});
}
summary.passed=true;writeFileSync(resolve(out,'comparison.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({passed:true,freshShotsPerSource:1536,exactSingleOptionParity:48,exactMatchParity:summary.matchParity.length,maxCalls:summary.maxCalls},null,2));
