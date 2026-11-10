import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {urgentFollowup} from '../api/vue-followup.js';
const source=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
test('ANIVUE emergency guidance precedes shared photo classification',()=>{
 const emergency=source.indexOf("if(route.domain==='anivue'&&urgent)return json(200");
 const classify=source.indexOf('classifyImage(b.image,question)');
 assert.ok(emergency>=0&&classify>emergency);
 assert.match(source,/emergency:true/);
 assert.match(source,/image_analyzed:false/);
});
test('ANIVUE horse colic remains urgent in shared VUECORE',()=>{
 assert.ok(urgentFollowup('anivue','My horse has colic',{},'en'));
 assert.ok(urgentFollowup('anivue','Min häst har kolik',{},'sv'));
});
