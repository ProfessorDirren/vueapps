import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseResRobotStop,normalizeResRobotLeg,resRobotServiceIdentity,parseSwedishArrivalDeadline,planNationalSwedenJourney,rankResRobotTrips} from './commutvue-resrobot.js';
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

test('national ranking applies consistent transfer penalty',()=>{
 const direct={legs:[{from:'A',to:'D',departure:'2026-11-22T08:00',arrival:'2026-11-22T10:05'}]};
 const transfer={legs:[{from:'A',to:'B',departure:'2026-11-22T08:00',arrival:'2026-11-22T08:40'},{from:'B',to:'D',departure:'2026-11-22T08:45',arrival:'2026-11-22T10:00'}]};
 assert.equal(rankResRobotTrips([transfer,direct])[0],direct);
});
test('national ranking is deterministic across input order',()=>{
 const trip=(mins)=>({legs:[{from:'A',to:'D',departure:'2026-11-22T08:00',arrival:'2026-11-22T'+mins}]});
 const a=trip('10:00'),b=trip('10:12'),c=trip('10:25');
 assert.deepEqual(rankResRobotTrips([a,b,c]),rankResRobotTrips([c,a,b]));
});

test('national journey rejects disconnected transfers even with valid times',()=>{
 const disconnected={legs:[
  {from:'Tyresö Centrum',to:'Gullmarsplan',departure:'2026-11-22T08:00',arrival:'2026-11-22T08:30'},
  {from:'Stockholm Central',to:'Göteborg Centralstation',departure:'2026-11-22T09:00',arrival:'2026-11-22T12:00'}
 ]};
 assert.deepEqual(rankResRobotTrips([disconnected]),[]);
});
test('national journey accepts connected transfer legs',()=>{
 const connected={legs:[
  {from:'Tyresö Centrum',to:'Gullmarsplan',departure:'2026-11-22T08:00',arrival:'2026-11-22T08:30'},
  {from:'Gullmarsplan',to:'Stockholm Central',departure:'2026-11-22T08:35',arrival:'2026-11-22T08:50'},
  {from:'Stockholm Central',to:'Göteborg Centralstation',departure:'2026-11-22T09:00',arrival:'2026-11-22T12:00'}
 ]};
 assert.equal(rankResRobotTrips([connected]).length,1);
});

test('national journey does not show duplicate provider options',()=>{
 const trip={legs:[{from:'Tyresö Centrum',to:'Göteborg Centralstation',departure:'2026-11-22T08:00',arrival:'2026-11-22T12:00',mode:'JST'}]};
 assert.equal(rankResRobotTrips([trip,structuredClone(trip)]).length,1);
});
test('national journey preserves distinct departure options',()=>{
 const trip=departure=>({legs:[{from:'A',to:'B',departure,arrival:'2026-11-22T12:00',mode:'JST'}]});
 assert.equal(rankResRobotTrips([trip('2026-11-22T08:00'),trip('2026-11-22T09:00')]).length,2);
});

test('national planner rejects missing and invalid itinerary times',()=>{
 const base={from:'A',to:'B',departure:'2026-11-22T08:00',arrival:'2026-11-22T09:00'};
 const missing={legs:[{...base,arrival:null}]};
 const invalid={legs:[{...base,arrival:'not-a-time'}]};
 const reversed={legs:[{...base,arrival:'2026-11-22T07:00'}]};
 assert.deepEqual(rankResRobotTrips([missing,invalid,reversed]),[]);
});
test('national planner rejects zero-length and excessive journeys',()=>{
 const base={from:'A',to:'B',departure:'2026-11-22T08:00'};
 const zero={legs:[{...base,arrival:'2026-11-22T08:00'}]};
 const excessive={legs:[{...base,arrival:'2026-11-24T08:00'}]};
 assert.deepEqual(rankResRobotTrips([zero,excessive]),[]);
});

test('national planner refuses identical resolved stop IDs without trip API call',async()=>{
 let tripCalls=0;
 const fetchImpl=async url=>{
  if(url.pathname.endsWith('/trip')){tripCalls++;throw new Error('must not request a journey to the same stop');}
  return {ok:true,json:async()=>({StopLocation:[{id:'same-id',name:url.searchParams.get('input')}]})};
 };
 const result=await planNationalSwedenJourney('Stockholm Central','Stockholm Central',{apiKey:'dummy',fetchImpl});
 assert.equal(result.status,'same_stop');
 assert.deepEqual(result.trips,[]);
 assert.equal(tripCalls,0);
});

