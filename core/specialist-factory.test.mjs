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

test('all informational VUEs have router rules or an explicit default',()=>{
 const routed=new Set(ROUTED_SPECIALIST_IDS);
 for(const definition of listSpecialistDefinitions()){
  if(definition.id==='anyvue')continue;
  assert.ok(routed.has(definition.id),'Missing router rule: '+definition.id);
 }
 assert.equal(routed.size,ROUTED_SPECIALIST_IDS.length);
});

import {readFileSync} from 'node:fs';
test('portal specialist cards match the shared VUECORE registry',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const cardIds=[...html.matchAll(/id="app-([a-z0-9-]+)"/g)].map(match=>match[1]);
 const registryIds=listSpecialistDefinitions().map(item=>item.id);
 assert.deepEqual([...cardIds].sort(),[...registryIds].sort());
});

test('portal uses VUECORE manifest without replacing localized cards',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/import \{listSpecialistDefinitions\} from '\.\/core\/domain-registry\.js'/);
 assert.match(html,/\[\.\.\.listSpecialistDefinitions\(\)\]\.sort\(/);
 assert.match(html,/appGrid\.append\(card\)/);
 assert.match(html,/id="app-anivue"/);
 assert.match(html,/https:\/\/www\.anivueapp\.se/);
});

test('new portal VUE cards are noninteractive until workspace review',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/document\.createElement\('article'\)/);
 assert.match(html,/description\.textContent=definition\.scope/);
 assert.match(html,/Coming soon · Workspace not yet available/);
 assert.match(html,/pending\.append\(heading,description,status\)/);
});

test('server router rejects unregistered specialists before followup',()=>{
 const source=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
 assert.match(source,/isRegisteredSpecialist\(route\.domain\)/);
 assert.match(source,/Unregistered VUE specialist/);
});

import {isRegisteredSpecialist} from './specialists.js';
test('registration gate rejects unknown and inherited object keys',()=>{
 assert.equal(isRegisteredSpecialist('anivue'),true);
 assert.equal(isRegisteredSpecialist('toString'),false);
 assert.equal(isRegisteredSpecialist('__proto__'),false);
 assert.equal(isRegisteredSpecialist(null),false);
});

import {MEMORY_DOMAINS} from './memory.js';
test('case memory domains are inherited from the specialist registry',()=>{
 assert.deepEqual(MEMORY_DOMAINS,listSpecialistDefinitions().map(item=>item.id).sort());
 assert.ok(Object.isFrozen(MEMORY_DOMAINS));
});

test('every VUE definition has a unique valid method and scope',()=>{
 const definitions=listSpecialistDefinitions();
 const ids=new Set();
 for(const entry of definitions){
  assert.match(entry.id,/^[a-z][a-z0-9-]*$/);
  assert.ok(typeof entry.scope==='string'&&entry.scope.trim().length>0,entry.id);
  assert.ok(typeof entry.method==='string'&&entry.method.trim().length>0,entry.id);
  assert.equal(ids.has(entry.id),false,'Duplicate VUE: '+entry.id);
  ids.add(entry.id);
 }
});
