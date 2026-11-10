import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectInputLanguage} from './language-detection.js';
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('ANIVUE uses shared VUECORE language detection',()=>{
 assert.match(router,/import \{detectInputLanguage\} from '\.\.\/core\/language-detection\.js'/);
 assert.match(router,/syncInputLanguage\(question\)/);
 assert.equal(detectInputLanguage('Mi perro está enfermo'),'es');
});
test('ANIVUE deep link selects shared VUECORE rather than a separate language picker',()=>{
 assert.match(router,/requestedSpecialist==='anivue'/);
 assert.match(router,/active=\{domain:'anivue',memory:m,caseId:null\}/);
});
