import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('automatic language changes are not persisted as manual preferences',()=>{
 assert.match(router,/detail:\{automatic:true\}/);
 assert.match(html,/if\(event\.detail\?\.automatic\)return/);
 assert.match(html,/sessionStorage\.setItem\(VUE_LANGUAGE_KEY,picker\.value\)/);
});
