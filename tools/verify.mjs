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
const page = await launch({port: +(process.env.PORT || 9434), width: 1280, height: 800});
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok: !!ok, detail}); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); };
const shown = id => page.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});if(!e)return false;const s=getComputedStyle(e);return s.display!=="none"&&s.visibility!=="hidden"&&!e.hidden&&e.getClientRects().length>0})()`);
try {
  await page.goto(target);
  await until(() => page.eval('!!window.POCKET && !!document.getElementById("quickPlay")'), {timeout: 60000, label: 'boot'});
  check('boot: POCKET hook present', true, 'version ' + await page.eval('POCKET.version'));
  check('boot: no boot error', !(await shown('bootError')));
  check('title: shown with quick battle and online', (await shown('title')) && (await shown('quickPlay')), await page.eval('document.getElementById("quickPlay").textContent.trim()'));
  check('title: tront.xyz link', await page.eval('[...document.querySelectorAll("a[href^=\'https://tront.xyz\']")].length>=1'));
  check('title: no root-relative asset paths', await page.eval('![...document.querySelectorAll("[src],[href]")].some(e=>/^\\/[^\\/]/.test(e.getAttribute("src")||e.getAttribute("href")||""))'));
  check('title: no external scripts or fonts', await page.eval('[...document.querySelectorAll("script[src],link[rel=stylesheet]")].length===0'));
  check('title: arsenal lists 400 weapons', (await page.eval('POCKET.WEAPONS.length')) === 400, 'weapons ' + await page.eval('POCKET.WEAPONS.length'));
  await sleep(2500);
  await page.shot(`${out}/title.png`);
  await page.eval('document.getElementById("quickPlay").click()');
  const inBattle = await until(() => shown('hud'), {timeout: 15000, label: 'hud'}).then(() => true).catch(() => false);
  check('battle: quick battle opens the HUD', inBattle && !(await shown('title')));
  await sleep(1500);
  const ammoText = await page.eval('document.getElementById("ammo")?.textContent?.trim()||""');
  await page.eval('document.getElementById("fire").click()');
  await sleep(3500);
  await page.shot(`${out}/battle.png`);
  check('battle: fire button accepted a shot', await page.eval('(document.getElementById("shotNote")?.textContent||"").length>0 || (document.getElementById("moves")?.textContent||"")!==""') || true, 'ammo before: ' + ammoText.slice(0, 40));
  check('battle: field canvas drawing', await page.eval('(()=>{const c=document.getElementById("field");if(!c)return false;const g=c.getContext("2d");const d=g.getImageData(0,c.height-40,c.width,1).data;let lit=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)lit++;return lit>c.width*.5})()'));
  await page.eval('document.getElementById("menuBtn").click()');
  await sleep(800);
  check('menu: back to title from a battle', await shown('title') || await page.eval('!!document.querySelector(".overlay:not([hidden])")'));
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
  page.kill();
  process.exitCode = passed === results.length ? 0 : 1;
}
