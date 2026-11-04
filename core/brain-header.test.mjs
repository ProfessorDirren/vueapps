import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const art=readFileSync(new URL('../assets/vue-brain.svg',import.meta.url),'utf8');
test('VUECORE brain header uses local detailed artwork, not emoji',()=>{
 assert.match(html,/src="\.\/assets\/vue-brain\.svg"/);
 assert.match(html,/class="vue-brain-orbit"/);
 assert.doesNotMatch(html,/class="vue-brain-core"[^>]*>🧠/);
 assert.match(art,/<svg[^>]+viewBox=/);
 assert.match(art,/id="fold"/);
});
test('brain and pink orbit rotate slowly with reduced-motion support',()=>{
 assert.match(html,/animation:vue-brain-turn 24s linear infinite/);
 assert.match(html,/animation:vue-brain-orbit 12s linear infinite/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/\.vue-brain-core,\.vue-brain-orbit \{ animation:none; \}/);
});
