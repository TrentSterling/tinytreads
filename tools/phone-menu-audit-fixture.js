window.auditPhoneMenu=()=>{
 const o=document.querySelector('#stage>.overlay:not([hidden])'),geo=phoneMenuGeometry(),rows=[];
 for(const e of [...o.querySelectorAll('button,input,select,summary')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden')){
  const target=e.type==='checkbox'?e.closest('label'):e;
  target.scrollIntoView({block:'center',inline:'nearest'});
  const r=target.getBoundingClientRect(),viewport=o.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
  rows.push({id:e.id||null,text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,60),type:e.type,disabled:e.disabled,x:r.x,y:r.y,w:r.width,h:r.height,font:parseFloat(getComputedStyle(target).fontSize),fits:e.type==='range'||e.type==='checkbox'||e.scrollWidth<=e.clientWidth+1,reachable:r.x>=0&&r.right<=innerWidth&&r.y>=viewport.y-.1&&r.bottom<=viewport.bottom+.1&&!!hit&&(hit===target||target.contains(hit))});
 }
 const about=document.querySelector('#trontAbout>summary').getBoundingClientRect(),view=o.getBoundingClientRect();
 const textMeasure=document.createElement('canvas').getContext('2d');
 const paintLabels=[...o.querySelectorAll('#paintOptions button')].map(e=>{const s=getComputedStyle(e);textMeasure.font=s.font;return{name:e.textContent.trim(),singleLine:textMeasure.measureText(e.textContent.trim()).width<=e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)};});
 return{geometry:geo,controls:rows,paintLabels,aboutClear:about.bottom<=view.top,documentScroll:scrollY,horizontalOverflow:o.scrollWidth>o.clientWidth+1};
};
window.exercisePhoneFlows=()=>{
 const by=id=>document.getElementById(id),click=id=>by(id).click(),battle=()=>JSON.stringify({state:POCKET.state,board:terrain.slice(),settings:POCKET.settings}),rows=[];
 POCKET.showTitle();POCKET.pauseClock();click('draftPlay');by('seedInput').value='phone-menu-43';by('nameInput').value='Menu Captain';by('difficultyInput').value='hard';by('seriesInput').value='1';by('biomeInput').value='ice';
 click('setupGarage');by('garageName').value='Menu Captain';by('garageName').oninput();document.querySelector('#hullOptions button:nth-child(2)').click();click('garageBack');rows.push({name:'garage returns to configured setup',pass:POCKET.state.overlay==='setup'&&by('seedInput').value==='phone-menu-43'&&by('difficultyInput').value==='hard'});
 click('setupDraft');const beforePick=POCKET.state.shopTurn??G.shopTurn;document.querySelector('#offer button:not(:disabled)').click();rows.push({name:'manual pick advances once',pass:G.shopTurn===beforePick+1});
 click('shopAuto');click('shopAuto');for(let i=0;i<100&&POCKET.state.scene!=='battle';i++)POCKET.advance(.1,false);rows.push({name:'auto-deal reaches battle with original profile',pass:POCKET.state.scene==='battle'&&POCKET.settings.name==='Menu Captain'&&POCKET.settings.biome==='ice'});
 const exactBefore=battle();click('helpBtn');by('help').scrollTop=10000;const helpScroll=by('help').scrollTop;overlay('help');rows.push({name:'repeated same overlay preserves scroll',pass:by('help').scrollTop===helpScroll});click('helpClose');rows.push({name:'battle Help return preserves state',pass:exactBefore===battle()});
 click('menuBtn');const paused=battle();help();click('helpClose');rows.push({name:'Help returns to pause',pass:POCKET.state.overlay==='pause'&&paused===battle()});click('resume');rows.push({name:'pause/resume preserves battle',pass:exactBefore===battle()});
 click('arsenalBtn');const closeState=POCKET.state;click('arsenalClose');rows.push({name:'inventory closes to battle',pass:POCKET.state.overlay===null&&closeState.players.length===POCKET.state.players.length});
 POCKET.showTitle();click('titleArsenal');by('weaponSearch').value='zz-no-weapon-match';renderArsenal();rows.push({name:'empty search cannot equip',pass:by('equipWeapon').disabled});by('weaponSearch').value='Single Shot';renderArsenal();const first=document.querySelector('#arsenalList button');first.click();click('equipWeapon');rows.push({name:'filtered selection enters target range',pass:POCKET.state.scene==='battle'&&POCKET.state.mode==='range'});
 preparePhoneMenu('results');const count=POCKET.state.turnCount;click('rematch');click('shopAuto');click('shopAuto');for(let i=0;i<100&&POCKET.state.scene!=='battle';i++)POCKET.advance(.1,false);rows.push({name:'real result rematch and deal returns to battle',pass:count===20&&POCKET.state.scene==='battle'});
 return{rows,profile:POCKET.settings,networkInactive:!Net.active&&!Party.active,errors:POCKET.validate()};
};
