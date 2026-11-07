import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const pages = ['index','anyvue','armvue','foodvue','homevue','medivue','vinylvue','plantvue','motovue','estatevue','wardrobevue','musicgearvue','slumpvue','anivue-core','antiqvue'];
for (const page of pages) test(`${page} loads shared analytics`, () => {
  assert.match(read(`${page}.html`), /<script src="\.\/analytics\.js" defer><\/script>/);
});
test('analytics uses bounded events without collecting user content', () => {
  const script = read('analytics.js');
  for (const name of ['assessment_started','assessment_completed','specialist_action']) assert.ok(script.includes(name));
  assert.match(script,/disable_session_recording: true/);
  assert.match(script,/autocapture: false/);
  assert.match(script,/person_profiles: 'never'/);
  assert.doesNotMatch(script,/capture\([^\n]*(question|description|image|answer)/i);
});
