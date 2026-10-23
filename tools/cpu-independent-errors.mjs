// Review regression corpus plus independent angle/power coverage and live probes.
import {launch,until} from './cdp.mjs';
import {setup} from './cpu-fixture.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const paths=process.argv.slice(2);assert.equal(paths.length,4,'Usage: node tools/cpu-independent-errors.mjs BASELINE/index.html IDEAL/index.html PAIRED/index.html CANDIDATE/index.html');
const out=resolve('tools/out/independent-errors');mkdirSync(out,{recursive:true});
const seeds=Array.from({length:48},(_,i)=>(Math.imul(0x85ebca6b,i+47)^0xc2b2ae35)>>>0);
const geometries=[{id:'flat-740-minus8',distance:740,dy:-8},{id:'flat-780-plus2',distance:780,dy:2},{id:'flat-820-minus2',distance:820,dy:-2},{id:'flat-880-plus8',distance:880,dy:8},{id:'left-820-plus2',distance:820,dy:2,leftward:true},{id:'range300-high',distance:300,dy:-60},{id:'range500-low',distance:500,dy:60},{id:'flat-820-wind',distance:820,dy:0,wind:-16},{id:'flat-780-lowgrav',distance:780,dy:0,lowGravity:true}];
const groups=geometries.flatMap(q=>['easy','normal','hard'].map(difficulty=>({...q,difficulty,seeds})));
for(const layout of ['hills','ridge','bowl','terraces','arches','plain'])groups.push({id:'natural-'+layout,layout,difficulty:'hard',seeds:seeds.slice(0,8)});
const regressions=[{id:'flat-740-minus8',difficulty:'normal',seed:3733412389},{id:'flat-820-minus2',difficulty:'easy',seed:4049056649},{id:'flat-820-minus2',difficulty:'normal',seed:3733412389},{id:'flat-780-lowgrav',difficulty:'normal',seed:3733412389}];
const configure=`window.ieSetup=q=>{qaSetup(q.seed,q.layout?'natural':'plain',q.difficulty,['Single Shot','Big Shot','Laser','Super Laser']);
 if(q.layout){settings.layout=q.layout;beginBattle();G.mode='local';G.aiAim=null;G.aiTimer=100;overlay(null);}
 else{const sx=q.sx??140,tx=sx+q.distance;players[0].x=q.leftward?tx:sx;players[1].x=q.leftward?sx:tx;terrain.fill(0);for(let x=0;x<W;x++){const h=x>(sx+tx)/2?400+q.dy:400;for(let y=h;y<FH;y++)terrain[y*W+x]=1;}mark(0,W-1);refreshSurface();for(const p of players){p.y=surface[Math.round(p.x)];p.vx=p.vy=0;p.buried=false;}}
 settings.wind=!!q.wind;G.wind=q.wind||0;settings.lowGravity=!!q.lowGravity;seedRng(q.seed);};`;
