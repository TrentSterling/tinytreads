// Headless smoke test for Tiny Treads. Zero deps: node tools/verify.mjs [file-or-url]
// Boots the real page in headless Chrome, checks the title screen and attract mode, starts a quick
// battle against the CPU, fires a shot, returns to the menu, reloads, and checks nothing threw.
import {launch, sleep, until} from './cdp.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const arg = process.argv.slice(2).find(a => !a.startsWith('--')) || 'index.html';
const target = /^https?:/.test(arg) ? arg : pathToFileURL(resolve(arg)).href;
const out = resolve('tools/out'); mkdirSync(out, {recursive: true});
const page = await launch({width: +(process.env.WIDTH || 1280), height: +(process.env.HEIGHT || 800)});
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok: !!ok, detail}); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); };
const shown = id => page.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});if(!e)return false;const s=getComputedStyle(e);return s.display!=="none"&&s.visibility!=="hidden"&&!e.hidden&&e.getClientRects().length>0})()`);
try {
  await page.init(`for(const key of ['tiny-treads-settings','pocket-reforged-settings'])localStorage.setItem(key,JSON.stringify({sound:false}));`);
  await page.goto(target);
  await until(() => page.eval('!!window.POCKET && !!document.getElementById("quickPlay")'), {timeout: 60000, label: 'boot'});
  check('boot: POCKET hook present', true, 'version ' + await page.eval('POCKET.version'));
  check('boot: no boot error', !(await shown('bootError')));
  check('title: shown with quick battle and online', (await shown('title')) && (await shown('quickPlay')), await page.eval('document.getElementById("quickPlay").textContent.trim()'));
  check('title: tront.xyz link', await page.eval('[...document.querySelectorAll("a[href^=\'https://tront.xyz\']")].length>=1'));
  check('title: no root-relative asset paths', await page.eval('![...document.querySelectorAll("[src],[href]")].some(e=>/^\\/[^\\/]/.test(e.getAttribute("src")||e.getAttribute("href")||""))'));
  check('title: no external scripts or fonts', await page.eval('[...document.querySelectorAll("script[src],link[rel=stylesheet]")].every(e=>!/^https?:/.test(e.getAttribute("src")||e.getAttribute("href")||""))'));
  check('title: arsenal lists 400 weapons', (await page.eval('POCKET.WEAPONS.length')) === 400, 'weapons ' + await page.eval('POCKET.WEAPONS.length'));
  await sleep(2500);
  await page.shot(`${out}/title.png`);
  await page.eval(`(()=>{POCKET.pauseClock();const now=Date.now,random=Math.random;try{Date.now=()=>1792785000000;Math.random=()=>.314159265;document.getElementById('quickPlay').click();}finally{Date.now=now;Math.random=random;}POCKET.advance(12,false)})()`);
  const inBattle = await until(() => shown('hud'), {timeout: 15000, label: 'hud'}).then(() => true).catch(() => false);
  check('battle: quick battle opens the HUD', inBattle && !(await shown('title')));
  check('controls: labeled aiming and movement controls remain available', await page.eval(`['angleNumber','powerNumber','powerSlider','moveLeft','moveRight'].every(id=>{const e=document.getElementById(id);return e&&(e.getAttribute('aria-label')||e.textContent.trim())&&e.getClientRects().length>0})`));
  await page.eval('POCKET.setWeapon("Single Shot");POCKET.autoAim()');
  const before = await page.eval('POCKET.state');
  const terrainBefore = await page.eval('POCKET.terrainHash()');
  await page.eval('document.getElementById("fire").click()');
  const fired = await page.eval('POCKET.state');
  check('battle: fire consumes exactly one shot', fired.locked && fired.stats.shots === before.stats.shots + 1 && fired.players[before.currentPlayer].shots === before.players[before.currentPlayer].shots + 1 && fired.players[before.currentPlayer].remaining === before.players[before.currentPlayer].remaining - 1);
  const settled = await page.eval('(()=>{for(let i=0;i<150&&POCKET.state.locked;i++)POCKET.advance(.1,false);return POCKET.state})()');
  check('battle: shot settles and advances the turn', !settled.locked && settled.turnCount === before.turnCount + 1 && settled.currentPlayer !== before.currentPlayer && settled.stats.safetyTimeouts === 0);
  check('battle: shell changes the terrain', await page.eval('POCKET.terrainHash()') !== terrainBefore);
  await page.eval('POCKET.render()');
  await page.shot(`${out}/battle.png`);
  await page.eval('document.getElementById("menuBtn").click()');
  check('menu: pause opens during battle', await shown('pause'));
  await page.eval('document.getElementById("resume").click()');
  check('menu: resume returns to battle', !(await shown('pause')) && await shown('hud'));
  const completed = await page.eval(`(()=>{for(let i=0;i<8000&&POCKET.state.scene==='battle';i++){const s=POCKET.state;if(!s.locked&&s.currentPlayer===0){POCKET.autoAim();document.getElementById('fire').click();}POCKET.advance(.1,false);}return POCKET.state})()`);
  check('battle: complete quick match reaches results', completed.scene === 'results' && completed.turnCount === 20 && completed.stats.shots === 20 && completed.players.every(p=>p.shots===10&&p.remaining===0) && completed.stats.safetyTimeouts === 0, JSON.stringify({scene:completed.scene,turns:completed.turnCount,shots:completed.stats.shots}));
  check('battle: result scores are finite', completed.players.every(p=>Number.isFinite(p.score)) && (await shown('results')) && await page.eval('POCKET.validate().length===0'));
  check('battle: field canvas drawing', await page.eval('(()=>{const c=document.getElementById("field");if(!c)return false;const g=c.getContext("2d");const d=g.getImageData(0,c.height-40,c.width,1).data;let lit=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)lit++;return lit>c.width*.5})()'));
  await page.eval('document.getElementById("resultsTitle").click()');
  await sleep(800);
  check('menu: back to title after results', await shown('title'));
  await page.goto(target);
  await until(() => page.eval('!!window.POCKET && !!document.getElementById("quickPlay")'), {timeout: 60000, label: 'reload boot'});
  check('reload: title boots again', true);
  check('storage: origin storage usable (garage can persist)', await page.eval('(()=>{try{localStorage.setItem("tt-verify","1");const ok=localStorage.getItem("tt-verify")==="1";localStorage.removeItem("tt-verify");return ok}catch(e){return false}})()'));
  const bad = page.logs.filter(l => l.startsWith('EXCEPTION') || l.startsWith('error'));
  check('console: no exceptions or errors', bad.length === 0, bad.slice(0, 3).join(' | '));
} catch (e) {
  check('harness', false, e.message);
} finally {
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  writeFileSync(`${out}/verify.json`, JSON.stringify({target, results, logs: page.logs}, null, 2));
  await page.kill();
  process.exitCode = passed === results.length ? 0 : 1;
}
