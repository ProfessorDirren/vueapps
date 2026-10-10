import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../api/antiqvue.js',import.meta.url),'utf8');
const {validImage,POST}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('ANTIQVUE rejects renamed and oversized images',()=>{assert.equal(validImage('data:image/png;base64,'+Buffer.from('not an image at all').toString('base64')),false);assert.equal(validImage('data:image/png;base64,'+'A'.repeat(15*1024*1024)),false);assert.equal(validImage('data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64')),true)});
test('ANTIQVUE reports unavailable instead of fabricated analysis without credentials',async()=>{const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const r=await POST(new Request('https://localhost/api/antiqvue',{method:'POST'}));assert.equal(r.status,503);assert.match((await r.json()).error,/not configured/)}finally{if(previous!==undefined)process.env.OPENAI_API_KEY=previous}});
test('ANYVUE stays first, then ANIVUE and ANTIQVUE before ARMVUE',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const positions=['anyvue','anivue','antiqvue','armvue'].map(id=>html.indexOf(`id="app-${id}"`));assert.ok(positions.every(x=>x>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions)});
