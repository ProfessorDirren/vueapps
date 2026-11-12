import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTORY_LANGUAGES,createFactoryTestRegistry,createFactoryTestApi} from './vuefactory.js';
import {SPECIALISTS} from './specialists.js';
import {routeQuestion} from './router.js';

const fixture={
 id:'bookvue',
 scope:'Book identification, edition comparison and collection research',
 method:'Identify author, title, publisher, ISBN, edition, printing, condition and provenance. Distinguish observed details from assumptions, use verifiable catalogues, and never assert authenticity or market value without corroboration.',
 labels:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,'Books '+l])),
 questions:Object.fromEntries(FACTORY_LANGUAGES.map(l=>[l,['Which item is it?','What evidence is available?','Which details are still unknown?']])),
 routingKeywords:['bibliography research','book edition'],
 sources:[['Library of Congress','https://www.loc.gov/']]
};
const registry=createFactoryTestRegistry(fixture,SPECIALISTS,routeQuestion);
const POST=createFactoryTestApi(registry);
const request=(question,language='en')=>new Request('https://localhost/api/vue-router',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,language})});

test('new VUE: all factory languages reach the correct specialist without production registration',async()=>{
 for(const language of FACTORY_LANGUAGES){
  const response=await POST(request('Please help with bibliography research',language));
  assert.equal(response.status,200,language);
  const data=await response.json();
  assert.equal(data.domain,'bookvue',language);
  assert.equal(data.guide.label,'Books '+language,language);
  assert.equal(data.guide.questions.length,3,language);
  assert.equal(data.testOnly,true);
  assert.equal(data.reviewRequired,true);
 }
 assert.equal(Object.hasOwn(SPECIALISTS,'bookvue'),false);
});

test('new VUE: existing specialist wins its own question',async()=>{
 const response=await POST(request('My dog is sick'));
 const data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.domain,'anivue');
 assert.equal(data.source,'existing');
 assert.equal(data.testOnly,true);
});

test('new VUE: invalid inputs fail closed before routing',async()=>{
 for(const bad of [request('x'),request('bibliography research','xx')]){
  const response=await POST(bad);
  assert.equal(response.status,400);
 }
 const get=await POST(new Request('https://localhost/api/vue-router'));
 assert.equal(get.status,405);
});

test('new VUE: factory API cannot claim a live, deployed or verified answer',async()=>{
 const response=await POST(request('book edition'));
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.testOnly,true);
 assert.equal(body.guide.reviewRequired,true);
 assert.equal(body.verified,undefined);
 assert.equal(body.departures,undefined);
});
