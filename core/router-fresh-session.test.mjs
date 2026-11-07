import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('fresh page does not reopen prior active assessment',()=>{assert.doesNotMatch(source,/storage\.getItem\('vue-core-router-active-v1'\)/);assert.doesNotMatch(source,/const previous=active\?\.caseId/);assert.match(source,/storage=sessionStorage/);assert.match(source,/m\.append\(/)});
