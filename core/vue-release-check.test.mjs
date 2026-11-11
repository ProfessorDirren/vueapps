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

test('all explicitly routed VUEs have a deterministic real-user smoke question',async()=>{
 const {ROUTED_SPECIALIST_IDS}=await import('./router.js');
 const questions={
  commutvue:'När går nästa pendeltåg?',martialartsvue:'Hur tränar jag karate?',
  estatevue:'Hur inventerar jag ett dödsbo?',medivue:'Vilka biverkningar har medicin?',
  vinylvue:'Vilken vinylpressning är detta?',musicgearvue:'Vilken Marshall förstärkare är detta?',
  wardrobevue:'Hur bedömer jag min klänning?',anivue:'Min hund är sjuk',
  motovue:'Motorcykel startar inte',foodvue:'Vad betyder E-nummer?',
  plantvue:'Hur vattnar jag min krukväxt?',antiqvue:'Är denna antika byrå äkta?',
  armvue:'Hur dokumenterar jag vapenvård?',homevue:'Hur byter jag luftfilter?',
  slumpvue:'Överraska mig'
 };
 assert.deepEqual([...ROUTED_SPECIALIST_IDS].sort(),Object.keys(questions).sort());
 for(const id of ROUTED_SPECIALIST_IDS){
  assert.deepEqual(preflightVue(id,questions[id]),{ok:true,problems:[]},id);
 }
});
