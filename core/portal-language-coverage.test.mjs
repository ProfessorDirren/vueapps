import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
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

test('AI service error messages are localized for all newly supported languages',()=>{
 for(const language of ['fr','el','tr','fa']){
  assert.ok(routerSource.includes(language+':{429:'),language);
 }
 assert.ok(routerSource.includes('Object.assign(unavailable,'));
});

test('specialist links match literal .html suffixes',()=>{
 const slash=String.fromCharCode(92);
 assert.ok(portal.includes('replace(/'+slash+'.html$/,""'+')'));
 assert.ok(!portal.includes('replace(/'+slash+slash+'.html$/,""'+')'));
 assert.equal(new RegExp(slash+'.html$').test('foodvue.html'),true);
});

test('Persian and Arabic use RTL while French, Greek and Turkish remain LTR',()=>{
 assert.ok(portal.includes('document.documentElement.dir=["ar","fa"].includes(lang)?"rtl":"ltr"'));
 assert.ok(portal.includes('document.documentElement.lang=lang'));
 assert.ok(portal.includes('setLanguage(initialLanguage)'));
 assert.ok(portal.includes('let initialLanguage="en"'));
});

test('all standalone specialists preserve four new languages on direct visits',()=>{
 for(const domain of ['anyvue','antiqvue','armvue','estatevue','foodvue','homevue','medivue','motovue','musicgearvue','plantvue','slumpvue','vinylvue','wardrobevue']){
  const html=readFileSync(new URL('../'+domain+'.html',import.meta.url),'utf8');
  assert.ok(html.includes("sessionStorage.getItem('vue-language')"),domain);
  assert.ok(html.includes("location.replace('./?vue="+domain+"#vue-router')"),domain);
  for(const language of ['fr','el','tr','fa'])assert.ok(html.includes("'"+language+"'"),domain+' '+language);
 }
});

test('specialist click handler actually routes new languages without intercepting English',()=>{
 const start=portal.indexOf('const extendedOnlyLanguages=');
 const end=portal.indexOf('const VUE_LANGUAGE_KEY=',start);
 assert.ok(start>=0&&end>start);
 const handler=portal.slice(start,end);
 for(const language of ['fr','el','tr','fa','en']){
  let listener;
  let destination=null;
  let prevented=false;
  const location={href:'https://vueapps.test/',origin:'https://vueapps.test/',assign:url=>{destination=url}};
  const link={href:'https://vueapps.test/foodvue.html',target:''};
  const document={addEventListener:(name,callback)=>{assert.equal(name,'click');listener=callback}};
  runInNewContext(handler,{document,picker:{value:language},location,URL,encodeURIComponent,Set});
  assert.equal(typeof listener,'function');
  listener({target:{closest:()=>link},defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault:()=>{prevented=true}});
  assert.equal(destination,language==='en'?null:'./?vue=foodvue#vue-router',language+' diagnostics '+JSON.stringify({origin:new URL(link.href,location.href).origin,locationOrigin:location.origin,path:new URL(link.href,location.href).pathname,prevented,handler:handler.slice(0,200)}));
  assert.equal(prevented,language!=='en',language);
 }
});
