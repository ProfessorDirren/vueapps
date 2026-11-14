import test from 'node:test';
import assert from 'node:assert/strict';
import { AniVueHelp } from './anivue-help.js';
import { localizedVueName } from './vue-names.js';

test('ANIVUE help uses the same translated name as VUECORE cards',()=>{
 const help=new AniVueHelp();
 for(const lang of ['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa']){
  const result=help.getHelp(lang);
  assert.equal(result.language,lang);
  assert.ok(result.title.includes(localizedVueName('anivue',lang)),lang);
  assert.ok(result.topics.length>0);
 }
});
test('ANIVUE help never changes emergency guidance or domain identity',()=>{
 const help=new AniVueHelp();
 assert.equal(help.getHelp('sv').id,'anivue');
 assert.equal(help.getHelp('ar').direction,'rtl');
 assert.equal(help.getHelp('fa').direction,'rtl');
 assert.equal(help.getHelp('xx').language,'en');
});
