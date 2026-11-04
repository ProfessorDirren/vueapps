import test from 'node:test';
import assert from 'node:assert/strict';
import {VueDomain,VueCoreError,VueFlow} from './index.js';
import {createInformationalVueClass} from './specialist-factory.js';
import {createConfiguredSpecialistDomain} from './domain-registry.js';

test('new informational VUE inherits VUECORE and routes with English default',async()=>{
 const calls=[];
 const DemoVue=createInformationalVueClass({id:'demovue',method:'Compare evidence without inventing sources'});
 const domain=new DemoVue({fetcher:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({domain:'demovue',answer:'Evidence needed',kind:'ai_unverified'})};
 }});
 assert.ok(domain instanceof VueDomain);
 assert.equal(domain.capabilities.imageAnalysis,false);
 const result=await new VueFlow(domain).runText({description:'Review this item'});
 assert.equal(result.answer,'Evidence needed');
 assert.equal(calls[0].url,'/api/vue-router');
 assert.deepEqual(JSON.parse(calls[0].options.body),{question:'Review this item',language:'en',previous:'demovue',newCase:true});
});
test('new VUE rejects invalid language and input before network',async()=>{
 let called=false;
 const DemoVue=createInformationalVueClass({id:'demovue',method:'Research'});
 const domain=new DemoVue({fetcher:async()=>{called=true;throw Error('unexpected')}});
 await assert.rejects(domain.assess({description:'hello',language:'xx'}),e=>e.code==='invalid_language');
 await assert.rejects(domain.assess({description:'x'}),e=>e.code==='invalid_question');
 assert.equal(called,false);
});
test('new VUE rejects external endpoints and missing specialist methods',()=>{
 assert.throws(()=>createInformationalVueClass({id:'demo',method:'x',endpoint:'https://evil.example/api'}),e=>e instanceof VueCoreError&&e.code==='invalid_endpoint');
 assert.throws(()=>createInformationalVueClass({id:'demo',method:' '}),e=>e.code==='invalid_method');
});
test('new VUE fails closed on wrong domain, malformed response, and timeout',async()=>{
 const DemoVue=createInformationalVueClass({id:'demovue',method:'Research'});
 for(const fetcher of [
  async()=>({ok:true,json:async()=>({domain:'other',answer:'Wrong'})}),
  async()=>({ok:true,json:async()=>{throw Error('bad JSON')}}),
  async()=>{const e=new Error('timed out');e.name='TimeoutError';throw e}
 ]){
  const domain=new DemoVue({fetcher});
  await assert.rejects(domain.assess({description:'Please research'}),e=>e instanceof VueCoreError);
 }
});

test('registry creates a new configured VUE without specialist-specific adapter code',async()=>{
 const domain=createConfiguredSpecialistDomain({id:'newvue',method:'Ask for evidence'},
  {fetcher:async(_url,options)=>({ok:true,json:async()=>({domain:'newvue',answer:'Checked '+JSON.parse(options.body).language})})});
 assert.ok(domain instanceof VueDomain);
 assert.equal(domain.id,'newvue');
 assert.equal((await new VueFlow(domain).runText({description:'Investigate this',language:'es'})).answer,'Checked es');
});

import {listSpecialistDefinitions} from './domain-registry.js';
test('shared specialist manifest exposes stable, immutable onboarding definitions',()=>{
 const definitions=listSpecialistDefinitions();
 assert.ok(definitions.some(x=>x.id==='vinylvue'&&x.method));
 assert.ok(definitions.some(x=>x.id==='anivue'&&x.method));
 assert.ok(Object.isFrozen(definitions));
 assert.ok(Object.isFrozen(definitions[0]));
});

import {ROUTED_SPECIALIST_IDS} from './router.js';
test('router specialists exist in registry',()=>{
 const ids=listSpecialistDefinitions().map(item=>item.id);
 for(const id of ROUTED_SPECIALIST_IDS)assert.ok(ids.includes(id),id);
});
