import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIALISTS} from './specialists.js';
const api=readFileSync(new URL('../api/vue-router.js',import.meta.url),'utf8');
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../docs/anivue-core-migration-2027.md',import.meta.url),'utf8');

test('ANIVUE is registered as a VUECORE specialist and routes internally',()=>{
 assert.ok(SPECIALISTS.anivue);
 assert.match(api,/workspace:'\.\/\?vue=anivue#vue-router'/);
 assert.match(router,/isRegisteredSpecialist\(requestedSpecialist\)/);
 assert.doesNotMatch(api,/https?:\/\/(?:www\.)?anivue(?:app)?\.se/i);
 assert.doesNotMatch(router,/https?:\/\/(?:www\.)?anivue(?:app)?\.se/i);
});
test('legacy ANIVUE decommission requires separate verified cutover',()=>{
 assert.match(migration,/standalone ANIVUE service/);
 assert.match(migration,/Legacy ANIVUE DNS and service remain untouched/);
});
