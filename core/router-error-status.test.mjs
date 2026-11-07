import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('router distinguishes quota, unconfigured provider and transient failures',()=>{assert.match(source,/error\.status=response\.status/);for(const status of [429,503,502])assert.match(source,new RegExp(String(status)+':'));assert.match(source,/messages\[error\.status\]\|\|t\(\)\[5\]/)});
test('failure messages do not cause extra provider requests',()=>{assert.equal((source.match(/fetch\('\/api\/vue-router'/g)||[]).length,1)});
