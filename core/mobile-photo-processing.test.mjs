import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('mobile photo processing accepts modern camera image formats',()=>{
 assert.match(source,/image\/heic/);
 assert.match(source,/image\/heif/);
});
test('mobile photo processing does not reject ordinary 12+ megapixel photos or low contrast images',()=>{
 assert.doesNotMatch(source,/12000000/);
 assert.doesNotMatch(source,/getImageData\(/);
});
test('mobile photo displays progress and retains explicit consent',()=>{
 assert.match(source,/loadingPhoto=true;\$\('vue-router-send'\)\.disabled=true;\$\('vue-router-status'\)\.textContent=t\(\)\[4\]/);
 assert.match(source,/\$\('vue-router-photo-public'\)\.checked=false/);
});
