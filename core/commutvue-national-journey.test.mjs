import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseResRobotStop,planNationalSwedenJourney} from './commutvue-resrobot.js';
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
