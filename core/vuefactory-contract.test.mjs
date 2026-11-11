import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIALISTS} from './specialists.js';
import {ROUTED_SPECIALIST_IDS,routeQuestion} from './router.js';
import {FACTORY_LANGUAGES,validateVueDefinition,checkVueCollision} from './vuefactory.js';

// Shared contract: new specialists must be registered in VUECORE, not hidden in a page.
test('VUEFACTORY contract: routed specialists exist in the central registry',()=>{
 const ids=Object.keys(SPECIALISTS);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(new Set(ROUTED_SPECIALIST_IDS).size,ROUTED_SPECIALIST_IDS.length);
 for(const id of ROUTED_SPECIALIST_IDS)assert.ok(SPECIALISTS[id],id+' is not registered');
 for(const [id,profile] of Object.entries(SPECIALISTS)){
  assert.match(id,/^[a-z][a-z0-9]*vue$/);
  assert.ok(profile.scope?.trim(),id+' missing scope');
  assert.ok(profile.method?.trim(),id+' missing method');
 }
});

test('VUEFACTORY contract: every new VUE needs all base languages',()=>{
 const definition={id:'examplevue',scope:'A clearly bounded specialist scope',method:'Ask what the user wants, check the available evidence, identify uncertainty, give cautious next steps and do not invent current facts or sources.',labels:Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,'Example '+lang]))};
 assert.equal(validateVueDefinition(definition).id,'examplevue');
 for(const lang of FACTORY_LANGUAGES){
  const labels={...definition.labels};
  delete labels[lang];
  assert.throws(()=>validateVueDefinition({...definition,labels}),/label/i,lang);
 }
});

test('VUEFACTORY contract: new VUE cannot silently replace a registered specialist',()=>{
 const definition={id:'examplevue',scope:'A clearly bounded specialist scope',method:'Ask what the user wants, check the available evidence, identify uncertainty, give cautious next steps and do not invent current facts or sources.',labels:Object.fromEntries(FACTORY_LANGUAGES.map(lang=>[lang,'Example '+lang]))};
 assert.throws(()=>checkVueCollision({...definition,id:'anivue'},Object.keys(SPECIALISTS)),/already registered/);
});

test('VUECORE contract: a new question does not inherit an unrelated specialist',()=>{
 assert.equal(routeQuestion('min hund är sjuk','armvue').domain,'anivue');
 assert.equal(routeQuestion('min gitarr är trasig','anivue').domain,'musicgearvue');
 assert.equal(routeQuestion('När går nästa tåg från Jordbro till Stockholm City?','anivue').domain,'commutvue');
});
