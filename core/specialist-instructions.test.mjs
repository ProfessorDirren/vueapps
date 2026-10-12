import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/vue-router.js';
import {specialistInstructions} from './specialist-instructions.js';
import {specialistPath} from './specialist-tree.js';
test('Swedish dog question carries explicit Spanish root contract and dog expertise to provider',async()=>{
 const saved={...process.env},old=globalThis.fetch;Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',OPENAI_API_KEY:'test'});let seen;
 globalThis.fetch=async(url,options)=>{const b=JSON.parse(options.body);if(url==='https://redis.test')return Response.json({result:b[1].includes('INCR')?1:[]});seen=b;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'¿Qué síntomas tiene tu perro?'}]}]})};
 try{const r=await POST(new Request('https://localhost/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Hund problem',language:'es'})}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.domain,'anivue');assert.equal(d.specialist_path,'corevue/anivue/dog');assert.match(seen.input,/Hund problem/);assert.match(seen.instructions,/explicitly selected Spanish \(es\)/);assert.match(seen.instructions,/MUST NOT change the selected response language/);assert.match(seen.instructions,/corevue\/anivue\/dog: Dog observations/);assert.match(seen.instructions,/inherit every parent method/);assert.equal(d.answer,'¿Qué síntomas tiene tu perro?')}finally{globalThis.fetch=old;process.env=saved}
});
test('all supported languages inherit root contract and every deep branch method',()=>{
 const selected=specialistPath('musicgearvue','Marshall JMP Folkesson amplifier');
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar']){const instructions=specialistInstructions(language,selected);assert.ok(instructions.includes('('+language+')'));for(const node of selected.lineage)assert.ok(instructions.includes(node.path+': '+node.method))}
 assert.throws(()=>specialistInstructions('unknown',selected));
});
