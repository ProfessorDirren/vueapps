import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTER_TEXT} from '../apps/router-content.js';

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

test('previous-answer notices and AI provenance have translations for all languages',()=>{
 for(const language of languages){
  assert.match(routerSource,new RegExp('(?:^|[,\\s])'+JSON.stringify(language)+':'),language);
 }
 for(const marker of ['Object.assign(provenanceLabel','Object.assign(previousAnswerNotices'])assert.ok(routerSource.includes(marker));
});
