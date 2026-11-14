import test from 'node:test';
import assert from 'node:assert/strict';
import { VUE_NAMES, localizedVueName, hasLocalizedVueName, vueBrandName, renderVueNames } from './vue-names.js';

const locales=['en','es','sv','fr','hi','zh-CN','ru','ar','el','tr','fa'];
test('all sixteen VUEs have translated display names in all eleven locales',()=>{
 assert.equal(VUE_NAMES.length,16);
 for(const id of VUE_NAMES)for(const lang of locales){
  const name=localizedVueName(id,lang);
  assert.ok(hasLocalizedVueName(id,lang),`${id}/${lang} missing explicit translation`);
  assert.ok(name && name.endsWith('-VUE'),`${id}/${lang} missing name`);
 }
});
test('COMMUTEVUE internal brand remains correctly spelled',()=>{
 assert.equal(vueBrandName('commutvue'),'COMMUTEVUE');
 assert.equal(localizedVueName('commutvue','sv'),'Pendling-VUE');
});
test('central renderer puts translated label before immutable brand',()=>{
 const headings=new Map();
 for(const id of VUE_NAMES)headings.set(id,{replaceChildren(...nodes){this.nodes=nodes}});
 const document={
  querySelector(selector){return headings.get(selector.slice(5,-3))||null},
  createElement(){return {style:{},dir:'',textContent:''}},
  createTextNode(value){return value}
 };
 renderVueNames(document,'sv');
 for(const id of VUE_NAMES){
  const heading=headings.get(id);
  assert.equal(heading.nodes[0].textContent,localizedVueName(id,'sv'));
  assert.equal(heading.nodes[2].textContent,'('+vueBrandName(id)+')');
 }
});
