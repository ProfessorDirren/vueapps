import test from 'node:test';
import assert from 'node:assert/strict';
import {MEMORY_TEXT} from './memory-content.js';
const locales=['en','sv','es','hi','zh-CN','ru','ar'];
const imageTerms={en:/image/,sv:/bilden/,es:/imagen/,hi:/तस्वीर/, 'zh-CN':/图片/,ru:/изображении/,ar:/الصورة/};
const videoTerms={en:/video/,sv:/videon/,es:/vídeo/,hi:/वीडियो/,'zh-CN':/视频/,ru:/видео/,ar:/الفيديو/};
test('shared follow-up examples include image and video in every supported locale',()=>{
 for(const lang of locales){
  const phrase=MEMORY_TEXT[lang]?.[41];
  assert.equal(typeof phrase,'string',lang);
  assert.match(phrase,imageTerms[lang],lang+' image');
  assert.match(phrase,videoTerms[lang],lang+' video');
 }
});
test('all memory locales retain matching text index counts',()=>{
 for(const [lang,texts] of Object.entries(MEMORY_TEXT))assert.equal(texts.length,43,lang);
});
