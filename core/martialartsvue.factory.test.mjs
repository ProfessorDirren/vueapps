import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SPECIALISTS} from './specialists.js';
import {routeQuestion} from './router.js';
import {checkVueCollision,scaffoldVue,createFactoryTestRegistry,createFactoryTestApi,FACTORY_LANGUAGES} from './vuefactory.js';

const definition=JSON.parse(await readFile(new URL('../examples/vuefactory-martialartsvue.json',import.meta.url),'utf8'));
test('MARTIALARTSVUE factory definition, languages and safe draft',()=>{
 const d=checkVueCollision(definition,Object.keys(SPECIALISTS));
 assert.equal(d.id,'martialartsvue');
 assert.deepEqual(Object.keys(d.labels),FACTORY_LANGUAGES);
 const draft=scaffoldVue(definition);
 assert.ok(draft.files['generated/martialartsvue/profile.js']);
 const plan=JSON.parse(draft.files['generated/martialartsvue/vuecore-change-proposal.json']);
 assert.equal(plan.productionReady,false);
 assert.equal(plan.automaticApply,false);
});
test('MARTIALARTSVUE isolated API routing and existing-specialist protection',async()=>{
 const registry=createFactoryTestRegistry(definition,SPECIALISTS,routeQuestion);
 const post=createFactoryTestApi(registry);
 const send=async(question,language='en')=>{
  const response=await post(new Request('https://localhost/factory-test',{method:'POST',body:JSON.stringify({question,language})}));
  assert.equal(response.status,200);
  return response.json();
 };
 for(const [question,language] of [['kampsport','sv'],['artes marciales','es'],['武术','zh-CN'],['боевые искусства','ru'],['الفنون القتالية','ar'],['मार्शल आर्ट','hi']]){
  const result=await send(question,language);
  assert.equal(result.domain,'martialartsvue',question);
  assert.equal(result.testOnly,true);
  assert.equal(result.guide.label,definition.labels[language]);
 }
 assert.equal((await send('Marshall guitar amplifier')).domain,'musicgearvue');
 assert.equal((await send('My dog is sick')).domain,'anivue');
 assert.equal(routeQuestion('kampsport').domain,'anyvue');
 assert.equal(Object.hasOwn(SPECIALISTS,'martialartsvue'),false);
});
