import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('all eleven portal languages have quota, configuration and provider failure notices',()=>{
 const start=source.indexOf('const unavailable=');
 const extension=source.indexOf('Object.assign(unavailable,',start);
 const end=source.indexOf('const lang=document.documentElement.lang;',extension);
 assert.ok(start>=0&&extension>start&&end>extension,'error locale maps');
 const base=source.slice(start,extension);
 const extended=source.slice(extension,end);
 for(const lang of ['en','sv','es','hi','zh-CN','ru','ar','fr','el','tr','fa']){
  const section=['fr','el','tr','fa'].includes(lang)?extended:base;
  const key=lang==='zh-CN'?"'zh-CN'":lang;
  const pos=section.indexOf(key+':{');
  assert.ok(pos>=0,lang);
  const values=section.slice(pos,section.indexOf('}',pos));
  for(const code of [429,503,502])assert.ok(values.includes(code+':'),lang+' '+code);
 }
});

test('COMMUTVUE provides non-English diagnostic fallback for all nine non-base locales',()=>{
 const api=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
 const start=api.indexOf('const genericDiagnostic=');
 const end=api.indexOf('const diagnosticText=',start);
 assert.ok(start>=0&&end>start);
 const block=api.slice(start,end);
 for(const lang of ['es','fr','hi','zh-CN','ru','ar','el','tr','fa']){
  const key=lang==='zh-CN'?"'zh-CN'":lang;
  assert.ok(block.includes(key+':'),lang+' missing generic diagnostic');
 }
 assert.match(api,/diagnosticLabels\[b\.language\]\?\.\[liveDiagnostic\]\|\|genericDiagnostic\[b\.language\]/);
});
