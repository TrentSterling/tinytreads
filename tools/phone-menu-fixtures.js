// Presentation fixtures use existing menu/game paths. No network joins or input injection.
window.preparePhoneMenu=name=>{
 POCKET.showTitle();POCKET.pauseClock();
 if(name==='help')document.getElementById('titleHelp').click();
 else if(name==='setup'){document.getElementById('draftPlay').click();document.querySelector('.setup-sheet details').open=true;}
 else if(name==='garage')document.getElementById('titleGarage').click();
 else if(name==='arsenal'||name==='arsenal-empty'){document.getElementById('titleArsenal').click();if(name==='arsenal-empty'){document.getElementById('weaponSearch').value='zz-no-weapon-match';renderArsenal();}}
 else if(name==='pause'){POCKET.startPractice();document.getElementById('menuBtn').click();}
 else if(name==='shop'){setup('local');document.getElementById('setupDraft').click();POCKET.advance(.1,false);demoTick(.1);}
 else if(name.startsWith('online')){document.getElementById('titlePrivate').click();if(name==='online-public'){document.getElementById('online').classList.add('public-search');document.getElementById('onlineTitle').textContent='Finding a rival';}if(name==='online-connected'){document.getElementById('roomBadge').hidden=false;document.getElementById('roomCodeLabel').textContent='PHONE42';document.getElementById('networkHeadline').textContent='Rival connected';}}
 else if(name.startsWith('brawl')){document.getElementById('brawlEntry').click();if(name==='brawl-host'){document.getElementById('brawl').classList.add('in-room');document.getElementById('partyCode').textContent='PHONE42';document.getElementById('partyCopy').hidden=false;document.getElementById('partyStart').hidden=false;document.getElementById('partyStart').disabled=false;}}
 else if(name==='lost')overlay('lost');
 else if(name==='credits')document.getElementById('titleCredits').click();
 else if(name==='results'){
  settings.series=1;settings.rule='classic';resetSeries();POCKET.quickLocal();
  for(let i=0;i<10000&&POCKET.state.scene==='battle';i++){if(!POCKET.state.locked){POCKET.autoAim();document.getElementById('fire').click();}POCKET.advance(.1,false);}
 }
 else if(name==='results4'){startBrawl(4,'local');for(let i=0;i<players.length;i++){players[i].score=1234+i*100;players[i].shots=10;}showResults();}
 POCKET.render();return POCKET.state;
};
window.phoneMenuGeometry=()=>{
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden',rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}},stage=document.getElementById('stage'),scale=new DOMMatrix(getComputedStyle(stage).transform).a,o=document.querySelector('#stage>.overlay:not([hidden])'),sheet=o?.querySelector('.sheet');
 return{version:POCKET.version,overlay:o?.id,scene:POCKET.state.scene,stage:rect(stage),scale,overlayRect:o?rect(o):null,sheet:sheet?rect(sheet):null,scrollHeight:o?.scrollHeight,scrollWidth:o?.scrollWidth,controls:o?[...o.querySelectorAll('button,input,select,summary')].filter(visible).map(e=>({id:e.id||null,tag:e.tagName,type:e.type,text:(e.textContent||e.placeholder||e.getAttribute('aria-label')||'').trim().slice(0,80),...rect(e),font:parseFloat(getComputedStyle(e).fontSize)*scale,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,disabled:e.disabled})):[],texts:o?[...o.querySelectorAll('p,h2,.help-grid>div,.scorecard h3,.scorecard small')].filter(visible).map(e=>({text:e.textContent.trim().slice(0,100),font:parseFloat(getComputedStyle(e).fontSize)*scale,...rect(e)})):[]};
};
