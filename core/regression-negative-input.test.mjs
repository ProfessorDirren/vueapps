import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestVueIntent,suggestVueTerms,interpretVueInput} from './vuecore-interpretation.js';
import {detectVueInputLanguage} from './vuecore-language.js';
import {POST} from '../api/vue-router.js';
const request=(question,language='sv')=>new Request('https://local/api/vue-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language,previous:'commutvue',auto_language:false})});

test('NEGATIVE: one-edit typos produce explicit unexecuted suggestions',()=>{
 for(const [question,term,domain] of [
  ['När går nästa busz?','buss','commutvue'],
  ['Jag vill ha kycklimg','kyckling','foodvue'],
  ['Min huns är sjuk','hund','anivue']
 ]){
  const candidates=suggestVueIntent(question);
  assert.equal(candidates.length,1,question);
  assert.equal(candidates[0].suggested,term);
  assert.equal(candidates[0].domain,domain);
  assert.equal(candidates[0].requiresConfirmation,true);
 }
});
test('NEGATIVE: multiple fuzzy candidates never auto-select a winner',()=>{
 assert.deepEqual(suggestVueTerms('bussa',['bussar','bussan']),[]);
 assert.deepEqual(suggestVueTerms('buss',['buss']),[]);
 assert.deepEqual(suggestVueIntent('buss kyckling'),[]);
});
test('NEGATIVE: station typo correction is explicit and scoped',()=>{
 const correction=interpretVueInput('Från T-Tentralen till Handen');
 assert.equal(correction.question,'Från T-Centralen till Handen');
 assert.equal(correction.corrections.length,1);
 assert.deepEqual(interpretVueInput('T-TentralenX').corrections,[]);
});
test('NEGATIVE: ambiguous and numeric inputs retain locale for all 11 languages',()=>{
 for(const lang of ['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa']){
  for(const input of ['OK','12345','...'])assert.equal(detectVueInputLanguage(input,lang),lang);
 }
});
test('NEGATIVE API: typo must request confirmation without external calls',async()=>{
 const old=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Unexpected provider call')};
 try{
  const response=await POST(request('När går nästa busz?'));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.clarify,true);
  assert.equal(data.reason,'possible_typo');
  assert.equal(data.domain,null);
  assert.equal(data.suggestions?.[0]?.requiresConfirmation,true);
  assert.equal(calls,0);
 }finally{globalThis.fetch=old}
});
