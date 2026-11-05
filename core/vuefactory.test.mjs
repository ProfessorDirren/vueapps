import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTORY_LANGUAGES,validateVueDefinition,scaffoldVue,checkVueCollision,buildRoutingCandidates} from './vuefactory.js';
const definition={
 id:'bookvue',
 scope:'Book identification, edition comparison and collection research',
 method:'Identify author, title, publisher, ISBN, edition, printing, condition and provenance. Distinguish observed details from assumptions, use verifiable catalogues, and never assert authenticity or market value without corroboration.',
 labels:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Books'])),
 sources:[['Library of Congress','https://www.loc.gov/']]
};
test('factory generates a deterministic reviewable profile and checklist',()=>{
 const a=scaffoldVue(definition),b=scaffoldVue(definition);
 assert.deepEqual(a,b);
 assert.match(a.files['generated/bookvue/profile.js'],/Book identification/);
 assert.match(a.files['generated/bookvue/RELEASE-CHECKLIST.md'],/manual review required/);
 assert.equal(Object.keys(a.files).length,5);
 assert.match(a.files['generated/bookvue/registry-snippet.txt'],/\"bookvue\":/);
 assert.match(a.files['generated/bookvue/routing-review.txt'],/collision-tested/);
 const plan=JSON.parse(a.files['generated/bookvue/integration-plan.json']);
 assert.equal(plan.status,'review-required');
 assert.equal(plan.deploy.automatic,false);
 assert.equal(plan.routing.collisionReviewRequired,true);
 assert.equal(plan.languages.length,7);
});
test('factory requires seven languages and substantive methods',()=>{
 assert.throws(()=>validateVueDefinition({...definition,labels:{en:'Books'}}),/Missing\/invalid label/);
 assert.throws(()=>validateVueDefinition({...definition,method:'Short'}),/Method/);
 assert.throws(()=>validateVueDefinition({...definition,id:'../bookvue'}),/id/);
});
test('factory rejects credentialed or insecure sources',()=>{
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','http://example.org']]}),/HTTPS/);
 assert.throws(()=>validateVueDefinition({...definition,sources:[['bad','https://user:pass@example.org']]}),/HTTPS/);
});
test('factory never writes, registers, deploys or calls an AI service',()=>{
 const a=scaffoldVue(definition);
 assert.ok(Object.keys(a.files).every(p=>p.startsWith('generated/')));
 assert.ok(!Object.keys(a.files).some(p=>p.includes('api/')));
});

test('factory rejects existing specialist names before writing files',()=>{
 assert.throws(()=>checkVueCollision({...definition,id:'anivue'},['anivue','anyvue']),/already registered/);
 assert.equal(checkVueCollision(definition,['anivue','anyvue']).id,'bookvue');
 assert.throws(()=>checkVueCollision(definition,'anivue'),/Invalid existing/);
});

test('routing candidates are literal, review-only and collision-aware',()=>{
 const input={...definition,routingKeywords:['ISBN','book edition','författare']};
 const result=buildRoutingCandidates(input,['isbn','vinyl']);
 assert.deepEqual(result.collisions,['isbn']);
 assert.equal(result.automaticRegistration,false);
 assert.deepEqual(JSON.parse(scaffoldVue(input).files['generated/bookvue/routing-candidates.json']).keywords,['isbn','book edition','författare']);
 assert.throws(()=>buildRoutingCandidates({...definition,routingKeywords:['book.*','isbn']}),/Unsafe/);
 assert.throws(()=>buildRoutingCandidates({...definition,routingKeywords:['ISBN','isbn']}),/Duplicate/);
});
