import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("homepage retains all eleven language choices and descriptive labels",()=>{
 const expected=[
  ['en','English'],['es','Español'],['sv','Svenska'],['hi','हिन्दी (Hindi)'],
  ['zh-CN','简体中文 (Chinese)'],['ru','Русский (Russian)'],['ar','العربية (Arabic)'],['el','Ελληνικά (Greek)'],['tr','Türkçe (Turkish)'],['fa','فارسی (Persian)'],['fr','Français (French)']
 ];
 const options=[...html.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(options,expected);
});
test("English is default for first-time visitors and explicit language persists across VUEs",()=>{
 assert.match(html,/<html lang="en">/);
 assert.match(html,/let initialLanguage="en"/);
 assert.match(html,/localStorage\.getItem\(VUE_LANGUAGE_KEY\)/);
 assert.match(html,/supportedLanguages\.has\(saved\)/);
 assert.match(html,/setLanguage\(initialLanguage\)/);
 
 assert.doesNotMatch(html,/localStorage\.getItem\("vueapps-language-v2"\)/);
 assert.doesNotMatch(html,/localStorage\.setItem\("vueapps-language-v2"/);
 assert.match(html,/\["ar","fa"\]\.includes\(lang\)\?"rtl":"ltr"/);
});
test("homepage hero and navigation retain brand and product promises",()=>{
 assert.match(html,/VUEAPPS\.se/);
 assert.match(html,/THE PORTAL TO KNOWLEDGE/);
 assert.match(html,/href="\.\/anyvue\.html"/);
 assert.match(html,/href="\.\/\?vue=anivue#vue-router"/);
});

test("FOODVUE and other standalone tools use the same explicit portal language",()=>{
 const tools=readFileSync(new URL("../apps/tools.js",import.meta.url),"utf8");
 assert.match(tools,/localStorage\.getItem\('vue-language'\)/);
 assert.doesNotMatch(tools,/localStorage\.getItem\(storageKey\+'-language'\)/);
 assert.doesNotMatch(tools,/localStorage\.setItem\(storageKey\+'-language'/);
});

test("all standalone specialist interfaces share one explicit language key",()=>{
 const files=['antiqvue','musicgearvue','vinylvue','possessions','vue-backlog','medivue','tools'];
 for(const file of files){const code=readFileSync(new URL('../apps/'+file+'.js',import.meta.url),'utf8');
  assert.match(code,/localStorage\.getItem\('vue-language'\)/,file);
  assert.match(code,/localStorage\.setItem\('vue-language',language\)/,file);
 }
 const help=readFileSync(new URL('../apps/anyvue-help.js',import.meta.url),'utf8');
 assert.match(help,/localStorage\.getItem\('vue-language'\)/);
});
