import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../analytics.js',import.meta.url),'utf8');
test('PostHog tracks successful, HTTP-failed and rejected assessments',()=>{
 assert.match(script,/response\.ok\?'assessment_completed':'assessment_failed'/);
 assert.match(script,/error => \{/);
 assert.match(script,/name:'assessment_failed',specialist:label/);
 assert.match(script,/throw error/);
 assert.match(script,/\['assessment_started', 'assessment_completed', 'assessment_failed', 'specialist_action'\]/);
});
test('analytics does not include assessment text or response bodies',()=>{
 assert.doesNotMatch(script,/response\.json\(/);
 assert.doesNotMatch(script,/response\.text\(/);
 assert.doesNotMatch(script,/init\?\.body/);
});
