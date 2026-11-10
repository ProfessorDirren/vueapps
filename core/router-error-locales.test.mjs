import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('all eleven portal languages have quota, configuration and provider failure notices',()=>{
 const base=source.match(/const unavailable=(\\{[\\s\\S]*?\\});Object\\.assign\\(unavailable,/)?.[1];
 const extended=source.match(/Object\\.assign\\(unavailable,(\\{[\\s\\S]*?\\})\\);const lang=document\\.documentElement\\.lang/)?.[1];
 assert.ok(base,'original seven language map');
 assert.ok(extended,'additional four language map');
 for(const lang of ['en','sv','es','hi','zh-CN','ru','ar','fr','el','tr','fa']){
  const section=['fr','el','tr','fa'].includes(lang)?extended:base;
  const key=lang==='zh-CN'?"'zh-CN'":lang;
  const start=section.indexOf(key+':{');
  assert.ok(start>=0,lang);
  const values=section.slice(start,section.indexOf('}',start));
  for(const code of [429,503,502])assert.match(values,new RegExp(String(code)+':'),lang+' '+code);
 }
});
