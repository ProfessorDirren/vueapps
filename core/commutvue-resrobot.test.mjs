import test from 'node:test';
import assert from 'node:assert/strict';
import {resRobotConfigured,normalizeResRobotTrips,lookupResRobotStops,planResRobotTrip} from './commutvue-resrobot.js';
test('national adapter requires its own configured key',()=>{
 assert.equal(resRobotConfigured({TRAFIKLAB_API_KEY:'existing'}),false);
 assert.equal(resRobotConfigured({RESROBOT_API_KEY:'key'}),true);
});
test('never invent routes from incomplete or empty provider payloads',()=>{
 assert.deepEqual(normalizeResRobotTrips({}),[]);
 assert.deepEqual(normalizeResRobotTrips({Trip:[{LegList:{Leg:[{Origin:{name:'A'},Destination:{name:'B'}}]}}]}),[]);
});
test('unconfigured adapter never makes network calls',async()=>{
 let called=false;
 const fetchImpl=async()=>{called=true;throw new Error('should not call');};
 await assert.rejects(lookupResRobotStops('Tyresö Centrum',{fetchImpl}),/resrobot_not_configured/);
 await assert.rejects(planResRobotTrip('a','b',{fetchImpl}),/resrobot_not_configured/);
 assert.equal(called,false);
});
test('valid provider legs remain explicitly unverified',()=>{
 const result=normalizeResRobotTrips({Trip:[{LegList:{Leg:[{Origin:{name:'Tyresö Centrum',date:'2026-11-22',time:'12:00:00'},Destination:{name:'Göteborg Centralstation',date:'2026-11-22',time:'16:00:00'}}]}}]});
 assert.equal(result.length,1);
 assert.equal(result[0].verified,false);
 assert.equal(result[0].legs[0].from,'Tyresö Centrum');
});

test('documented StopLocation response yields national stop identifiers',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({StopLocation:[{id:'740098001',name:'GÖTEBORG'}]})});
 const stops=await lookupResRobotStops('Göteborg',{apiKey:'test',fetchImpl});
 assert.deepEqual(stops,[{id:'740098001',name:'GÖTEBORG'}]);
});
test('HTTP 200 service errors fail closed instead of inventing a trip',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({errorCode:'SVC_NO_RESULT'})});
 assert.deepEqual(await planResRobotTrip('a','b',{apiKey:'test',fetchImpl}),[]);
});

test('single trip and single leg objects normalize without inventing realtime',()=>{
 const result=normalizeResRobotTrips({Trip:{LegList:{Leg:{Origin:{name:'Tyresö Centrum',date:'2026-11-22',time:'12:00:00'},Destination:{name:'Göteborg Centralstation',date:'2026-11-22',time:'16:00:00'}}}}});
 assert.equal(result.length,1);
 assert.equal(result[0].legs.length,1);
 assert.equal(result[0].verified,false);
});
test('malformed single leg object fails closed',()=>{
 assert.deepEqual(normalizeResRobotTrips({Trip:{LegList:{Leg:{Origin:{name:'A'}}}}}),[]);
});
