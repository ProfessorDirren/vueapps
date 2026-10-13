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
