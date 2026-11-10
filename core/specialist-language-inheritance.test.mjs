import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIALISTS,specialistGuide} from './specialists.js';
import {detectInputLanguage} from './language-detection.js';
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('every registered specialist routes through VUECORE language selection',()=>{
 assert.match(router,/detectInputLanguage\(question\)/);
 assert.match(router,/language:requestedLanguage/);
 assert.match(portal,/new CustomEvent\("vueapps:languagechange"/);
 for(const domain of Object.keys(SPECIALISTS)){
  assert.ok(SPECIALISTS[domain].scope,domain+' is registered in shared VUECORE');
 }
 assert.equal(detectInputLanguage('Mi perro esta enfermo, vad skall jag göra? Do you have a solution?'),null);
});

test('interactive specialist guides use central locale fallback where supported',()=>{
 const languages=['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa'];
 let interactive=0;
 for(const domain of Object.keys(SPECIALISTS)){
  let baseline;
  try{baseline=specialistGuide(domain,'en')}catch(error){
   assert.match(error.message,/No interactive guide/);
   continue;
  }
  interactive++;
  for(const language of languages){
   const guide=specialistGuide(domain,language);
   assert.ok(guide.labels,domain+' '+language+' labels');
   assert.ok(Array.isArray(guide.questions),domain+' '+language+' questions');
  }
 }
 assert.ok(interactive>0,'at least one interactive specialist guide exists');
});
