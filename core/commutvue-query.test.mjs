import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommuteQuestion} from './commutvue-query.js';
test('extract Stockholm commute without inventing stops',()=>{
 const q=parseCommuteQuestion('Är pendeltågen från Jordbro till T-Centralen försenade?');
 assert.deepEqual(q,{region:'stockholm',from:'Jordbro',to:'T-Centralen',needsClarification:false});
});
test('recognize Paris region and stations',()=>{
 const q=parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?');
 assert.equal(q.region,'paris');
 assert.equal(q.from,'Gare du Nord');
 assert.equal(q.to,'Châtelet');
 assert.equal(q.needsClarification,false);
});
test('unknown geography and missing stops require clarification',()=>{
 assert.equal(parseCommuteQuestion('Is my train delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('RER B delayed?').needsClarification,true);
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').region,null);
});

test('Unicode city names are detected as complete words',()=>{
 assert.equal(parseCommuteQuestion('Train from Gare du Nord to Châtelet delayed?').to,'Châtelet');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').region,'stockholm');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Stockholm City delayed?').to,'Stockholm City');
 assert.equal(parseCommuteQuestion('Train from Jordbro to Gare du Nord?').needsClarification,true);
});

test('Chile Santiago Spanish transit journey resolves without guessing live status',()=>{
 const q=parseCommuteQuestion('Metro de Santiago desde Baquedano a Tobalaba');
 assert.deepEqual(q,{region:'santiago',from:'Baquedano',to:'Tobalaba',needsClarification:false});
});
test('Chile geography is not confused with Stockholm or Paris',()=>{
 assert.equal(parseCommuteQuestion('Bus de Maipú a Plaza de Armas').region,'santiago');
 assert.equal(parseCommuteQuestion('Metro de Santiago desde Baquedano a Gare du Nord').needsClarification,true);
 assert.equal(parseCommuteQuestion('Bus de una parada a otra').needsClarification,true);
});
