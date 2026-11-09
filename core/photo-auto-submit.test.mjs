import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('photo consent triggers existing VUECORE analysis without another submit click',()=>{
 assert.match(source,/getElementById\('vue-router-photo-public'\)|\$\('vue-router-photo-public'\)\.addEventListener\('change',[\s\S]*?void submit\(\)/);
 assert.match(source,/if\(photo&&!\$\('vue-router-photo-public'\)\.checked\)/);
 assert.match(source,/body:JSON\.stringify\(\{question,\.\.\.\(photo\?\{image:photo,image_public:true\}/);
});
