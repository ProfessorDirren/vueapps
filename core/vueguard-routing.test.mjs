import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion,routingFields} from './router.js';

// VUEGUARD baseline: protect the existing production routing contract.
test('VUECORE routes clear Swedish and English animal questions to ANIVUE',()=>{
  assert.deepEqual(routeQuestion('Min hund är sjuk'),{domain:'anivue',clarify:false});
  assert.deepEqual(routeQuestion('My horse needs a veterinarian'),{domain:'anivue',clarify:false});
});
test('VUECORE routes Spanish animal questions to ANIVUE',()=>{
  assert.deepEqual(routeQuestion('Mi perro está enfermo'),{domain:'anivue',clarify:false});
  assert.deepEqual(routeQuestion('Mi gato necesita ayuda'),{domain:'anivue',clarify:false});
});
test('VUECORE does not silently choose between equal-priority specialists',()=>{
  const result=routeQuestion('My dog and my car');
  assert.equal(result.domain,null);
  assert.equal(result.clarify,true);
  assert.deepEqual(new Set(result.candidates),new Set(['anivue','motovue']));
});
test('VUECORE defaults to ANYVUE on unknown questions without context',()=>{
  assert.deepEqual(routeQuestion('Please explain this concept'),{domain:'anyvue',clarify:false});
});
test('VUECORE does not route based on stale context when a clear new topic exists',()=>{
  assert.deepEqual(routeQuestion('My cat is ill','motovue'),{domain:'anivue',clarify:false});
});
test('ANIVUE breathing emergency maps to urgent safety field',()=>{
  assert.deepEqual(routingFields('anivue','Min hund har svårt att andas'),{selected:'["breathing"]'});
  assert.deepEqual(routingFields('anivue','My dog cannot breathe'),{selected:'["breathing"]'});
});

test('VUECORE routes multilingual animal terms without changing the selected language',()=>{
  for(const question of ['Mi caballo está enfermo','我的猫生病了','Моя собака заболела','كلبي مريض','मेरी बिल्ली बीमार है']){
    assert.equal(routeQuestion(question).domain,'anivue',question);
  }
});
test('VUECORE distinguishes specialist priorities when one topic is higher risk',()=>{
  assert.deepEqual(routeQuestion('Medicine side effects for my cat'),{domain:'medivue',clarify:false});
});
test('VUECORE leaves unclear questions in the safe generic specialist',()=>{
  assert.deepEqual(routeQuestion('Could you help me?',null),{domain:'anyvue',clarify:false});
});
test('VUEGUARD prevents accidental removal of the legacy ANIVUE domain dependency without migration',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../api/vue-router.js',import.meta.url),'utf8');
  assert.match(source,/www\\.anivueapp\\.se|www\.anivueapp\.se/);
});

test('VUEGUARD ensures language selection is passed unchanged to the specialist API',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../api/vue-router.js',import.meta.url),'utf8');
  assert.match(source,/language:b\.language/);
  assert.match(source,/!ROUTER_TEXT\[b\.language\]/);
  assert.doesNotMatch(source,/language\s*:\s*(?:route\.language|detectLanguage\()/);
});
