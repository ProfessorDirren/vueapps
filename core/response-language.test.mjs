import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../api/vue-followup.js',import.meta.url),'utf8');
test('AI follow-up requires selected response language even for Swedish questions',()=>{
 assert.match(source,/The required response language is/);
 assert.match(source,/Write the ENTIRE user-facing answer in that language/);
 assert.match(source,/Do not switch to Swedish merely because the question is Swedish/);
 for(const language of ['en','sv','es','hi','zh-CN','ru','ar'])assert.ok(source.includes("'"+language+"':"));
});

test('both mandatory follow-up language instructions cover every supported locale',()=>{
 const localeNames={'en':'English','sv':'Swedish','es':'Spanish','hi':'Hindi','zh-CN':'Simplified Chinese','ru':'Russian','ar':'Arabic','el':'Greek','tr':'Turkish','fa':'Persian (Farsi)','fr':'French'};
 const first=source.indexOf('MANDATORY OUTPUT LANGUAGE:');
 const second=source.indexOf('The required response language is',first);
 assert.ok(first>=0&&second>first);
 const firstMap=source.slice(first,second);
 const secondMap=source.slice(second,source.indexOf('Write the ENTIRE user-facing answer',second));
 for(const [lang,name] of Object.entries(localeNames)){
  const entry="'"+lang+"':'"+name+"'";
  assert.ok(firstMap.includes(entry),'missing '+lang+' in mandatory instruction');
  assert.ok(secondMap.includes(entry),'missing '+lang+' in required response instruction');
 }
 assert.doesNotMatch(secondMap,/undefined/);
});
