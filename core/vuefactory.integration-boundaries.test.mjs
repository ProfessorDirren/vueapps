import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SPECIALISTS} from './specialists.js';
import {MEMORY_DOMAINS} from './memory.js';
import {ROUTED_SPECIALIST_IDS,routeQuestion} from './router.js';
import {FACTORY_LANGUAGES,createFactoryTestRegistry,createFactoryTestApi,validateVueActivation,previewVueCoreSourcePatch} from './vuefactory.js';
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
  body:JSON.stringify({language:'en',question:'medication leaflet',previous:'learningvue'})
 });
 const response=await routeApi(request);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.domain,'medivue');
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

test('all seven supported languages preserve API validation and private-data rejection',async()=>{
 for(const language of FACTORY_LANGUAGES){
  const request=new Request('https://localhost/api/vue-router',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({language,question:'Contact me at person@example.com about study planning'})
  });
  const response=await routeApi(request);
  assert.equal(response.status,400,'private identifier rejected for '+language);
  assert.equal((await response.json()).error,'Invalid public question');
 }
});
test('all seven languages retain localized MEDIVUE API response',async()=>{
 for(const language of FACTORY_LANGUAGES){
  const request=new Request('https://localhost/api/vue-router',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({language,question:'medication leaflet'})
  });
  const response=await routeApi(request);
  assert.equal(response.status,200,'language '+language);
  const body=await response.json();
  assert.equal(body.domain,'medivue');
  assert.equal(body.kind,'local_guidance');
  assert.equal(typeof body.answer,'string');
  assert.ok(body.answer.length>20);
 }
});

test('VUEFACTORY sandbox API rejects personal identifiers in all seven languages',async()=>{
 const sandbox=createFactoryTestApi(createFactoryTestRegistry(definition,SPECIALISTS,routeQuestion));
 for(const language of FACTORY_LANGUAGES){
  const request=new Request('https://localhost/factory-preview',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({language,question:'study planning: email me at person@example.com'})
  });
  const response=await sandbox(request);
  assert.equal(response.status,400,'sandbox privacy for '+language);
 }
});

test('factory sandbox never intercepts emergency animal routing in any supported language',async()=>{
 const sandbox=createFactoryTestApi(createFactoryTestRegistry(definition,SPECIALISTS,routeQuestion));
 for(const language of FACTORY_LANGUAGES){
  const request=new Request('https://localhost/factory-preview',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({language,question:'My dog cannot breathe and needs urgent help with study planning'})
  });
  const response=await sandbox(request);
  assert.equal(response.status,200,'emergency route for '+language);
  const body=await response.json();
  assert.equal(body.domain,'anivue','ANIVUE precedence for '+language);
  assert.equal(body.source,'existing');
  assert.equal(body.testOnly,true);
  assert.equal(body.answer,null);
 }
});

test('factory sandbox does not create or register specialists in real VUECORE',async()=>{
 const before=Object.keys(SPECIALISTS).sort();
 const memoryBefore=[...MEMORY_DOMAINS];
 const registry=createFactoryTestRegistry(definition,SPECIALISTS,routeQuestion);
 assert.equal(registry.isRegistered('learningvue'),true);
 assert.equal(Object.hasOwn(SPECIALISTS,'learningvue'),false);
 assert.deepEqual(Object.keys(SPECIALISTS).sort(),before);
 assert.deepEqual([...MEMORY_DOMAINS],memoryBefore);
 const sandbox=createFactoryTestApi(registry);
 const response=await sandbox(new Request('https://localhost/factory-preview',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({language:'es',question:'study planning'})
 }));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.domain,'learningvue');
 assert.equal(result.testOnly,true);
 assert.equal(result.reviewRequired,true);
 assert.equal(result.guide.label,'Education es');
 assert.equal(Object.hasOwn(SPECIALISTS,'learningvue'),false);
 assert.equal(MEMORY_DOMAINS.includes('learningvue'),false);
});

test('activation fails closed if any of seven localized question sets is missing',()=>{
 for(const language of FACTORY_LANGUAGES){
  const incomplete={...definition,questions:{...definition.questions}};
  delete incomplete.questions[language];
  assert.throws(()=>validateVueActivation(incomplete,Object.keys(SPECIALISTS)),new RegExp('Exactly three questions required: '+language.replace('-','\\-')));
 }
});
test('activation rejects duplicate specialist IDs and keyword collisions',()=>{
 assert.throws(()=>validateVueActivation({...definition,id:'anivue'},Object.keys(SPECIALISTS)),/Specialist already registered/);
 assert.throws(()=>validateVueActivation(definition,Object.keys(SPECIALISTS),['study planning']),/Routing keyword collision/);
});

test('review-only patch adds all seven questions without changing live VUECORE files',async()=>{
 const originals={
  'core/specialists.js':await readFile(new URL('./specialists.js',import.meta.url),'utf8'),
  'core/router.js':await readFile(new URL('./router.js',import.meta.url),'utf8')
 };
 const patch=previewVueCoreSourcePatch(definition,originals,Object.keys(SPECIALISTS));
 const specialistPatch=patch.files['core/specialists.js'];
 const routerPatch=patch.files['core/router.js'];
 assert.match(specialistPatch,/learningvue:/);
 for(const language of FACTORY_LANGUAGES){
  assert.ok(specialistPatch.includes(JSON.stringify(language)),'missing '+language+' questions');
  assert.ok(specialistPatch.includes(JSON.stringify(definition.questions[language][0])),'missing '+language+' prompt');
 }
 assert.match(routerPatch,/\['learningvue',3,/);
 assert.equal(patch.automaticApply,false);
 assert.equal(patch.productionReady,false);
 assert.equal(await readFile(new URL('./specialists.js',import.meta.url),'utf8'),originals['core/specialists.js']);
 assert.equal(await readFile(new URL('./router.js',import.meta.url),'utf8'),originals['core/router.js']);
});

test('source patch rejects duplicate specialist declarations despite alternate formatting',async()=>{
 const originals={
  'core/specialists.js':await readFile(new URL('./specialists.js',import.meta.url),'utf8'),
  'core/router.js':await readFile(new URL('./router.js',import.meta.url),'utf8')
 };
 const cases=[
  {...originals,'core/specialists.js':originals['core/specialists.js'].replace('export const SPECIALISTS=Object.freeze({','export const SPECIALISTS=Object.freeze({\nlearningvue : {scope:"duplicate"},')},
  {...originals,'core/router.js':originals['core/router.js'].replace('const rules=[','const rules=[\n [ "learningvue" , 3, /duplicate/iu ],')}
 ];
 cases.push({...originals,'core/specialists.js':originals['core/specialists.js'].replace('export const SPECIALISTS=Object.freeze({','export const SPECIALISTS=Object.freeze({\n "learningvue" : {scope:"duplicate"},')});
 for(const files of cases)assert.throws(()=>previewVueCoreSourcePatch(definition,files,Object.keys(SPECIALISTS)),/Specialist already in source/);
});
