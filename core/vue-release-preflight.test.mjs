import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightVue,RELEASE_LANGUAGES} from '../scripts/vue-release-check.mjs';
import {SPECIALISTS} from './specialists.js';
import {VUE_NAMES} from './vue-names.js';

test('release gate checks every registered specialist in all release languages',()=>{
 assert.equal(RELEASE_LANGUAGES.length,12);
 assert.deepEqual([...VUE_NAMES].sort(),Object.keys(SPECIALISTS).sort());
 for(const id of Object.keys(SPECIALISTS)){
  assert.deepEqual(preflightVue(id,null),{ok:true,problems:[]},id);
 }
});

test('release gate fails closed for unknown or prototype-like specialist identifiers',()=>{
 for(const id of ['unknown-vue','constructor','toString','__proto__','']){
  const result=preflightVue(id,null);
  assert.equal(result.ok,false,String(id));
  assert.ok(result.problems.includes('Specialist not registered in VUECORE'),String(id));
 }
});

test('release gate refuses missing or whitespace-only routing smoke questions',()=>{
 const id=Object.keys(SPECIALISTS)[0];
 for(const question of ['', '  ', 'x', 7, {}]){
  const result=preflightVue(id,question);
  assert.equal(result.ok,false,String(question));
  assert.ok(result.problems.includes('Routing smoke question required'),String(question));
 }
});
