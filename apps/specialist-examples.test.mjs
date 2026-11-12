import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIALISTS} from '../core/specialists.js';
import {SPECIALIST_EXAMPLES,specialistExample} from './specialist-examples.js';
const locales=['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa'];
test('every VUECORE specialist has a unique relevant example in all eleven locales',()=>{
 const domains=Object.keys(SPECIALISTS);
 assert.equal(domains.length,16);
 for(const lang of locales){
  const texts=domains.map(domain=>{
   const value=specialistExample(domain,lang,'generic placeholder');
   assert.equal(typeof value,'string',lang+' '+domain);
   assert.ok(value.length>15,lang+' '+domain);
   assert.notEqual(value,'generic placeholder',lang+' '+domain);
   assert.doesNotMatch(value,/Jordbro|Stockholm City|Marshall/i,lang+' '+domain);
   return value;
  });
  assert.equal(new Set(texts).size,domains.length,lang+' examples must be specialist-specific');
 }
});
test('unselected or unknown specialists retain localized generic placeholder',()=>{
 assert.equal(specialistExample(null,'sv','Generellt exempel'),'Generellt exempel');
 assert.equal(specialistExample('unknown','en','Generic example'),'Generic example');
});
test('COMMUTVUE examples stay globally usable across all languages',()=>{
 for(const lang of locales){
  const example=SPECIALIST_EXAMPLES[lang].commutvue;
  assert.ok(example);
  assert.doesNotMatch(example,/Jordbro|Stockholm|Sverige|Sweden|Chile|Paris|Madrid/i);
 }
});
