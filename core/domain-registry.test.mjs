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

test('ordinary specialists expose their inherited domain contract without claiming unimplemented AI',async()=>{
 const domain=createSpecialistDomain('medivue');
 assert.ok(domain instanceof SpecialistVueDomain);
 assert.equal(domain.profile,SPECIALISTS.medivue);
 assert.equal(domain.capabilities.imageAnalysis,false);
 await assert.rejects(domain.assess({}),error=>error instanceof VueCoreError&&error.code==='not_implemented');
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
