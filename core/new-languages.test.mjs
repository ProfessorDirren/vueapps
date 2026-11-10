import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTER_TEXT} from '../apps/router-content.js';
import {detectInputLanguage} from './language-detection.js';
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
 const end=html.indexOf(';',begin);
 const translations=JSON.parse(html.slice(begin,end));
 for(const lang of languages){assert.equal(translations[lang].length,translations.en.length,lang);assert.notEqual(translations[lang][0],translations.en[0],lang)}
});
