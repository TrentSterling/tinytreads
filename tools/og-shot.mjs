// Renders og-image.png (1200x630) from the real title screen: wordmark, the two hero tanks and the
// attract-mode battle underneath, with the buttons and footer hidden. Candidates are scored by how
// much weapon trail (bright colour) is on screen. Zero deps: node tools/og-shot.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {mkdirSync, copyFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import zlib from 'node:zlib';

const arg = process.argv.slice(2).find(a => !a.startsWith('--')) || 'index.html';
const target = /^https?:/.test(arg) ? arg : pathToFileURL(resolve(arg)).href;
const out = resolve('tools/out'); mkdirSync(out, {recursive: true});
const page = await launch({port: +(process.env.PORT || 9432), width: 1200, height: 630});

function readPng(file) {
  const buf = readFileSync(file); let pos = 8; const idat = []; let w = 0, h = 0, ct = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, x = line[i];
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(px, y * stride); prev = cur;
  }
  return {w, h, bpp, px};
}
// Saturated bright pixels in the lower two thirds (where the attract battle plays).
function trail(file) {
  const {w, h, bpp, px} = readPng(file); let n = 0;
  for (let y = Math.floor(h * .35); y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * bpp, r = px[i], g = px[i + 1], b = px[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 170 && mx - mn > 110) n++;
  }
  return n;
}
try {
  await page.goto(target);
  await until(() => page.eval('!!window.POCKET && !document.getElementById("title").hidden'), {timeout: 60000, label: 'boot'});
  await sleep(1500);
  await page.eval(`(()=>{const s=document.createElement('style');s.id='og';s.textContent='.title-actions,#titleSound,#fullscreenTitle,#titleCredits,#attractCaption,#credits,#title button{display:none !important}';document.head.append(s);})()`);
  const shots = [];
  for (let i = 0; i < +(process.env.SHOTS || 14); i++) {
    await sleep(+(process.env.GAP || 700));
    const f = `${out}/og-candidate-${i}.png`;
    await page.shot(f);
    const score = trail(f);
    shots.push({f, score});
    console.log('candidate', i, 'trail pixels', score);
  }
  const best = shots.slice().sort((a, b) => b.score - a.score)[0];
  const dest = process.env.OUT || 'og-image.png';
  copyFileSync(best.f, resolve(dest));
  console.log('wrote', dest, 'from', best.f, 'score', best.score);
} finally { page.kill(); }
