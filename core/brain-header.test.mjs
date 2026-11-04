import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('VUECORE header loads realistic optimized image, not SVG cone or emoji',()=>{
 assert.match(html,/src="\.\/assets\/vue-brain-realistic\.webp"/);
 assert.doesNotMatch(html,/src="\.\/assets\/vue-brain\.svg"/);
 assert.ok(statSync(new URL('../assets/vue-brain-realistic.webp',import.meta.url)).size>1000);
});
test('realistic brain moves gently and respects reduced motion',()=>{
 assert.match(html,/animation:vue-brain-turn 24s ease-in-out infinite/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/\.vue-brain-core,\.vue-brain-orbit \{ animation:none; \}/);
 assert.doesNotMatch(html,/@keyframes vue-brain-turn \{ from \{ transform:rotateY\(0deg\)/);
});
