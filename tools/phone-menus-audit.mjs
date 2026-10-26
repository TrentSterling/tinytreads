// Muted headless menu layout and existing DOM/game-hook flows. No injected input or joins.
import {launch,until,sleep} from './cdp.mjs';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const arg=process.argv[2]||'index.html',target=/^https?:/.test(arg)?arg:pathToFileURL(resolve(arg)).href,baseline=process.argv[3]?pathToFileURL(resolve(process.argv[3])).href:null,out=resolve(process.argv[4]||'tools/out/phone-menus');mkdirSync(out,{recursive:true});const runs=[];
const names=['help','setup','garage','arsenal','arsenal-empty','pause','shop','online','online-public','online-connected','brawl','brawl-host','lost','credits','results','results4'];
const fixtures=readFileSync(new URL('./phone-menu-fixtures.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./phone-menu-audit-fixture.js',import.meta.url),'utf8');
async function boot(p,url){await p.init("localStorage.setItem('tiny-treads-settings',JSON.stringify({sound:false,name:'Phone player'}));");await p.goto(url);await until(()=>p.eval('!!window.POCKET'));await p.eval('POCKET.pauseClock()');await p.eval(fixtures);}
for(const[width,height]of[[320,480],[390,844],[600,800],[601,800],[768,1024],[1280,800],[844,390]]){
 const p=await launch({width,height}),portrait=width<=600&&height>width,tag=width+'x'+height,rows=[];
 try{
  const prior={};if(baseline&&!portrait){await boot(p,baseline);for(const n of names){await p.eval(`preparePhoneMenu(${JSON.stringify(n)})`);prior[n]=await p.eval('phoneMenuGeometry()');}}
  await boot(p,target);assert.equal(await p.eval('POCKET.version'),'4.0.4');
  for(const name of names){
   await p.eval(`preparePhoneMenu(${JSON.stringify(name)})`);await sleep(50);const g=await p.eval('phoneMenuGeometry()');
   if(portrait){
    const a=await p.eval('auditPhoneMenu()');assert.equal(a.horizontalOverflow,false,tag+'/'+name+' horizontal overflow');assert.equal(a.documentScroll,0);assert.ok(a.aboutClear);assert.ok(a.controls.every(c=>c.w>=43.9&&c.h>=43.9&&c.font>=13.9&&c.fits&&c.reachable),tag+'/'+name+' control '+JSON.stringify(a.controls.filter(c=>c.w<43.9||c.h<43.9||c.font<13.9||!c.fits||!c.reachable)));
    assert.ok(g.texts.filter(t=>![''].includes(t.text)).every(t=>t.font>=13.9),tag+'/'+name+' readable text');assert.ok(a.paintLabels.every(l=>l.singleLine),tag+' paint names remain whole');
    await p.eval("document.querySelector('#stage>.overlay:not([hidden])').scrollTop=0");await p.shot(out+'/'+tag+'-'+name+'.png');if(name==='garage'){await p.eval("document.getElementById('garage').scrollTop=10000");await p.shot(out+'/'+tag+'-garage-bottom.png');}rows.push({name,audit:a});
   }else if(prior[name]){
    const strip=q=>({stage:q.stage,overlayRect:q.overlayRect,sheet:q.sheet,controls:q.controls.map(c=>({id:c.id,tag:c.tag,w:c.w,h:c.h,font:c.font,x:c.x,y:c.y}))});assert.deepEqual(strip(g),strip(prior[name]),tag+'/'+name+' desktop/tablet geometry');rows.push({name,geometry:g,exactBaseline:true});
   }
  }
  const flow=await p.eval('exercisePhoneFlows()');assert.ok(flow.rows.every(r=>r.pass),JSON.stringify(flow.rows));assert.ok(flow.networkInactive);assert.equal(flow.profile.sound,false);assert.deepEqual(flow.errors,[]);
  const errors=p.logs.filter(s=>s.startsWith('EXCEPTION')||s.startsWith('error'));assert.deepEqual(errors,[]);
  runs.push({width,height,portrait,rows,flow});console.log('PASS '+tag+'16menu states, reachability/parity and'+flow.rows.length+' flows');
 }catch(error){writeFileSync(out+'/failure-'+tag+'.json',JSON.stringify({tag,error:error.stack,rows,current:await p.eval('phoneMenuGeometry()')},null,2));throw error}finally{await p.kill()}
}
writeFileSync(out+'/results.json',JSON.stringify({target,baseline,runs},null,2));
