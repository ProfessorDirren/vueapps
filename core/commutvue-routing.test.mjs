import test from 'node:test';
import assert from 'node:assert/strict';
import {isRegisteredSpecialist,specialistGuide} from './specialists.js';
import {routeRegisteredQuestion} from './router.js';
import {MEMORY_DOMAINS} from './memory.js';
test('COMMUTVUE inherits VUECORE registry and memory domain',()=>{
 assert.equal(isRegisteredSpecialist('commutvue'),true);
 assert.ok(MEMORY_DOMAINS.includes('commutvue'));
});
test('COMMUTVUE guidance is available for all existing specialist-guide languages',()=>{
 for(const locale of ['en','es','sv','hi','zh-CN','ru','ar']){
  const guide=specialistGuide('commutvue',locale);
  assert.equal(guide.questions.length,3);
 }
});
test('commuter queries route to COMMUTVUE rather than car or animal specialists',()=>{
 for(const question of ['Är pendeltågen från Jordbro till T-Centralen försenade?','Is my commuter train delayed?','Le RER B est-il en retard ?','¿Hay trenes retrasados?','通勤列车晚点了吗？']){
  const route=routeRegisteredQuestion(question);
  assert.equal(route.domain,'commutvue',question);
  assert.equal(route.clarify,false);
 }
});
