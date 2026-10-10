import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('music and antiques have separate seven-language pages, client routes and portal positions',async()=>{
 const [portal,anti,music,client]=await Promise.all(['index.html','apps/antiqvue.js','musicgearvue.html','apps/musicgearvue.js'].map(read));
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar'])assert.ok(music.includes(`value="${language}"`));
 assert.doesNotMatch(anti,/vintage instruments|vintageinstrument|instrumentos vintage|винтажные инструменты/);
 assert.match(client,/fetch\('\/api\/musicgearvue'/);assert.match(client,/musicgearvue-language/);assert.match(client,/DJ/);
 const positions=['app-motovue','app-musicgearvue','app-plantvue'].map(id=>portal.indexOf(`id="${id}"`));assert.ok(positions.every(n=>n>=0));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
});
test('music endpoint handles a photo with a music-specific prompt and the shared spending budget',async()=>{
 const source=await read('api/musicgearvue.js');const {POST}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const names=['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));const originalFetch=globalThis.fetch;
 process.env.OPENAI_API_KEY='test';process.env.UPSTASH_REDIS_REST_URL='https://redis.example';process.env.UPSTASH_REDIS_REST_TOKEN='test';
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url==='https://redis.example'){assert.match(body[3],/^antiqvue:global:/);return Response.json({result:1})}assert.match(body.instructions,/MUSICGEARVUE/);assert.match(body.instructions,/DJ equipment/);assert.match(body.instructions,/new retail asking prices/);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Visible music equipment.'}]}]})};
 try{const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');const r=await POST(new Request('https://localhost/api/musicgearvue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,description:'DJ controller',language:'en',action:'observe'})}));assert.equal(r.status,200);assert.equal((await r.json()).analysis,'Visible music equipment.')}finally{globalThis.fetch=originalFetch;for(const n of names)if(before[n]===undefined)delete process.env[n];else process.env[n]=before[n]}
});
