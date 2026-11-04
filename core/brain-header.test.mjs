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
 assert.match(html,/animation:vue-brain-turn 18s ease-in-out infinite/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/\.vue-brain-core,\.vue-brain-orbit,\.vue-brain-glint \{ animation:none; \}/);
 assert.doesNotMatch(html,/@keyframes vue-brain-turn \{ from \{ transform:rotateY\(0deg\)/);
});

test('brain image fits its header box and has an accurate accessible description',()=>{
 assert.match(html,/\.vue-brain-core \{ width:auto;height:100%;max-width:100%;object-fit:contain;/);
 assert.match(html,/aria-label="Gray brain with pink neon orbit"/);
 assert.match(html,/header \{ position:relative;min-height:150px; \}/);
});

test('pink orbit has a visible moving highlight and remains decorative',()=>{
 assert.match(html,/class="vue-brain-glint" aria-hidden="true"/);
 assert.match(html,/animation:vue-brain-glint 10s linear infinite/);
 assert.match(html,/@keyframes vue-brain-glint/);
});

test('brain image backdrop is softly feathered instead of showing a rectangular edge',()=>{
 assert.match(html,/mask-image:radial-gradient\(ellipse 47% 46% at center,#000 67%,transparent 100%\)/);
});

test('mobile header reserves a second row for the brain without covering controls',()=>{
 assert.match(html,/@media\(max-width:600px\) \{ header \{ min-height:188px; \} \.vue-brain \{ left:50%;top:125px;width:150px;height:81px;/);
});
