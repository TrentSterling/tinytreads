// Responsive title regression: muted headless Chrome, DOM/game hooks only.
// No injected pointer/keyboard events, focus, fullscreen or audio actions.
import {launch,until,sleep} from './cdp.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const arg=process.argv[2]||'index.html',target=/^https?:/.test(arg)?arg:pathToFileURL(resolve(arg)).href;
const baseline=process.argv[3]?pathToFileURL(resolve(process.argv[3])).href:null;
const out=resolve(process.argv[4]||'tools/out/portrait-title');mkdirSync(out,{recursive:true});const rows=[];
const geometry=`(()=>{const stage=document.getElementById('stage'),rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}},scale=new DOMMatrix(getComputedStyle(stage).transform).a;return{stage:rect(stage),transform:getComputedStyle(stage).transform,field:rect(document.getElementById('field')),hud:rect(document.getElementById('hud')),title:rect(document.getElementById('title')),touch:getComputedStyle(document.getElementById('title')).touchAction,buttons:[...document.querySelectorAll('#title button')].filter(e=>e.getClientRects().length).map(e=>({id:e.id,...rect(e),font:parseFloat(getComputedStyle(e).fontSize)*scale,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}))}})()`;
const click=(p,id)=>p.eval(`document.getElementById(${JSON.stringify(id)}).click()`);
async function boot(p,url){await p.init("localStorage.setItem('tiny-treads-settings',JSON.stringify({sound:false,name:'Portrait player',look:{body:'dart',turret:'twin',flag:'bolt',color:4}}));");await p.goto(url);await until(()=>p.eval('!!window.POCKET'));await p.eval('POCKET.pauseClock();POCKET.render();');await sleep(80);}
async function viewport(p,width,height){await p.viewport(width,height);const scale=Math.min(width/1200,height/800);await until(()=>p.eval(`innerWidth===${width}&&innerHeight===${height}&&Math.abs(parseFloat(document.getElementById('stage').style.transform.split('scale(')[1])-${scale})<.00001`),{label:'viewport resize handler'});}
function fixedStage(g,width,height){const scale=Math.min(width/1200,height/800);assert.ok(Math.abs(g.stage.w-1200*scale)<.02&&Math.abs(g.stage.h-800*scale)<.02,'original stage dimensions restored: '+JSON.stringify({viewport:[width,height],stage:g.stage,transform:g.transform}));}
for(const[width,height]of[[320,480],[360,640],[390,844],[430,932],[600,800],[601,800],[768,1024],[1024,768],[1280,800],[844,390]]){
 const p=await launch({width,height}),portrait=width<=600&&width<height,tag=width+'x'+height;
 try{
  let prior=null;
  if(baseline&&!portrait){await boot(p,baseline);prior=await p.eval(geometry);}
  await boot(p,target);const initial=await p.eval(geometry);assert.equal(await p.eval('POCKET.version'),'4.0.3');
  if(prior)assert.deepEqual(initial,prior,'desktop/tablet/title geometry must remain exact');
  if(portrait){assert.equal(initial.stage.w,width);assert.equal(initial.stage.h,height);assert.equal(initial.touch,'pan-y');assert.ok(initial.buttons.find(b=>b.id==='quickPlay').font>=20);}
  else fixedStage(initial,width,height);
  await p.shot(out+'/'+tag+'-title.png');
  await click(p,'moreModes');assert.equal(await p.eval("document.getElementById('moreModes').getAttribute('aria-expanded')"),'true');
  // Placement fixture only: do not reconnect to a room or send network messages.
  await p.eval("document.getElementById('resumeOnline').hidden=false");
  const expanded=await p.eval(geometry),reach=[];
  if(portrait){
   for(const b of expanded.buttons){
    assert.ok(b.w>=44&&b.h>=44&&b.font>=14,b.id+' readable target');assert.ok(b.scrollWidth<=b.clientWidth+1,b.id+' text overflow');
    const result=await p.eval(`(()=>{const e=document.getElementById(${JSON.stringify(b.id)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),t=document.getElementById('title').getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{id:e.id,reachable:r.x>=0&&r.right<=innerWidth&&r.y>=t.y&&r.bottom<=t.bottom&&!!hit&&(hit===e||e.contains(hit)),top:r.y,bottom:r.bottom}})()`);
    assert.ok(result.reachable,b.id+' reachable through title scroll');reach.push(result);
   }
   for(let i=0;i<expanded.buttons.length;i++)for(let j=i+1;j<expanded.buttons.length;j++){const a=expanded.buttons[i],b=expanded.buttons[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'overlapping title buttons');}
   await p.eval("document.getElementById('resumeOnline').scrollIntoView({block:'center'})");await p.shot(out+'/'+tag+'-expanded.png');
   assert.ok(await p.eval(`(()=>{const a=document.querySelector('#trontAbout>summary'),r=a.getBoundingClientRect(),t=document.getElementById('title').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.bottom<=t.top&&(hit===a||a.contains(hit))})()`),'About remains clear and reachable');
  }
  await p.eval("document.getElementById('resumeOnline').hidden=true");
  // Existing menu routes restore the exact fixed stage; actions stay wired as before.
  const flows=[];
  for(const[open,close,overlay]of[['titleGarage','garageBack','garage'],['titleHelp','helpClose','help'],['titleCredits','creditsBack','credits'],['titleArsenal','arsenalClose','arsenal'],['draftPlay','setupBack','setup'],['localPlay','setupBack','setup']]){
   await p.eval("document.getElementById('title').scrollTop=10000");await click(p,open);assert.equal(await p.eval('POCKET.state.overlay'),overlay);fixedStage(await p.eval(geometry),width,height);await click(p,close);assert.equal(await p.eval('POCKET.state.overlay'),'title');assert.equal(await p.eval("document.getElementById('title').scrollTop"),0,'title returns to top');flows.push(open+' -> '+overlay+' -> title');
  }
  await click(p,'quickPlay');await p.eval('for(let i=0;i<100&&POCKET.state.scene!=="battle";i++)POCKET.advance(.1,false);POCKET.render()');assert.equal(await p.eval('POCKET.state.scene'),'battle');fixedStage(await p.eval(geometry),width,height);
  await click(p,'menuBtn');assert.equal(await p.eval('POCKET.state.overlay'),'pause');await click(p,'resume');assert.equal(await p.eval('POCKET.state.overlay'),null);
  await click(p,'menuBtn');await click(p,'returnTitle');assert.equal(await p.eval('POCKET.state.overlay'),'title');
  await viewport(p,height,width);let rotated=await p.eval(geometry);if(height>600||height>=width)fixedStage(rotated,height,width);
  await viewport(p,width,height);const restored=await p.eval(geometry);assert.deepEqual(restored,initial,'rotation and navigation restore original title layout');
  assert.equal(await p.eval('POCKET.settings.name'),'Portrait player');assert.equal(await p.eval('POCKET.settings.sound'),false);assert.deepEqual(p.logs.filter(s=>s.startsWith('EXCEPTION')||s.startsWith('error')),[]);
  rows.push({width,height,portrait,initial,expanded,reach,flows,rotation:rotated,passed:true});console.log('PASS '+tag+' geometry, menu routes, Quick battle, pause/resume, rotation, saved preferences');
 }catch(error){writeFileSync(out+'/failure-'+tag+'.json',JSON.stringify({tag,error:error.stack,geometry:await p.eval(geometry)},null,2));throw error}finally{await p.kill()}
}
writeFileSync(out+'/results.json',JSON.stringify({target,baseline,rows},null,2));
