import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../apps/router.js',import.meta.url),'utf8');
test('all seven portal languages have quota, configuration and provider failure notices',()=>{const section=source.match(/const unavailable=(\{[\s\S]*?\});const lang=document\.documentElement\.lang/)?.[1];assert.ok(section);for(const lang of ['en','sv','es','hi','zh-CN','ru','ar']){const key=lang==='zh-CN'?"'zh-CN'":lang;const start=section.indexOf(key+':{');assert.ok(start>=0,lang);const next=section.indexOf('}',start);const values=section.slice(start,next);for(const code of [429,503,502])assert.match(values,new RegExp(String(code)+':'),lang+' '+code)}});
