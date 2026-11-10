import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTER_TEXT} from '../apps/router-content.js';
import {UI,DOMAINS} from '../apps/content.js';
import {detectInputLanguage} from './language-detection.js';
import {routeQuestion,routingFields} from './router.js';
import {urgentFollowup,POST as followupPOST} from '../api/vue-followup.js';
const languages=['el','tr','fa','fr'];
test('four new languages have complete VUECORE interface strings',()=>{
 for(const lang of languages){assert.equal(ROUTER_TEXT[lang].length,27,lang);assert.ok(ROUTER_TEXT[lang].every(s=>typeof s==='string'&&s.length>0),lang)}
});
test('detect Greek, Turkish, Persian and French without guessing from a short fragment',()=>{
 assert.equal(detectInputLanguage('Ο σκύλος μου είναι άρρωστος και χρειάζομαι βοήθεια'),'el');
 assert.equal(detectInputLanguage('Merhaba, benim köpek hasta, yardım lütfen'),'tr');
 assert.equal(detectInputLanguage('این یک پرسش فارسی درباره پزشکی است'),'fa');
 assert.equal(detectInputLanguage('Bonjour, mon chien est malade, merci pour votre aide'),'fr');
 assert.equal(detectInputLanguage('hi'),null);
});
test('new languages are wired to output instructions and Persian RTL',()=>{
 const vision=readFileSync(new URL('./anivue-vision.js',import.meta.url),'utf8');
 const followup=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const lang of languages){assert.match(vision,new RegExp(lang+':'));assert.match(followup,new RegExp("'"+lang+"':"));assert.match(html,new RegExp('value="'+lang+'"'))}
 assert.ok(html.includes('["ar","fa"].includes(lang)'));
});

test('all four new languages have complete translated portal hero content',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const marker='const translations=';
 const begin=html.indexOf(marker)+marker.length;
 const end=html.indexOf(';\nconst ',begin);
 const translations=JSON.parse(html.slice(begin,end));
 for(const lang of languages){assert.equal(translations[lang].length,translations.en.length,lang);assert.notEqual(translations[lang][0],translations.en[0],lang)}
});

test('four languages translate every shared planner UI label and all domain categories',()=>{
 for(const lang of languages){
  assert.deepEqual(Object.keys(UI[lang]).sort(),Object.keys(UI.en).sort(),lang);
  assert.notEqual(UI[lang].language,UI.en.language,lang);
  for(const [domain,config] of Object.entries(DOMAINS)){
   assert.ok(config.locales[lang],domain+' '+lang);
   assert.equal(config.locales[lang].types.length,config.locales.en.types.length,domain+' '+lang);
   assert.notEqual(config.locales[lang].title,config.locales.en.title,domain+' '+lang);
  }
 }
});

test('specialist routing recognizes new language animal, plant, food and medical terms',()=>{
 const samples=[
  ['Mon chien est malade','anivue'],['Köpek hasta','anivue'],['Ο σκύλος είναι άρρωστος','anivue'],['سگ من بیمار است','anivue'],
  ['Ma plante a des feuilles jaunes','plantvue'],['Bitki yaprakları sarardı','plantvue'],['Το φυτό μου χρειάζεται νερό','plantvue'],['گیاه من زرد شده','plantvue'],
  ['Recette de cuisine','foodvue'],['Yemek tarifi','foodvue'],['Συνταγή φαγητού','foodvue'],['دستور غذا','foodvue'],
  ['Effets secondaires du médicament','medivue'],['İlaç yan etki','medivue'],['Παρενέργειες φάρμακο','medivue'],['عوارض جانبی دارو','medivue']
 ];
 for(const [question,domain] of samples){assert.equal(routeQuestion(question).domain,domain,question)}
});

test('all portal specialist translation groups include the four new languages',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const groups=['slumpTranslations','antiqTranslations','musicTranslations','vinylTranslations','communityTranslations','possessionsTranslations','martialTranslations','mediTranslations','foodReviewTranslations'];
 for(const name of groups){
  const marker='const '+name+'=';
  const begin=html.indexOf(marker);
  assert.ok(begin>=0,'missing '+name);
  const source=html.slice(begin+marker.length);
  const end=source.indexOf('};');
  assert.ok(end>=0,name+' has no closing object');
  const block=source.slice(0,end+1);
  for(const lang of languages)assert.ok(block.includes(JSON.stringify(lang)+':'),name+' missing '+lang);
 }
 assert.ok(html.includes('document.documentElement.dir=["ar","fa"].includes(lang)?"rtl":"ltr"'));
 assert.ok(html.includes('setLanguage("en")'));
});

test('new language urgent followup warnings never silently fall back to English',()=>{
 for(const lang of languages){
  const warning=urgentFollowup('anivue','', {emergencyCaution:'true'},lang);
  assert.ok(warning && warning.length>20,lang);
  assert.notEqual(warning,urgentFollowup('anivue','',{emergencyCaution:'true'},'en'),lang);
  const brakes=urgentFollowup('motovue','',{symptom:'brakes'},lang);
  assert.ok(brakes && brakes.length>20,lang);
 }
});
test('new languages are accepted by the followup API validation',async()=>{
 for(const lang of languages){
  const request=new Request('https://example.test/api/vue-followup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:'anivue',question:'My dog is sick and needs help',language:lang})});
  const response=await followupPOST(request);
  assert.notEqual(response.status,400,lang+' must not fail language validation');
 }
});

test('new language animal breathing emergencies are triaged at the router boundary',()=>{
 const samples=['Mon chien ne peut pas respirer','Köpek nefes alamıyor','Ο σκύλος δεν μπορεί να αναπνεύσει','سگ نمی‌تواند نفس بکشد'];
 for(const question of samples){
  assert.equal(routeQuestion(question).domain,'anivue',question);
  assert.equal(routingFields('anivue',question).selected,'["breathing"]',question);
 }
});

test('ANIVUE portal entry uses shared VUECORE UI',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
 assert.ok(html.includes('href="./?vue=anivue#vue-router"'));
 assert.ok(router.includes("isRegisteredSpecialist(requestedSpecialist)"));
 assert.ok(router.includes("active={domain:requestedSpecialist,memory:m,caseId:null}"));
});
