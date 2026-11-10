import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTER_TEXT} from '../apps/router-content.js';
import {UI,DOMAINS} from '../apps/content.js';
import {detectInputLanguage} from './language-detection.js';
import {routeQuestion} from './router.js';
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
