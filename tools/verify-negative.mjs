// Prove that the smoke test fails when firing, turn advancement or results break.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve('.'),out=resolve('tools/out');mkdirSync(out,{recursive:true});
const html=readFileSync('index.html','utf8'),receipts=[];
for(const [name,patch,expected] of [
 ['fire',"document.getElementById('fire').addEventListener('click',e=>e.stopImmediatePropagation(),true);",'battle: fire consumes exactly one shot'],
 ['turn',"finishTurn=()=>{G.locked=false;G.scene='title';};",'battle: shot settles and advances the turn'],
 ['result',"showResults=()=>{G.locked=false;G.scene='title';};",'battle: complete quick match reaches results'],
]){
 const file=resolve(out,`disabled-${name}.html`);
 // The game also contains a </body> inside its demo iframe source string.
 const end=html.lastIndexOf('</body>');assert.ok(end>0);
 writeFileSync(file,(html.slice(0,end)+`<script>${patch}</script>`+html.slice(end)).replace('<head>',`<head><base href="${pathToFileURL(root+'/').href}">`));
 const run=spawnSync(process.execPath,['tools/verify.mjs',file],{encoding:'utf8',windowsHide:true,timeout:120000});
 const report=JSON.parse(readFileSync(resolve(out,'verify.json'),'utf8'));
 assert.equal(run.status,1,run.stdout+run.stderr);assert.equal(report.results.find(r=>r.name===expected)?.ok,false);
 const receipt={name,exitCode:run.status,expected,results:report.results};receipts.push(receipt);
 writeFileSync(resolve(out,`negative-${name}.json`),JSON.stringify(receipt,null,2));
 console.log(`PASS disabled ${name}: smoke fails on ${expected}`);
}
writeFileSync(resolve(out,'negative.json'),JSON.stringify(receipts,null,2));
