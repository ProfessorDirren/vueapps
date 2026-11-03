import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AniVueDomain} from './anivue.js';
import {VueDomain,VueFlow} from './index.js';
import {createSpecialistDomain} from './domain-registry.js';

test('native ANIVUE text requests use inherited domain adapter',async()=>{
 const calls=[];
 const domain=new AniVueDomain({fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({domain:'anivue',answer:'Contact a veterinarian if symptoms worsen'})};
 }});
 assert.ok(domain instanceof VueDomain);
 const result=await domain.analyzeText({species:'horse',symptoms:['horseNotEating'],description:'  Not eating today ',language:'es'});
 assert.equal(result.domain,'anivue');
 assert.equal(calls[0].url,'/api/vue-router');
 assert.deepEqual(JSON.parse(calls[0].options.body),{question:'horse horseNotEating Not eating today',language:'es',previous:'anivue',newCase:true});
});

test('invalid text inputs never call the backend',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected')}});
 await assert.rejects(domain.analyzeText({species:'cow',description:'Not well'}),error=>error.code==='invalid_species');
 await assert.rejects(domain.analyzeText({species:'cat',description:'a'}),error=>error.code==='invalid_description');
 await assert.rejects(domain.analyzeText({species:'dog',description:'Coughing',language:'fr'}),error=>error.code==='invalid_language');
 assert.equal(calls,0);
});

test('native page delegates both text and photo to VUECORE domain',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 assert.match(page,/await flow\.run\(context\)/);
 assert.match(page,/flow\.domain\.analyzePhoto\(/);
});

test('registry forwards injected fetcher to ANIVUE specialist adapter',async()=>{
 let calls=0;
 const domain=createSpecialistDomain('anivue',{fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({domain:'anivue',answer:'Contact a veterinarian'})};
 }});
 assert.ok(domain instanceof AniVueDomain);
 await domain.analyzeText({species:'cat',description:'Cat not eating'});
 assert.equal(calls,1);
});

test('VUEFlow calls real ANIVUE text assessment exactly once for non-emergency symptoms',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({domain:'anivue',answer:'Observe symptoms and contact a veterinarian'})};
 }});
 const result=await new VueFlow(domain).run({category:'dog',symptoms:['other'],description:'Dog seems tired',language:'en'});
 assert.equal(result.source,'domain');
 assert.equal(result.assessment.summary,'Observe symptoms and contact a veterinarian');
 assert.equal(calls,1);
});
test('emergency symptoms never call text AI via VUEFlow',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected')}});
 const result=await new VueFlow(domain).run({category:'horse',symptoms:['horseColic'],description:'Severe colic',language:'sv'});
 assert.equal(result.assessment.severity,'emergency');
 assert.equal(calls,0);
});

test('ANIVUE preserves each of seven selected languages in live text assessments',async()=>{
 const languages=['en','es','sv','hi','zh-CN','ru','ar'];
 const calls=[];
 const domain=new AniVueDomain({fetcher:async(url,options)=>{
  calls.push(JSON.parse(options.body));
  return {ok:true,json:async()=>({domain:'anivue',answer:'Veterinary guidance'})};
 }});
 for(const language of languages){
  const result=await new VueFlow(domain).run({category:'cat',symptoms:['other'],description:'Cat has a mild rash',language});
  assert.equal(result.source,'domain',language);
  assert.equal(result.assessment.summary,'Veterinary guidance',language);
 }
 assert.deepEqual(calls.map(call=>call.language),languages);
 assert.ok(calls.every(call=>call.previous==='anivue'&&call.newCase===true));
});

test('ANIVUE emergency triage remains AI-free in all seven languages',async()=>{
 const languages=['en','es','sv','hi','zh-CN','ru','ar'];
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected network request')}});
 for(const language of languages){
  const result=await new VueFlow(domain).run({category:'horse',symptoms:['horseColic'],description:'Horse has severe colic',language});
  assert.equal(result.source,'safety-rule',language);
  assert.equal(result.assessment.severity,'emergency',language);
  assert.ok(result.assessment.summary.length>20,language);
 }
 assert.equal(calls,0);
});

test('explicit breathing distress in all seven supported languages triggers immediate triage',async()=>{
 const descriptions={
  en:'My dog has difficulty breathing',
  es:'Mi perro tiene dificultad para respirar',
  sv:'Min hund har svårt att andas',
  hi:'मेरे कुत्ते को सांस लेने में कठिनाई है',
  'zh-CN':'我的狗呼吸困难',
  ru:'Моей собаке трудно дышать',
  ar:'كلبي يعاني من صعوبة التنفس'
 };
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected network request')}});
 for(const [language,description] of Object.entries(descriptions)){
  const result=await new VueFlow(domain).run({category:'dog',symptoms:['other'],description,language});
  assert.equal(result.source,'safety-rule',language);
  assert.equal(result.assessment.severity,'emergency',language);
 }
 assert.equal(calls,0);
});

test('common alternate breathing phrases trigger emergency without AI',async()=>{
 const cases=[
  {language:'en',description:'My cat has trouble breathing'},
  {language:'sv',description:'Min katt kan inte andas'},
  {language:'es',description:'A mi gato le cuesta respirar'}
 ];
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected AI call')}});
 for(const {language,description} of cases){
  const result=await new VueFlow(domain).run({category:'cat',symptoms:['other'],description,language});
  assert.equal(result.source,'safety-rule',language);
  assert.equal(result.assessment.severity,'emergency',language);
 }
 assert.equal(calls,0);
});

test('English contracted cannot-breathe emergencies never wait for AI',async()=>{
 let calls=0;
 const domain=new AniVueDomain({fetcher:async()=>{calls++;throw Error('unexpected AI call')}});
 for(const description of ["My dog can't breathe","My dog can’t breathe"]){
  const result=await new VueFlow(domain).run({category:'dog',symptoms:['other'],description,language:'en'});
  assert.equal(result.source,'safety-rule');
  assert.equal(result.assessment.severity,'emergency');
 }
 assert.equal(calls,0);
});

test('native ANIVUE inline module JavaScript remains syntactically valid',()=>{
 const page=readFileSync(new URL('../anivue-core.html',import.meta.url),'utf8');
 const match=page.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match,'native ANIVUE inline module exists');
 const script=match[1].replace(/^import .*;$/gm,'');
 assert.doesNotThrow(()=>new Function(script));
});
