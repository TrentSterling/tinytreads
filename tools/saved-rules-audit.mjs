// Returning-player regression: muted headless Chrome, DOM/game hooks only.
import {launch,until} from './cdp.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const arg=process.argv[2]||'index.html',url=/^https?:/.test(arg)?arg:pathToFileURL(resolve(arg)).href;
const out=resolve(process.argv[3]||'tools/out/saved-rules');mkdirSync(out,{recursive:true});
const cases=[
 {name:'retired biome',rules:{biome:'retired-biome'},expected:{biome:'green'}},
 {name:'unsupported rules',rules:{difficulty:'retired',pool:'retired',biome:null,layout:'retired',series:7,rule:'retired',draft:'retired'},expected:{difficulty:'normal',pool:'classic',biome:'green',layout:'hills',series:1,rule:'classic',draft:'auto'}},
 ...['constructor','toString','__proto__'].map(key=>({name:'inherited '+key,rules:{biome:key,layout:key,rule:key},expected:{biome:'green',layout:'hills',rule:'classic'}})),
 {name:'valid custom game',rules:{difficulty:'hard',pool:'all',biome:'desert',layout:'ridge',series:3,rule:'mirror',draft:'manual',wind:true,lowGravity:true,keepCraters:true},expected:{difficulty:'hard',pool:'all',biome:'desert',layout:'ridge',series:3,rule:'mirror',draft:'manual',wind:true,lowGravity:true,keepCraters:true}},
 {name:'legacy settings',legacy:true,rules:{biome:'retired-biome',difficulty:'hard'},expected:{biome:'green',difficulty:'hard'}}
];
const rows=[];
for(const c of cases){const p=await launch();try{
 const profile={sound:false,name:'Returning player',name2:'Rival',look:{body:'dart',turret:'twin',flag:'bolt',color:4},look2:{body:'bulldog',turret:'stub',flag:'aerial',color:5},...c.rules};
 const raw=JSON.stringify(profile),records='{"matches":12,"best":280}';
 await p.init(`localStorage.setItem(${JSON.stringify(c.legacy?'pocket-reforged-settings':'tiny-treads-settings')},${JSON.stringify(raw)});localStorage.setItem('tiny-treads-records',${JSON.stringify(records)});`);
 await p.goto(url);await until(()=>p.eval('!!window.POCKET'),{timeout:30000});
 const loaded=await p.eval(`({version:POCKET.version,settings:{...POCKET.settings},saved:localStorage.getItem('${c.legacy?'pocket-reforged-settings':'tiny-treads-settings'}'),records:localStorage.getItem('tiny-treads-records')})`);
 for(const[k,v]of Object.entries(c.expected))assert.deepEqual(loaded.settings[k],v,c.name+' '+k);
 assert.equal(loaded.saved,raw,'boot must not overwrite stored data');assert.equal(loaded.records,records);assert.equal(loaded.settings.name,profile.name);assert.equal(loaded.settings.sound,false);
 if(!c.legacy){assert.deepEqual(loaded.settings.look,profile.look);assert.deepEqual(loaded.settings.look2,profile.look2);}
 // Finish an actual 20-shot local match with the loaded biome (all fixtures share a quick match).
 const result=await p.eval(`(()=>{POCKET.pauseClock();settings.series=1;settings.rule='classic';resetSeries();POCKET.quickLocal();for(let i=0;i<10000&&POCKET.state.scene==='battle';i++){if(!POCKET.state.locked){POCKET.autoAim();document.getElementById('fire').click();}POCKET.advance(.1,false);}POCKET.render();return{state:POCKET.state,shown:!document.getElementById('results').hidden,errors:POCKET.validate(),summary:document.getElementById('resultSummary').textContent}})()`);
 assert.equal(result.state.scene,'results');assert.equal(result.state.turnCount,20);assert.equal(result.state.stats.shots,20);assert.equal(result.state.stats.safetyTimeouts,0);assert.equal(result.shown,true);assert.deepEqual(result.errors,[]);
 assert.ok(result.state.players.every(q=>q.remaining===0&&q.shots===10));
 if(c===cases[0])await p.shot(out+'/results.png');
 const errors=p.logs.filter(s=>s.startsWith('EXCEPTION')||s.startsWith('error'));assert.deepEqual(errors,[]);
 rows.push({name:c.name,loaded,result,errors,passed:true});console.log('PASS '+c.name+' full match, preserved profile, visible results');
 }finally{await p.kill();}}
writeFileSync(out+'/results.json',JSON.stringify({target:arg,sha256:/^https?:/.test(arg)?null:createHash('sha256').update(readFileSync(arg)).digest('hex'),rows},null,2));
