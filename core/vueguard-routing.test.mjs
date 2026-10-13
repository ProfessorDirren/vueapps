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
