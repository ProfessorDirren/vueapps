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
 const source=await read('api/musicgearvue.js');const {POST}=await import('data:text/javascript;base64,'+Buffer.from(source.replaceAll("../core/memory-context.js",new URL("./memory-context.js",import.meta.url).href).replaceAll("../core/specialist-memory.js",new URL("./specialist-memory.js",import.meta.url).href)).toString('base64'));
 const names=['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));const originalFetch=globalThis.fetch;
 process.env.OPENAI_API_KEY='test';process.env.UPSTASH_REDIS_REST_URL='https://redis.example';process.env.UPSTASH_REDIS_REST_TOKEN='test';
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url==='https://redis.example'){assert.match(body[3],/^antiqvue:global:/);return Response.json({result:1})}assert.match(body.instructions,/MUSICGEARVUE/);assert.match(body.instructions,/DJ equipment/);assert.match(body.instructions,/new retail asking prices/);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Visible music equipment.'}]}]})};
 try{const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');const r=await POST(new Request('https://localhost/api/musicgearvue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,description:'DJ controller',language:'en',action:'observe'})}));assert.equal(r.status,200);assert.equal((await r.json()).analysis,'Visible music equipment.')}finally{globalThis.fetch=originalFetch;for(const n of names)if(before[n]===undefined)delete process.env[n];else process.env[n]=before[n]}
});
const apiSource=await read('api/musicgearvue.js');
const refined=await import('data:text/javascript;base64,'+Buffer.from(apiSource.replaceAll("../core/memory-context.js",new URL("./memory-context.js",import.meta.url).href).replaceAll("../core/specialist-memory.js",new URL("./specialist-memory.js",import.meta.url).href)).toString('base64'));
test('Marshall package questions address each component without assuming cabinet date or asking for disassembly',()=>{
 const q=refined.gearQuestions('Marshall JMP 1987 50W Folkesson Mk III and 4x12 cabinet with 1970 speakers','en');
 assert.equal(q.length,4);assert.match(q[0],/modification documentation/);assert.match(q[2],/existing speaker-label photos/);assert.match(q[2],/Do not open/);assert.match(q[3],/footswitches/);
 const cabinet=refined.gearQuestions('Marshall 4x12 cabinet','en');assert.doesNotMatch(cabinet.join(' '),/Amplifier head/);
});
test('DJ and instrument questions stay relevant in every supported language',()=>{
 for(const language of ['en','sv','es','hi','zh-CN','ru','ar'])assert.equal(refined.gearQuestions('Pioneer DDJ controller',language).length,2);
 assert.match(refined.gearQuestions('Pioneer DDJ controller','en')[0],/licences/);
 assert.match(refined.gearQuestions('Fender guitar','en')[0],/fret/);
});
test('research cards show item names, remove tracking and deduplicate localized copies and owner listings',()=>{
 const sources=[{url:'https://reverb.com/item/1234-marshall-jmp-head?utm_source=test'},{url:'https://reverb.com/ca/item/1234-marshall-jmp-head'},{url:'https://reverb.com/item/5678-owner-cabinet'}];
 const links=refined.researchLinks(sources,[],'My listing: https://reverb.com/item/5678-owner-cabinet');
 assert.equal(links.length,1);assert.equal(links[0].title,'marshall jmp head');assert.equal(links[0].host,'reverb.com');assert.equal(links[0].url,'https://reverb.com/item/1234-marshall-jmp-head');assert.equal(links[0].amount,undefined);
});
test('music value report retains separate photo observations, exact owner claims, targeted questions and contextual source names',async()=>{
 const names=['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));const fetchBefore=globalThis.fetch;let calls=0;
 process.env.OPENAI_API_KEY='test';process.env.UPSTASH_REDIS_REST_URL='https://redis.example';process.env.UPSTASH_REDIS_REST_TOKEN='test';
 globalThis.fetch=async(url,options)=>{if(url==='https://redis.example')return Response.json({result:1});calls++;const payload=JSON.parse(options.body);
 if(calls===1)return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://reverb.com/item/1234-marshall-jmp-head'}]}},{type:'message',content:[{type:'output_text',text:'No disclosed independent sale prices found.'}]}]});
 assert.equal(payload.input[0].content.length,1);assert.equal(payload.input[0].content[0].type,'input_image');assert.match(payload.instructions,/separate short paragraphs/i);
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Amplifier head: black finish and gold controls.\n\nCabinet: beige grille and visible Marshall logo.'}]}]});};
 try{const owner='Marshall JMP 1987 50 W, modified by Folkesson; 4x12 cabinet with 1970 speakers';const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');const r=await refined.POST(new Request('https://localhost/api/musicgearvue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,description:owner,language:'en',action:'value'})}));assert.equal(r.status,200);const report=await r.json();assert.equal(report.sections[1].body,owner);assert.match(report.sections[0].body,/Cabinet:/);assert.equal(report.followUpQuestions.length,4);assert.equal(report.researchSources[0].title,'marshall jmp head');assert.equal(report.valuation,null);assert.equal(calls,2)}finally{globalThis.fetch=fetchBefore;for(const name of names)if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name]}
});
