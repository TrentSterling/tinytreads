// Renders og-image.png (1200x630) from the real title screen: wordmark, the two hero tanks and the
// attract-mode battle underneath, with the buttons and footer hidden. Candidates are scored by how
// much weapon trail (bright colour) is on screen. Zero deps: node tools/og-shot.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {mkdirSync, copyFileSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import zlib from 'node:zlib';

const arg = process.argv.slice(2).find(a => !a.startsWith('--')) || 'index.html';
const target = /^https?:/.test(arg) ? arg : pathToFileURL(resolve(arg)).href;
const out = resolve('tools/out'); mkdirSync(out, {recursive: true});
// #stage is a fixed 1200x800 box scaled to fit the viewport (side bars at 1200x630), so shoot it at native
// scale and crop the 1200x630 band that holds the wordmark, the hero tanks and the attract battle.
const page = await launch({port: +(process.env.PORT || 9432), width: 1200, height: 800});
const CROP_Y = +(process.env.CROP_Y || 170);

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

function writePng(file, w, h, bpp, px) {
  const stride = w * bpp, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = bpp === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 6})), chunk('IEND', Buffer.alloc(0))]));
}
function cropPng(src, dst, x, y, w, h) {
  const img = readPng(src); const out = Buffer.alloc(w * h * img.bpp);
  for (let r = 0; r < h; r++) img.px.copy(out, r * w * img.bpp, ((y + r) * img.w + x) * img.bpp, ((y + r) * img.w + x + w) * img.bpp);
  writePng(dst, w, h, img.bpp, out);
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
  // Hide the buttons and the footer, then slide the hero block (wordmark + tanks) down so it sits right above the
  // attract battle instead of leaving an empty band across the middle of the card; the crop removes the top.
  await page.eval(`(()=>{const s=document.createElement('style');s.id='og';s.textContent='.title-actions,#titleSound,#fullscreenTitle,#titleCredits,#attractCaption,#credits,#title button{display:none !important}#titleContent,#titleTanks{transform:translateY(${process.env.SHIFT || 150}px)}.signature,.buildtag,.cornerbuttons{display:none !important}';document.head.append(s);for(const e of document.querySelectorAll('#title *')){if(e.children.length<=2&&/Made by|ARTILLERY CLUB/.test(e.textContent)&&e.textContent.length<40)e.style.display='none';}})()`);
  const shots = [];
  for (let i = 0; i < +(process.env.SHOTS || 14); i++) {
    await sleep(+(process.env.GAP || 700));
    const f = `${out}/og-candidate-${i}.png`;
    await page.shot(f);
    cropPng(f, f, 0, CROP_Y, 1200, 630);
    const score = trail(f);
    shots.push({f, score});
    console.log('candidate', i, 'trail pixels', score);
  }
  const best = shots.slice().sort((a, b) => b.score - a.score)[0];
  const dest = process.env.OUT || 'og-image.png';
  copyFileSync(best.f, resolve(dest));
  console.log('wrote', dest, 'from', best.f, 'score', best.score);
} finally { page.kill(); }
