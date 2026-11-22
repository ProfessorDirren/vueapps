import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseResRobotStop,planNationalSwedenJourney,rankResRobotTrips} from './commutvue-resrobot.js';
test('station resolution never guesses among ambiguous matches',()=>{
 assert.equal(chooseResRobotStop([{id:'a',name:'Tyresö Centrum'},{id:'b',name:'Tyresö Centrum'}],'Tyresö Centrum'),null);
 assert.equal(chooseResRobotStop([{id:'a',name:'Tyresö Centrum'}],'Tyresö Centrum').id,'a');
});
test('national planner does not call provider without key',async()=>{
 let calls=0;
 const result=await planNationalSwedenJourney('Tyresö Centrum','Göteborg Centralstation',{fetchImpl:async()=>{calls++;}});
 assert.equal(result.status,'not_configured');assert.equal(calls,0);
});
test('national planner resolves exact stops and returns schedule, not realtime',async()=>{
 const fetchImpl=async url=>{
  const path=url.pathname;
  if(path.endsWith('location.name')){
   const input=url.searchParams.get('input');
   return {ok:true,json:async()=>({StopLocation:[{id:input==='Tyresö Centrum'?'origin':'destination',name:input}]})};
  }
  assert.equal(url.searchParams.get('originId'),'origin');
  assert.equal(url.searchParams.get('destId'),'destination');
  return {ok:true,json:async()=>({Trip:[{LegList:{Leg:[{Origin:{name:'Tyresö Centrum',date:'2026-11-22',time:'12:00:00'},Destination:{name:'Göteborg Centralstation',date:'2026-11-22',time:'16:00:00'}}]}}]})};
 };
 const result=await planNationalSwedenJourney('Tyresö Centrum','Göteborg Centralstation',{apiKey:'dummy',fetchImpl});
 assert.equal(result.status,'schedule_available');assert.equal(result.trips[0].verified,false);
});
test('ambiguous stops do not trigger trip request',async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;assert.ok(url.pathname.endsWith('location.name'));return {ok:true,json:async()=>({StopLocation:[{id:'a',name:'Tyresö Centrum'},{id:'b',name:'Tyresö Centrum'}]})};};
 const result=await planNationalSwedenJourney('Tyresö Centrum','Göteborg Centralstation',{apiKey:'dummy',fetchImpl});
 assert.equal(result.status,'ambiguous_stop');assert.equal(calls,2);
});

test('unique municipality-qualified station resolves without guessing',()=>{
 const stop=chooseResRobotStop([{id:'a',name:'Tyresö Centrum (Tyresö kn)'}],'Tyresö Centrum');
 assert.equal(stop?.id,'a');
});
test('multiple municipality-qualified stations still require clarification',()=>{
 const stops=[{id:'a',name:'Centrum (Tyresö kn)'},{id:'b',name:'Centrum (Haninge kn)'}];
 assert.equal(chooseResRobotStop(stops,'Centrum'),null);
});
test('a fuzzy prefix must not silently resolve to the wrong station',()=>{
 assert.equal(chooseResRobotStop([{id:'a',name:'Göteborg Centralstation norra'}],'Göteborg Centralstation'),null);
});

test('national ranking prefers quicker journey over provider order',()=>{
 const trip=(start,end)=>({legs:[{from:'Tyresö Centrum',to:'Göteborg Centralstation',departure:'2026-11-22T'+start,arrival:'2026-11-22T'+end}]});
 const ranked=rankResRobotTrips([trip('08:00','14:00'),trip('08:00','12:00')]);
 assert.equal(ranked[0].arrival,undefined);
 assert.equal(ranked[0].legs[0].arrival,'2026-11-22T12:00');
});
test('national ranking rejects reversed and overlapping legs',()=>{
 const bad={legs:[{from:'A',to:'B',departure:'2026-11-22T10:00',arrival:'2026-11-22T11:00'},{from:'B',to:'C',departure:'2026-11-22T10:30',arrival:'2026-11-22T12:00'}]};
 assert.deepEqual(rankResRobotTrips([bad]),[]);
});
