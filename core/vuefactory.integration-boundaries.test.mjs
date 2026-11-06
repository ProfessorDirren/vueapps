import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SPECIALISTS} from './specialists.js';
import {MEMORY_DOMAINS} from './memory.js';
import {ROUTED_SPECIALIST_IDS,routeQuestion} from './router.js';
import {FACTORY_LANGUAGES,previewVueCoreSourcePatch} from './vuefactory.js';
import {POST as routeApi} from '../api/vue-router.js';

const labels=Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,'Education '+lang]));
const questions=Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,[
 'Which subject do you want to learn?',
 'What is your current experience level?',
 'Which learning resources are available?'
]]));
const definition={id:'learningvue',scope:'General educational learning and study methods',
 method:'Offer safe educational learning strategies with clearly scoped advice. Ask about goals, available resources and experience. Never claim professional certification or invent source material.',
 labels,questions,routingKeywords:['study planning','learning methods']};

test('real VUECORE registry, memory and router declarations remain aligned',()=>{
 const ids=Object.keys(SPECIALISTS).sort();
 assert.deepEqual([...MEMORY_DOMAINS].sort(),ids);
 assert.deepEqual([...ROUTED_SPECIALIST_IDS].sort(),ids.filter(id=>id!=='anyvue').sort());
});
test('review-only generated specialist is absent from real memory and router',async()=>{
 const sources={
  'core/specialists.js':await readFile(new URL('./specialists.js',import.meta.url),'utf8'),
  'core/router.js':await readFile(new URL('./router.js',import.meta.url),'utf8')
 };
 const patch=previewVueCoreSourcePatch(definition,sources,Object.keys(SPECIALISTS));
 assert.equal(patch.productionReady,false);
 assert.equal(patch.automaticApply,false);
 assert.equal(Object.hasOwn(SPECIALISTS,'learningvue'),false);
 assert.equal(MEMORY_DOMAINS.includes('learningvue'),false);
 assert.equal(ROUTED_SPECIALIST_IDS.includes('learningvue'),false);
 assert.equal(routeQuestion('study planning').domain,'anyvue');
});

test('production API rejects an unregistered proposed specialist as previous domain',async()=>{
 const request=new Request('https://localhost/api/vue-router',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({language:'en',question:'study planning',previous:'learningvue'})
 });
 const response=await routeApi(request);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.notEqual(result.domain,'learningvue');
});
test('production API rejects unsupported language before routing',async()=>{
 const request=new Request('https://localhost/api/vue-router',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({language:'xx',question:'study planning'})
 });
 const response=await routeApi(request);
 assert.equal(response.status,400);
 assert.equal((await response.json()).error,'Invalid language');
});
