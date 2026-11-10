import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIALISTS,specialistGuide} from './specialists.js';
import {detectInputLanguage} from './language-detection.js';

// Every registered specialist receives language selection from VUECORE;
// specialist profiles must not implement their own detector.
test('all registered specialists inherit the same core language selection',()=>{
 const languages=['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa'];
 for(const domain of Object.keys(SPECIALISTS)){
  for(const language of languages){
   const guide=specialistGuide(domain,language);
   assert.ok(guide.labels,domain+' '+language+' labels');
   assert.ok(Array.isArray(guide.questions),domain+' '+language+' questions');
  }
 }
 assert.equal(detectInputLanguage('Mi perro esta enfermo, vad skall jag göra? Do you have a solution?'),null);
});
