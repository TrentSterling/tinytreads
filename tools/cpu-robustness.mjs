// Compare unchanged real-engine outcomes over a fixed geometry/seed distribution.
// No seed-specific gameplay behavior; all mutations here are isolated QA fixtures.
import {launch,until} from './cdp.mjs';
import {setup} from './cpu-fixture.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const paths=process.argv.slice(2);
assert.equal(paths.length,3,'Usage: node tools/cpu-robustness.mjs baseline/index.html held/index.html candidate/index.html');
const group=[];
const all=['easy','normal','hard'];
const seeds=Array.from({length:32},(_,i)=>i<16?i+1:Math.imul(0x9e3779b9,i+1)>>>0);
for(const difficulty of all)group.push({id:'review-flat',distance:810,dy:0,difficulty,seeds:Array.from({length:128},(_,i)=>i+1)});
for(const distance of [770,810,850])for(const dy of [-4,0,4])if(distance!==810||dy!==0)for(const difficulty of all)group.push({id:`near-${distance}-${dy}`,distance,dy,difficulty,seeds});
for(const distance of [65,300,500,950])group.push({id:`distance-${distance}`,distance,dy:0,difficulty:'hard',seeds});
for(const wind of [-20,20])group.push({id:`wind-${wind}`,distance:810,dy:0,wind,difficulty:'hard',seeds});
group.push({id:'low-gravity',distance:810,dy:0,lowGravity:true,difficulty:'hard',seeds});
for(const difficulty of all)group.push({id:'leftward',distance:810,dy:0,leftward:true,difficulty,seeds});
const out=resolve('tools/out/robustness');mkdirSync(out,{recursive:true});
const reports=[];
for(let index=0;index<paths.length;index++){
 const source=resolve(paths[index]),label=['baseline','held','candidate'][index],page=await launch();
 const report={label,source,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),groups:[]};
 try{
  await page.init(`for(const k of ['tiny-treads-settings','pocket-reforged-settings'])localStorage.setItem(k,JSON.stringify({sound:false}));`);
  await page.goto(pathToFileURL(source).href);await until(()=>page.eval('!!window.POCKET'),{label:'boot'});await page.eval(setup);
  await page.eval(`window.qaGeometry=q=>{qaSetup(q.seed,'plain',q.difficulty,['Laser','Single Shot','Super Laser','Sniper Rifle']);
   const sx=q.distance===950?100:190,tx=sx+q.distance;players[0].x=q.leftward?tx:sx;players[1].x=q.leftward?sx:tx;
   terrain.fill(0);for(let x=0;x<W;x++){const h=x>(sx+tx)/2?400+q.dy:400;for(let y=h;y<FH;y++)terrain[y*W+x]=1;}mark(0,W-1);refreshSurface();
   for(const p of players){p.y=surface[Math.round(p.x)];p.vx=p.vy=0;}settings.wind=!!q.wind;G.wind=q.wind||0;settings.lowGravity=!!q.lowGravity;seedRng(q.seed);
  };`);
  for(const g of group){
   const rows=await page.eval(`(()=>{const g=${JSON.stringify(g)},rows=[];for(const seed of g.seeds){qaGeometry({...g,seed});rows.push(qaShot());}return rows})()`);
   report.groups.push({...g,seeds:undefined,rows});console.log(`${label} ${g.id} ${g.difficulty}: ${rows.filter(r=>r.points>0).length}/${rows.length} scoring`);
  }
  report.logs=page.logs.filter(s=>s.startsWith('error')||s.startsWith('EXCEPTION'));assert.deepEqual(report.logs,[]);
 }finally{writeFileSync(resolve(out,label+'.json'),JSON.stringify(report,null,2));await page.kill();}
 reports.push(report);
}
const summary={sources:reports.map(r=>({label:r.label,sha256:r.sourceSha256})),groups:[]};
const stableShot=({cost,aim,...rest})=>({...rest,angle:aim.angle,power:aim.power});
for(let i=0;i<group.length;i++){
 const row={id:group[i].id,difficulty:group[i].difficulty,count:group[i].seeds.length};
 for(const r of reports){const rows=r.groups[i].rows;row[r.label]={scoring:rows.filter(q=>q.points>0).length,points:rows.reduce((s,q)=>s+q.points,0),selfHitShots:rows.filter(q=>q.selfHits>0).length};}
 const base=reports[0].groups[i].rows,held=reports[1].groups[i].rows,candidate=reports[2].groups[i].rows;
 row.newMissesVsBaseline=candidate.filter((q,j)=>base[j].points>0&&q.points<=0).map(q=>q.seed);
 row.newMissesVsHeld=candidate.filter((q,j)=>held[j].points>0&&q.points<=0).map(q=>q.seed);
 assert.ok(candidate.every((q,j)=>q.decisionRng===base[j].decisionRng),'selection must consume exactly original-main RNG');
 if(row.difficulty!=='hard')assert.deepEqual(candidate.map(stableShot),base.map(stableShot),'Easy/Normal must match original-main gameplay');
 summary.groups.push(row);
}
const hardFlat=summary.groups.find(g=>g.id==='review-flat'&&g.difficulty==='hard');
const seed4=reports[2].groups.find(g=>g.id==='review-flat'&&g.difficulty==='hard').rows.find(r=>r.seed===4);
summary.seed4=seed4;summary.rngSequencePreserved=true;summary.totalShotsPerSource=group.reduce((n,g)=>n+g.seeds.length,0);
writeFileSync(resolve(out,'comparison.json'),JSON.stringify(summary,null,2));
assert.ok(seed4.points>0&&seed4.name==='Single Shot','regression: robust shell should beat fragile beam');
assert.equal(hardFlat.newMissesVsBaseline.length,0,'Hard flat distribution must not introduce hit-to-miss regressions');
assert.ok(hardFlat.candidate.scoring>=hardFlat.baseline.scoring);
assert.ok(summary.groups.filter(g=>g.difficulty==='hard').every(g=>g.newMissesVsHeld.length===0),'Hard must not introduce hit-to-miss regressions against held candidate in this distribution');
assert.ok(summary.groups.every(g=>g.newMissesVsBaseline.length===0),'geometry neighborhoods must not introduce hit-to-miss regressions against original main');
summary.passed=true;writeFileSync(resolve(out,'comparison.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({totalShotsPerSource:summary.totalShotsPerSource,hardFlat,seed4:{name:seed4.name,points:seed4.points},rngSequencePreserved:true},null,2));
