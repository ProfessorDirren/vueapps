import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("homepage retains all seven language choices and descriptive labels",()=>{
 const expected=[
  ['en','English'],['es','Español'],['sv','Svenska'],['hi','हिन्दी'],
  ['zh-CN','简体中文 (Chinese)'],['ru','Русский (Russian)'],['ar','العربية']
 ];
 const options=[...html.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(options,expected);
});
test("English default and saved explicit selection remain intact",()=>{
 assert.match(html,/<html lang="en">/);
 assert.match(html,/let initial="en"/);
 assert.match(html,/localStorage\.getItem\("vueapps-language-v2"\)/);
 assert.match(html,/localStorage\.setItem\("vueapps-language-v2",lang\)/);
 assert.match(html,/lang==="ar"\?"rtl":"ltr"/);
});
test("homepage hero and navigation retain brand and product promises",()=>{
 assert.match(html,/VUEAPPS\.se/);
 assert.match(html,/THE PORTAL TO KNOWLEDGE/);
 assert.match(html,/href="\.\/anyvue\.html"/);
 assert.match(html,/href="https:\/\/www\.anivueapp\.se"/);
});
