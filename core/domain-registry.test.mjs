import test from 'node:test';
import assert from 'node:assert/strict';
import { VueDomain, VueCoreError } from './index.js';
import { SPECIALISTS } from './specialists.js';
import { createSpecialistDomain, SpecialistVueDomain } from './domain-registry.js';
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
 const domain=createSpecialistDomain('anyvue');
 assert.ok(domain instanceof SpecialistVueDomain);
 assert.equal(domain.profile,SPECIALISTS.anyvue);
 assert.equal(domain.capabilities.imageAnalysis,false);
 await assert.rejects(domain.assess({}),error=>error instanceof VueCoreError&&error.code==='not_implemented');
});

test('unregistered specialist IDs are rejected',()=>{
 assert.throws(()=>createSpecialistDomain('inventedvue'),error=>error instanceof VueCoreError&&error.code==='unknown_specialist');
});
