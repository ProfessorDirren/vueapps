import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../apps/music-recognition.js',import.meta.url),'utf8');
const portal=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('music capture is mounted in shared VUECORE portal',()=>{
 assert.match(portal,/mountMusicRecognition\(document\.getElementById\('vue-router'\)\)/);
});
test('mobile audio recorder handles supported codec and microphone cleanup',()=>{
 assert.match(ui,/MediaRecorder\.isTypeSupported/);
 assert.match(ui,/audio\/webm;codecs=opus/);
 assert.match(ui,/audio\/mp4/);
 assert.match(ui,/recorder\.onerror=/);
 assert.match(ui,/getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/);
});
test('music controls use a shared API endpoint without client-side credentials',()=>{
 assert.match(ui,/fetch\('\/api\/music-recognition'/);
 assert.doesNotMatch(ui,/AUDD_API_TOKEN|api_token|Bearer /);
 for(const language of ['en:','es:','sv:','hi:',"'zh-CN':",'ru:','ar:'])assert.ok(ui.includes(language));
});
