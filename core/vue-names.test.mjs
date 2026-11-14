import test from 'node:test';
import assert from 'node:assert/strict';
import {VUE_NAMES,localizedVueName,vueBrandName,renderVueNames} from './vue-names.js';
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

test('newer languages never silently display English names',()=>{
 for(const lang of ['fr','el','tr','fa']){
  for(const id of ['anivue','foodvue','motovue','vinylvue','commutvue','martialartsvue']){
   assert.notEqual(localizedVueName(id,lang),localizedVueName(id,'en'),id+' '+lang);
  }
 }
});

test('all sixteen portal headings rerender in the selected language without altering IDs',()=>{
 const headings=new Map(VUE_NAMES.map(id=>[id,{replaceChildren(...children){this.children=children;}}]));
 const document={
  querySelector(selector){return headings.get(selector.slice(5,-3))||null;},
  createElement(tag){return {tag,style:{},textContent:'',dir:''};},
  createTextNode(text){return {textContent:text};}
 };
 renderVueNames(document,'en');
 const english=new Map([...headings].map(([id,h])=>[id,h.children[2].textContent]));
 renderVueNames(document,'sv');
 for(const [id,heading] of headings){
  assert.equal(heading.children[0].textContent,localizedVueName(id,'sv'),id);
  assert.equal(heading.children[2].textContent,'('+vueBrandName(id)+')',id);
  assert.equal(heading.children[0].dir,'auto');
  assert.equal(heading.children[2].dir,'ltr');
  assert.ok(english.get(id));
 }
 renderVueNames(document,'es');
 assert.equal(headings.get('commutvue').children[0].textContent,'Transporte público-VUE');
});

test('all sixteen VUE headings survive repeated switches through all eleven languages',()=>{
 const headings=new Map(VUE_NAMES.map(id=>[id,{replaceChildren(...children){this.children=children;}}]));
 const document={
  querySelector(selector){return headings.get(selector.slice(5,-3))||null;},
  createElement(tag){return {tag,style:{},textContent:'',dir:''};},
  createTextNode(text){return {textContent:text};}
 };
 for(const language of ['en','es','sv','hi','zh-CN','ru','ar','fr','el','tr','fa','en','sv']){
  renderVueNames(document,language);
  for(const domain of VUE_NAMES){
   const heading=headings.get(domain);
   assert.equal(heading.children.length,3,domain+' '+language);
   assert.equal(heading.children[0].textContent,localizedVueName(domain,language),domain+' '+language);
   assert.equal(heading.children[2].textContent,'('+vueBrandName(domain)+')',domain+' '+language);
   assert.equal(heading.children[0].dir,'auto');
   assert.equal(heading.children[2].dir,'ltr');
  }
 }
});

test('unsupported locale falls back to English without changing explicit translations',()=>{
 for(const domain of VUE_NAMES){
  assert.equal(localizedVueName(domain,'unsupported'),localizedVueName(domain,'en'),domain);
  assert.equal(localizedVueName(domain,'en'),localizedVueName(domain),domain);
 }
});
test('unknown specialist cannot produce a misleading translated VUE label',()=>{
 assert.equal(localizedVueName('not-a-vue','sv'),'');
 assert.equal(localizedVueName('not-a-vue','en'),'');
});

test('prototype property names cannot masquerade as supported languages',()=>{
 for(const language of ['toString','constructor','__proto__','hasOwnProperty']){
  for(const domain of VUE_NAMES){
   assert.equal(localizedVueName(domain,language),localizedVueName(domain,'en'),domain+' '+language);
  }
 }
 assert.equal(localizedVueName('toString','sv'),'');
 assert.equal(localizedVueName('__proto__','en'),'');
});
