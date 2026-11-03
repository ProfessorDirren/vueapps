import test from 'node:test';
import assert from 'node:assert/strict';
import { VueDomain, VueCoreError } from './index.js';
import { SPECIALISTS } from './specialists.js';
import { createSpecialistDomain, SpecialistVueDomain, AnyVueDomain } from './domain-registry.js';
import { AniVueDomain } from './anivue.js';

test('every declared specialist has a VUECORE-derived domain',()=>{
 for(const id of Object.keys(SPECIALISTS)){
  const instance=createSpecialistDomain(id);
  assert.ok(instance instanceof VueDomain,id);
  assert.equal(instance.id,id);
 }
});

test('ANIVUE uses its safety-specialized subclass, not a generic placeholder',()=>{
 const domain=createSpecialistDomain('anivue');
 assert.ok(domain instanceof AniVueDomain);
 assert.equal(domain.emergencyCheck({species:'horse',symptoms:['horseColic']}).severity,'emergency');
});

test('registered specialists use the shared router without pretending mismatched answers belong to them',async()=>{
 const calls=[];
 const domain=createSpecialistDomain('vinylvue',{fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({domain:'vinylvue',answer:'Check the matrix number',kind:'ai_unverified'})};
 }});
 assert.ok(domain instanceof SpecialistVueDomain);
 assert.equal(domain.profile,SPECIALISTS.vinylvue);
 assert.equal(domain.capabilities.imageAnalysis,false);
 const result=await domain.assess({description:'Identify this pressing',language:'sv'});
 assert.equal(result.domain,'vinylvue');
 assert.equal(result.answer,'Check the matrix number');
 assert.equal(calls[0].url,'/api/vue-router');
 assert.deepEqual(JSON.parse(calls[0].options.body),{question:'Identify this pressing',language:'sv',previous:'vinylvue',newCase:true});
});
test('shared specialist adapter rejects invalid inputs and mismatched routing',async()=>{
 let calls=0;
 const domain=createSpecialistDomain('medivue',{fetcher:async()=>{calls++;return {ok:true,json:async()=>({domain:'anyvue',answer:'Wrong specialist'})}}});
 await assert.rejects(domain.assess({description:'x'}),e=>e.code==='invalid_question');
 await assert.rejects(domain.assess({description:'Medication side effects',language:'xx'}),e=>e.code==='invalid_language');
 assert.equal(calls,0);
 await assert.rejects(domain.assess({description:'Medication side effects'}),e=>e.code==='specialist_mismatch');
 assert.equal(calls,1);
});
test('unregistered specialist IDs are rejected',()=>{
 assert.throws(()=>createSpecialistDomain('inventedvue'),error=>error instanceof VueCoreError&&error.code==='unknown_specialist');
});

test('ANYVUE page uses real registered VUECORE adapter',async()=>{
 const calls=[];
 const domain=createSpecialistDomain('anyvue',{fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({synthesis:'Test synthesis',perspectives:[],disclaimer:'Test only'})};
 }});
 assert.ok(domain instanceof AnyVueDomain);
 assert.ok(domain instanceof VueDomain);
 const result=await domain.assess({description:'  Explain a question  '});
 assert.equal(result.synthesis,'Test synthesis');
 assert.equal(calls[0].url,'/api/anyvue');
 assert.deepEqual(JSON.parse(calls[0].options.body),{question:'Explain a question'});
});

test('ANYVUE rejects invalid questions before contacting provider',async()=>{
 let called=false;
 const domain=createSpecialistDomain('anyvue',{fetcher:async()=>{called=true;throw Error('unexpected')}});
 await assert.rejects(domain.assess({description:'x'}),error=>error.code==='invalid_question');
 assert.equal(called,false);
});

test('every informational VUE routes through its own inherited assessment contract',async()=>{
 for(const id of Object.keys(SPECIALISTS).filter(x=>!['anivue','anyvue'].includes(x))){
  const calls=[];
  const domain=createSpecialistDomain(id,{fetcher:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,json:async()=>({domain:id,answer:'Specialist guidance',kind:'ai_unverified'})};
  }});
  assert.ok(domain instanceof SpecialistVueDomain,id);
  const result=await domain.assess({description:'Please assess this example',language:'es'});
  assert.equal(result.domain,id);
  assert.equal(calls.length,1,id);
  assert.equal(calls[0].url,'/api/vue-router',id);
  assert.deepEqual(JSON.parse(calls[0].options.body),{question:'Please assess this example',language:'es',previous:id,newCase:true},id);
 }
});

test('shared specialist router requests have a bounded timeout signal',async()=>{
 const domain=createSpecialistDomain('vinylvue',{fetcher:async(_url,options)=>{
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.signal.aborted,false);
  return {ok:true,json:async()=>({domain:'vinylvue',answer:'Unverified example'})};
 }});
 await domain.assess({description:'What is this record?'});
});
test('shared specialist router fails closed on upstream errors and empty answers',async()=>{
 const unavailable=createSpecialistDomain('musicgearvue',{fetcher:async()=>({ok:false})});
 await assert.rejects(unavailable.assess({description:'Identify amplifier'}),e=>e.code==='service_unavailable');
 const empty=createSpecialistDomain('musicgearvue',{fetcher:async()=>({ok:true,json:async()=>({domain:'musicgearvue',answer:' '})})});
 await assert.rejects(empty.assess({description:'Identify amplifier'}),e=>e.code==='specialist_mismatch');
});

test('shared specialist adapter reports timeout and network failures consistently',async()=>{
 for(const [name,code] of [['TimeoutError','service_timeout'],['AbortError','service_timeout'],['TypeError','service_unavailable']]){
  const domain=createSpecialistDomain('vinylvue',{fetcher:async()=>{const error=new Error('network failure');error.name=name;throw error;}});
  await assert.rejects(domain.assess({description:'Assess this record'}),error=>error instanceof VueCoreError&&error.code===code,name);
 }
});

test('shared specialist adapter handles malformed JSON and null responses without crashing',async()=>{
 const malformed=createSpecialistDomain('vinylvue',{fetcher:async()=>({ok:true,json:async()=>{throw new SyntaxError('invalid JSON')}})});
 await assert.rejects(malformed.assess({description:'Assess this pressing'}),error=>error instanceof VueCoreError&&error.code==='invalid_response');
 const empty=createSpecialistDomain('vinylvue',{fetcher:async()=>({ok:true,json:async()=>null})});
 await assert.rejects(empty.assess({description:'Assess this pressing'}),error=>error instanceof VueCoreError&&error.code==='specialist_mismatch');
});
