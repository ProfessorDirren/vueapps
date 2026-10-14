import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as route} from '../api/vue-router.js';
import {POST as followup,urgentFollowup} from '../api/vue-followup.js';

const request=(path,body)=>new Request('https://localhost/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('Spanish-selected urgent animal response stays Spanish even for English input',async()=>{
  const response=await route(request('vue-router',{language:'es',question:'My dog cannot breathe'}));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.domain,'anivue');
  assert.equal(data.kind,'safety_rule');
  assert.match(data.answer,/atención veterinaria urgente/i);
  assert.doesNotMatch(data.answer,/Sök akut veterinärvård|Seek urgent veterinary care/i);
});

test('Urgent guidance is localized to all supported languages',()=>{
  const languages=['en','sv','es','hi','zh-CN','ru','ar'];
  for(const language of languages){
    const guidance=urgentFollowup('anivue','My dog cannot breathe',{},language);
    assert.equal(typeof guidance,'string',language);
    assert.ok(guidance.length>20,language);
  }
  assert.notEqual(urgentFollowup('anivue','My dog cannot breathe',{},'es'),urgentFollowup('anivue','My dog cannot breathe',{},'sv'));
});

test('Spanish selected in follow-up overrides Swedish emergency question',async()=>{
  const response=await followup(request('vue-followup',{domain:'anivue',language:'es',question:'Min hund kan inte andas'}));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.kind,'safety_rule');
  assert.match(data.answer,/atención veterinaria urgente/i);
});

test('Invalid language fails closed instead of silently switching to Swedish',async()=>{
  const response=await route(request('vue-router',{language:'xx',question:'My dog cannot breathe'}));
  assert.equal(response.status,400);
});