const reports=[];
for(let i=0;i<paths.length;i++){
 const source=resolve(paths[i]),label=['baseline','ideal','paired','candidate'][i],page=await launch(),r={label,source,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),groups:[],regressions:[]};
 try{
  await page.init(`for(const k of ['tiny-treads-settings','pocket-reforged-settings'])localStorage.setItem(k,JSON.stringify({sound:false}));`);
  await page.goto(pathToFileURL(source).href);await until(()=>page.eval('!!window.POCKET'),{label:'boot'});await page.eval(setup);await page.eval(configure);
  for(const g of groups){const rows=await page.eval(`(()=>{const g=${JSON.stringify(g)},rows=[];for(const seed of g.seeds){ieSetup({...g,seed});const old=predict;let calls=0;predict=(...a)=>{calls++;return old(...a)};let shot;try{shot=qaShot()}finally{predict=old}rows.push({...shot,calls});}return rows})()`);r.groups.push({...g,rows});}
  for(const c of regressions){const g=groups.find(g=>g.id===c.id&&g.difficulty===c.difficulty);const rows=await page.eval(`(()=>{const rows=[];for(const sx of [140,190]){ieSetup({...${JSON.stringify(g)},seed:${c.seed},sx});rows.push({sx,...qaShot()});}return rows})()`);r.regressions.push({...c,rows});}
  if(label==='candidate'){
   r.gridCoverage=await page.eval(`(()=>{qaSetup(123,'plain','hard',['Single Shot','Big Shot','Laser','Super Laser']);const oldSolve=solveAim,oldPredict=predict,plans={},calls={};solveAim=(p,w)=>{const a=oldSolve(p,w);plans[w.name]={...a};calls[w.name]=[];return a};predict=(p,a,power,w,...rest)=>{calls[w.name]?.push({angle:a,power});return oldPredict(p,a,power,w,...rest)};try{prepareCPU()}finally{solveAim=oldSolve;predict=oldPredict}return{plans,calls}})()`);
   for(const name of ['Single Shot','Big Shot']){const p=r.gridCoverage.plans[name],calls=r.gridCoverage.calls[name];assert.equal(calls.length,9);for(const da of [-1,0,1])for(const dp of [-1,0,1])assert.ok(calls.some(q=>Math.abs(q.angle-Math.max(0,Math.min(180,p.angle+da*.4)))<1e-9&&Math.abs(q.power-Math.max(1,Math.min(100,p.power+dp*.8)))<1e-9),`missing independent corner/axis ${name} ${da},${dp}`);}
   for(const name of ['Laser','Super Laser'])assert.equal(r.gridCoverage.calls[name].length,3);
   const witness={...groups.find(g=>g.id==='flat-740-minus8'&&g.difficulty==='normal'),seed:3733412389};
   r.liveGrid=await page.eval(`(()=>{const q=${JSON.stringify(witness)},rows=[];ieSetup(q);const aim=solveAim(active(),byName.get('Single Shot'));for(const da of [-1,-.5,0,.5,1])for(const dp of [-1,-.5,0,.5,1]){ieSetup(q);active().selected=0;active().angle=clamp(aim.angle+da*1.6,0,180);active().power=clamp(aim.power+dp*2.8,1,100);fireNow();let steps=0;while(G.locked&&steps++<3600)simStep(STEP);if(G.locked||G.stats.safetyTimeouts)throw Error('grid shot failed to settle');rows.push({da,dp,points:history.at(-1).points});}return{aim,rows}})()`);
   assert.ok(r.liveGrid.rows.filter(q=>q.da*q.dp===-1).every(q=>q.points===0),'witness must expose mixed-sign failure');
   assert.ok(r.liveGrid.rows.filter(q=>Math.abs(q.da)===1&&q.da===q.dp).every(q=>q.points>0),'paired endpoints must reproduce misleading success');
  }
  r.errors=page.logs.filter(s=>s.startsWith('error')||s.startsWith('EXCEPTION'));assert.deepEqual(r.errors,[]);
 }finally{writeFileSync(resolve(out,label+'.json'),JSON.stringify(r));await page.kill();}
 reports.push(r);console.log(`${label}: ${r.groups.reduce((n,g)=>n+g.rows.length,0)} neighborhood shots and ${r.regressions.length*2} translated regression shots`);
}
const summary={sources:reports.map(r=>({label:r.label,sha256:r.sourceSha256})),groups:[],regressions:reports.map(r=>({label:r.label,cases:r.regressions})),maxCalls:0};
const stableShot=({cost,calls,aim,...rest})=>({...rest,angle:aim.angle,power:aim.power});
for(let i=0;i<groups.length;i++){
 const entry={id:groups[i].id,difficulty:groups[i].difficulty,count:groups[i].seeds.length,newMissesVsIdeal:[],newMissesVsPaired:[]};
 for(const r of reports){const rows=r.groups[i].rows;entry[r.label]={hits:rows.filter(q=>q.points>0).length,points:rows.reduce((s,q)=>s+q.points,0)};}
 for(let j=0;j<groups[i].seeds.length;j++){const c=reports[3].groups[i].rows[j],base=reports[0].groups[i].rows[j],ideal=reports[1].groups[i].rows[j],paired=reports[2].groups[i].rows[j];assert.equal(c.decisionRng,base.decisionRng);if(entry.difficulty!=='hard')assert.deepEqual(stableShot(c),stableShot(base));assert.ok(c.calls<=752);summary.maxCalls=Math.max(summary.maxCalls,c.calls);if(c.points<=0&&ideal.points>0)entry.newMissesVsIdeal.push(c.seed);if(c.points<=0&&paired.points>0)entry.newMissesVsPaired.push(c.seed);}
 summary.groups.push(entry);
}
writeFileSync(resolve(out,'comparison.json'),JSON.stringify(summary,null,2));
for(let i=0;i<regressions.length;i++){assert.ok(reports[2].regressions[i].rows.every(q=>q.points===0),'held paired sampler must reproduce the reported failure');assert.ok(reports[1].regressions[i].rows.every(q=>q.points>0));assert.deepEqual(reports[3].regressions[i].rows.map(stableShot),reports[0].regressions[i].rows.map(stableShot),'Easy/Normal review cases must now match original main');}
assert.ok(summary.groups.filter(g=>g.difficulty==='hard').every(g=>!g.newMissesVsIdeal.length),'Hard must not introduce new misses versus ideal-policy reference in expanded neighborhood');
summary.passed=true;writeFileSync(resolve(out,'comparison.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({passed:true,originalMainReviewCaseParity:8,maxCalls:summary.maxCalls},null,2));
