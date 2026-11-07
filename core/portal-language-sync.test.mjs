import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const portal=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const router=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
const help=readFileSync(new URL('../apps/help-renderer.js',import.meta.url),'utf8');
const video=readFileSync(new URL('./video-input.js',import.meta.url),'utf8');

test('portal announces language changes after synchronizing the selected language',()=>{
 assert.match(portal,/picker\.value=lang;\s*document\.dispatchEvent\(new CustomEvent\("vueapps:languagechange"/);
 assert.match(portal,/document\.documentElement\.lang=lang/);
});
test('VUECORE router explicitly refreshes when portal language changes',()=>{
 assert.match(router,/document\.addEventListener\('vueapps:languagechange',render\)/);
});
test('VUECORE video actions refresh and release language listener on disposal',()=>{
 assert.match(video,/root\.addEventListener\?\.\('vueapps:languagechange',translate\)/);
 assert.match(video,/root\.removeEventListener\?\.\('vueapps:languagechange',translate\)/);
});

test('Help refreshes after the portal commits the selected language',()=>{
 assert.match(help,/document\.addEventListener\?\.\('vueapps:languagechange', render\)/);
 assert.match(help,/document\.removeEventListener\?\.\('vueapps:languagechange', render\)/);
});
