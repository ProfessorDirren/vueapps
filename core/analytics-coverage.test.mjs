import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const pages = ['index','anyvue','armvue','foodvue','homevue','medivue','vinylvue','plantvue','motovue','estatevue','wardrobevue','musicgearvue','slumpvue','antiqvue'];
for (const page of pages) test(`${page} loads shared analytics`, () => {
  assert.match(read(`${page}.html`), /<script src="\.\/analytics\.js" defer><\/script>/);
});
test('analytics uses bounded events without collecting user content', () => {
  const script = read('analytics.js');
  for (const name of ['assessment_started','assessment_completed','assessment_failed','specialist_action']) assert.ok(script.includes(name));
  assert.match(script,/disable_session_recording: true/);
  assert.match(script,/autocapture: false/);
  assert.match(script,/person_profiles: 'never'/);
  assert.doesNotMatch(script,/capture\([^\n]*(question|description|image|answer)/i);
});

test('assessment API tracking covers specialist endpoints without reading payloads', () => {
 const script = read('analytics.js');
 for (const endpoint of ['vue-router','antiqvue','vinylvue','musicgearvue','wardrobevue','medivue','foodvue']) assert.ok(script.includes("'"+endpoint+"'"));
 assert.match(script,/url\.origin === location\.origin/);
 assert.match(script,/method !== 'POST'/);
 assert.match(script,/response\.ok\?'assessment_completed':'assessment_failed'/);
 assert.doesNotMatch(script,/response\.json\(|response\.text\(|init\.body/);
 for (const file of ['apps/router.js','apps/antiqvue.js']) assert.doesNotMatch(read(file),/name:'assessment_(started|completed)'/);
});

test('ANIVUE uses shared VUECORE analytics through the portal',()=>{
 const html=read('index.html');
 assert.match(html,/href="\.\/\?vue=anivue#vue-router"/);
 assert.match(html,/<script src="\.\/analytics\.js" defer><\/script>/);
});