test('Swedish arrive-by request parses exact date and minute without guessing realtime',()=>{
 const parsed=parseSwedishArrivalDeadline('Jag vill vara framme senast kl 10.30 den 23 november',{now:new Date('2026-11-22T00:00:00Z')});
 assert.deepEqual(parsed,{date:'2026-11-23',time:'10:30',cutoff:'2026-11-23T10:30',explicitYear:false});
 assert.equal(parseSwedishArrivalDeadline('jag vill vara framme senast kl 25.30 den 23 november').invalid,true);
 assert.equal(parseSwedishArrivalDeadline('jag vill vara framme senast kl 10.30 den 31 november').invalid,true);
});
test('national arrive-by query asks provider for arrival search and rejects late options',async()=>{
 let tripCalls=0;
 const fetchImpl=async url=>{
  if(url.pathname.endsWith('location.name'))return {ok:true,json:async()=>({StopLocation:[{id:url.searchParams.get('input'),name:url.searchParams.get('input')}]})};
  tripCalls++;
  assert.equal(url.searchParams.get('searchForArrival'),'1');
  assert.equal(url.searchParams.get('date'),'2026-11-23');
  assert.equal(url.searchParams.get('time'),'10:30');
  const leg=arrival=>({Origin:{name:'Tyresö Centrum',date:'2026-11-23',time:'06:00:00'},Destination:{name:'Göteborg Centralstation',date:'2026-11-23',time:arrival}});
  return {ok:true,json:async()=>({Trip:[{LegList:{Leg:[leg('10:30:00')]}},{LegList:{Leg:[leg('10:47:00')]}}]})};
 };
 const arriveBy={date:'2026-11-23',time:'10:30',cutoff:'2026-11-23T10:30'};
 const result=await planNationalSwedenJourney('Tyresö Centrum','Göteborg Centralstation',{apiKey:'dummy',fetchImpl,arriveBy});
 assert.equal(tripCalls,1);
 assert.equal(result.status,'schedule_available');
 assert.equal(result.trips.length,1);
 assert.equal(result.trips[0].arrival,'2026-11-23T10:30:00');
});
test('national arrive-by query fails closed if all arrivals miss deadline',async()=>{
 const fetchImpl=async url=>url.pathname.endsWith('location.name')?{ok:true,json:async()=>({StopLocation:[{id:url.searchParams.get('input'),name:url.searchParams.get('input')}]})}:{ok:true,json:async()=>({Trip:[{LegList:{Leg:[{Origin:{name:'A',date:'2026-11-23',time:'06:00:00'},Destination:{name:'B',date:'2026-11-23',time:'10:47:00'}}]}}]})};
 const arriveBy={date:'2026-11-23',time:'10:30',cutoff:'2026-11-23T10:30'};
 const result=await planNationalSwedenJourney('A','B',{apiKey:'dummy',fetchImpl,arriveBy});
 assert.equal(result.status,'no_journeys');
 assert.deepEqual(result.trips,[]);
});

test('ResRobot walking legs preserve provider-declared WALK mode',()=>{
 const leg={type:'WALK',Origin:{name:'T-Centralen T-bana',date:'2026-11-22',time:'06:53:00'},Destination:{name:'Stockholm Centralstation',date:'2026-11-22',time:'07:13:00'}};
 assert.equal(normalizeResRobotLeg(leg).mode,'WALK');
 assert.equal(normalizeResRobotLeg({...leg,type:'unknown'}).mode,null);
});

test('ResRobot service identity uses only a unique explicit numeric product number',()=>{
 assert.equal(resRobotServiceIdentity({Product:[{num:'1234',catOut:'JST'}]}),'1234');
 assert.equal(resRobotServiceIdentity({Product:{num:456}}),'456');
 assert.equal(resRobotServiceIdentity({Product:[{num:'SJ 1234'}]}),null);
 assert.equal(resRobotServiceIdentity({Product:[{num:'123'},{num:'456'}]}),null);
 assert.equal(resRobotServiceIdentity({Product:[{catOut:'JST'}]}),null);
 assert.equal(resRobotServiceIdentity({type:'WALK'}),null);
 const leg=normalizeResRobotLeg({Origin:{name:'Stockholm Centralstation',date:'2026-11-23',time:'07:00:00'},Destination:{name:'Göteborg Centralstation',date:'2026-11-23',time:'10:20:00'},Product:[{num:'1234',catOut:'JST'}]});
 assert.equal(leg.serviceId,'1234');
});
