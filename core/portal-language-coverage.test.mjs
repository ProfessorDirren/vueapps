import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTER_TEXT} from '../apps/router-content.js';
import {isRegisteredSpecialist} from './specialists.js';

const languages=['en','es','sv','hi','zh-CN','ru','ar','el','tr','fa','fr'];
const routerSource=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all eleven portal languages have complete shared router labels',()=>{
 const expected=ROUTER_TEXT.en.length;
 for(const language of languages){
  assert.equal(ROUTER_TEXT[language]?.length,expected,language);
  assert.ok(ROUTER_TEXT[language].every(text=>typeof text==='string'&&text.trim()),language);
  assert.match(portal,new RegExp('value="'+language+'"'));
 }
});

test('new languages have explicit localized notices in VUECORE',()=>{
 for(const marker of ['Object.assign(provenanceLabel','Object.assign(previousAnswerNotices']){
  assert.ok(routerSource.includes(marker),marker);
 }
 for(const language of ['fr','el','tr','fa']){
  assert.ok(routerSource.includes(language+':'),language);
 }
});

test('new language specialist links stay inside VUECORE instead of opening untranslated pages',()=>{
 for(const marker of ['extendedOnlyLanguages','specialistPageDomains','event.preventDefault()','location.assign("./?vue="']){
  assert.ok(portal.includes(marker),marker);
 }
});

test('direct ANYVUE visits preserve newer languages via VUECORE',()=>{
 const anyvue=readFileSync(new URL('../anyvue.html',import.meta.url),'utf8');
 for(const language of ['fr','el','tr','fa'])assert.ok(anyvue.includes("'"+language+"'"),language);
 assert.ok(anyvue.includes("location.replace('./?vue=anyvue#vue-router')"));
 assert.ok(anyvue.includes("sessionStorage.getItem('vue-language')"));
});

test('VUECORE deep links resolve registered specialists without losing the chosen language',()=>{
 const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
 for(const domain of ['anyvue','antiqvue','foodvue','musicgearvue','vinylvue','wardrobevue']){
  assert.equal(isRegisteredSpecialist(domain),true,domain);
 }
 assert.ok(router.includes("new URLSearchParams(location.search).get('vue')"));
 assert.ok(router.includes('isRegisteredSpecialist(requestedSpecialist)'));
 assert.ok(portal.includes('sessionStorage.getItem(VUE_LANGUAGE_KEY)'));
 assert.ok(portal.includes('sessionStorage.setItem(VUE_LANGUAGE_KEY,picker.value)'));
});
