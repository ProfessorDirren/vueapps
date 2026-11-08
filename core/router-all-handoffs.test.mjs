import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion,routeRegisteredQuestion,ROUTED_SPECIALIST_IDS} from './router.js';
import {MEMORY_DOMAINS} from './memory.js';

// One unambiguous new topic for every explicitly routed specialist.
// Every previous specialist must yield to that new topic, including itself.
const topics={
 martialartsvue:'karate',
 estatevue:'dödsbo',
 medivue:'bipacksedel',
 vinylvue:'vinyl',
 musicgearvue:'Marshall amplifier',
 wardrobevue:'klänning',
 anivue:'min hund är sjuk',
 motovue:'motorcykel',
 foodvue:'E330',
 plantvue:'krukväxt',
 antiqvue:'antik byrå',
 armvue:'min .308 klickar',
 homevue:'luftfilter',
 slumpvue:'överraska mig'
};
test('every registered explicit VUE topic wins over every previous VUE',()=>{
 assert.deepEqual([...ROUTED_SPECIALIST_IDS].sort(),Object.keys(topics).sort());
 for(const [expected,question] of Object.entries(topics)){
  for(const previous of [null,...MEMORY_DOMAINS]){
   const route=routeQuestion(question,previous);
   assert.deepEqual(route,{domain:expected,clarify:false},question+' after '+previous);
   assert.deepEqual(routeRegisteredQuestion(question,previous),route,question+' registered after '+previous);
  }
 }
});
test('ambiguous follow-ups preserve the selected VUE rather than silently switch',()=>{
 for(const previous of MEMORY_DOMAINS){
  const route=routeQuestion('Kan du förklara mer?',previous);
  assert.equal(route.domain,previous,previous);
  assert.equal(route.clarify,false,previous);
 }
});
test('cross-topic questions do not inherit a previous specialist merely because of session history',()=>{
 for(const previous of MEMORY_DOMAINS){
  for(const [expected,question] of Object.entries(topics)){
   if(previous===expected)continue;
   const route=routeQuestion(question,previous);
   assert.equal(route.domain,expected,question+' after '+previous);
  }
 }
});
