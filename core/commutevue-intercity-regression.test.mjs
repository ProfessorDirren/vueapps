import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion} from './router.js';
import {parseCommuteQuestion,commuteTransportMode} from './commutvue-query.js';

const question='hur kommer jag snabbast och enklast från Tyresö Centrum till Göteborg Centralstation';
test('INTERCITY: multimodal request routes to COMMUTE-VUE despite prior specialist',()=>{
 for(const previous of [null,'foodvue','anivue','anyvue']){
  const result=routeQuestion(question,previous);
  assert.equal(result.domain,'commutvue',String(previous));
  assert.notEqual(result.clarify,true,String(previous));
 }
});
test('INTERCITY: preserve endpoints and never force one mode',()=>{
 const result=parseCommuteQuestion(question);
 assert.equal(result.from,'Tyresö Centrum');
 assert.equal(result.to,'Göteborg Centralstation');
 assert.equal(commuteTransportMode(question),null);
});
test('INTERCITY: never silently claim Stockholm-only coverage for Göteborg',()=>{
 const result=parseCommuteQuestion(question);
 assert.equal(result.needsClarification,false,'Known endpoints do not need clarification');
 assert.equal(result.unsupportedIntercity,true,'Cross-region journey must be marked unsupported');
 assert.equal(result.region,null,'Never treat intercity journey as Stockholm-only');
});
