import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('explicit language switch clears visible replies and stale status',()=>{
 assert.match(source,/vueapps:languagechange/);
 assert.match(source,/if\(!event\.detail\?\.automatic\)\{\$\('vue-router-replies'\)\.replaceChildren\(\)/);
 assert.match(source,/\$\('vue-router-status'\)\.textContent=''/);
});
test('language switch retains memory and does not clear on automatic language detection',()=>{
 assert.doesNotMatch(source,/memories\.clear\(/);
 assert.doesNotMatch(source,/storage\?\.clear\(/);
 assert.match(source,/if\(!event\.detail\?\.automatic\)/);
});
