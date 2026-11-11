import test from 'node:test';
import assert from 'node:assert/strict';
import {VUE_NAMES,localizedVueName,vueBrandName} from './vue-names.js';
import {SPECIALISTS} from './specialists.js';

test('every registered VUE has a centralized localized name',()=>{
 assert.deepEqual([...VUE_NAMES].sort(),Object.keys(SPECIALISTS).sort());
 for(const id of VUE_NAMES){
  for(const lang of ['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa']){
   const label=localizedVueName(id,lang);
   assert.ok(label&&label.endsWith('-VUE'),id+' '+lang);
  }
 }
});
test('COMMUTEVUE has correct public branding without changing its internal route',()=>{
 assert.equal(vueBrandName('commutvue'),'COMMUTEVUE');
 assert.match(localizedVueName('commutvue','sv'),/Pendling/);
 assert.match(localizedVueName('commutvue','es'),/Transporte público/);
 assert.match(localizedVueName('martialartsvue','sv'),/Kampsport/);
});
