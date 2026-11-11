import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightVue,RELEASE_LANGUAGES} from '../scripts/vue-release-check.mjs';

test('one-command gate accepts a correctly registered and routed VUE',()=>{
 const result=preflightVue('anivue','min hund är sjuk');
 assert.deepEqual(result,{ok:true,problems:[]});
 assert.equal(RELEASE_LANGUAGES.length,11);
});
test('one-command gate fails closed on missing or incorrectly routed specialists',()=>{
 assert.equal(preflightVue('imaginaryvue','test question').ok,false);
 const mismatch=preflightVue('anivue','När går nästa tåg från Jordbro till Stockholm City?');
 assert.equal(mismatch.ok,false);
 assert.match(mismatch.problems.join(' '),/Routing mismatch/);
 assert.equal(preflightVue('anivue','').ok,false);
});

test('entire registered VUE fleet passes the shared offline contract without Vercel',async()=>{
 const {SPECIALISTS}=await import('./specialists.js');
 for(const id of Object.keys(SPECIALISTS)){
  assert.deepEqual(preflightVue(id,null),{ok:true,problems:[]},id);
 }
});
