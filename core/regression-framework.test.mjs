import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIALISTS} from './specialists.js';
import {VUE_NAMES,localizedVueName,hasLocalizedVueName} from './vue-names.js';
import {routeQuestion} from './router.js';
import {POST} from '../api/vue-router.js';
import {detectVueInputLanguage} from './vuecore-language.js';
import {RELEASE_LANGUAGES} from '../scripts/vue-release-check.mjs';
import {routes,negatives,languages} from './regression-cases.mjs';

test('REGRESSION: all registered specialists have all 11 language names',()=>{
 const ids=Object.keys(SPECIALISTS);
 assert.ok(ids.length);
 for(const id of ids){
  assert.ok(VUE_NAMES.includes(id),'unregistered display name: '+id);
  for(const lang of RELEASE_LANGUAGES){
   assert.ok(hasLocalizedVueName(id,lang),id+' missing '+lang);
   assert.ok(localizedVueName(id,lang).trim(),id+' empty '+lang);
  }
 }
 for(const id of VUE_NAMES)assert.ok(Object.hasOwn(SPECIALISTS,id),'orphaned display name: '+id);
});
test('REGRESSION: catalog integrity and all 11 language fixtures',()=>{
 const keys=[...routes.map(c=>c[0]),...negatives.map(c=>c[0]),...languages.map(c=>'lang-'+c[0])];
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual(new Set(languages.map(c=>c[0])),new Set(RELEASE_LANGUAGES));
 for(const [id,,domain] of routes)assert.ok(Object.hasOwn(SPECIALISTS,domain),id);
});
for(const [id,question,expected,previous] of routes)test('REGRESSION route '+id,()=>{
 const actual=routeQuestion(question,previous);
 assert.notEqual(actual.clarify,true,id+' unexpectedly asks for clarification');
 assert.equal(actual.domain,expected,id);
});
for(const [id,question] of negatives)test('REGRESSION negative '+id,()=>{
 assert.equal(routeQuestion(question).clarify,true,id);
});
for(const [lang,question] of languages)test('REGRESSION language '+lang,()=>{
 assert.equal(detectVueInputLanguage(question,lang==='en'?'sv':'en'),lang);
});
test('REGRESSION ambiguous input never guesses a language',()=>{
 for(const lang of RELEASE_LANGUAGES){
  assert.equal(detectVueInputLanguage('OK',lang),lang);
  assert.equal(detectVueInputLanguage('12345',lang),lang);
 }
});

for(const [id,question] of negatives)test('REGRESSION API negative '+id+' must clarify without a provider call',async()=>{
 const previousFetch=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('Provider must not be called for contradictory intent')};
 try{
  const response=await POST(new Request('https://local/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language:'sv',previous:'commutvue',auto_language:true})}));
  assert.equal(response.status,200,id);
  const result=await response.json();
  assert.equal(result.clarify,true,id);
  assert.equal(result.domain,null,id);
  assert.equal(typeof result.answer,'string',id);
  assert.ok(result.answer.trim().length>0,id);
  assert.equal(calls,0,id+' called a provider before clarification');
 }finally{globalThis.fetch=previousFetch}
});
