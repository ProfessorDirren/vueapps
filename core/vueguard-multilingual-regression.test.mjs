import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion,routingFields} from './router.js';

// VUEGUARD: keep these public routing behaviors stable across future VUECORE changes.
test('Spanish animal prompts never route to an unrelated specialist',()=>{
  for(const prompt of ['Mi perro está enfermo','Mi gato necesita ayuda','Mi caballo está enfermo']){
    assert.deepEqual(routeQuestion(prompt),{domain:'anivue',clarify:false},prompt);
  }
});
test('Explicit new Spanish animal topic overrides stale specialist context',()=>{
  assert.deepEqual(routeQuestion('Mi perro está enfermo','motovue'),{domain:'anivue',clarify:false});
});
test('Multilingual animal routing remains available across all seven UI languages',()=>{
  const cases=['My cat is ill','Min katt är sjuk','Mi gato necesita ayuda','मेरी बिल्ली बीमार है','我的猫生病了','Моя собака заболела','كلبي مريض'];
  for(const prompt of cases)assert.equal(routeQuestion(prompt).domain,'anivue',prompt);
});
test('Mixed equal-priority animal and vehicle questions request clarification',()=>{
  const result=routeQuestion('My dog and my car');
  assert.equal(result.clarify,true);
  assert.equal(result.domain,null);
  assert.deepEqual(new Set(result.candidates),new Set(['anivue','motovue']));
});
test('Breathing emergencies keep the existing urgent field',()=>{
  for(const prompt of ['Min hund har svårt att andas','My dog cannot breathe']){
    assert.deepEqual(routingFields('anivue',prompt),{selected:'["breathing"]'},prompt);
  }
});
