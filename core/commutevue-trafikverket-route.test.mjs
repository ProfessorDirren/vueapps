import test from 'node:test';
import assert from 'node:assert/strict';
import {matchTrafikverketTrainRoute} from './commutevue-trafikverket-route.js';
const origin={LocationSignature:'J',ActivityType:'Avgang',AdvertisedTrainIdent:'43',AdvertisedTimeAtLocation:'2026-11-21T10:00:00+01:00',EstimatedTimeAtLocation:'2026-11-21T10:03:00+01:00'};
const dest={LocationSignature:'Sci',ActivityType:'Ankomst',AdvertisedTrainIdent:'43',AdvertisedTimeAtLocation:'2026-11-21T10:25:00+01:00'};
const args={origin:[origin],destination:[dest],originSignature:'J',destinationSignature:'Sci',now:Date.parse('2026-11-21T09:55:00+01:00')};
test('COMMUTEVUE matches two station announcements without inventing delay',()=>{
 const matched=matchTrafikverketTrainRoute(args);
 assert.equal(matched.length,1);
 assert.equal(matched[0].train,'43');
 assert.equal(matched[0].estimatedTime,origin.EstimatedTimeAtLocation);
 assert.equal(matched[0].hasEstimatedTime,true);
});
test('COMMUTEVUE refuses destination without matching train, arrival order or unique proof',()=>{
 assert.deepEqual(matchTrafikverketTrainRoute({...args,destination:[{...dest,AdvertisedTrainIdent:'44'}]}),[]);
 assert.deepEqual(matchTrafikverketTrainRoute({...args,destination:[{...dest,AdvertisedTimeAtLocation:'2026-11-21T09:50:00+01:00'}]}),[]);
 assert.deepEqual(matchTrafikverketTrainRoute({...args,destination:[dest,dest]}),[]);
 assert.deepEqual(matchTrafikverketTrainRoute({...args,origin:[{...origin,Canceled:true}]}),[]);
});
test('COMMUTEVUE does not treat a timetable-only announcement as estimated realtime',()=>{
 const matched=matchTrafikverketTrainRoute({...args,origin:[{...origin,EstimatedTimeAtLocation:undefined}]});
 assert.equal(matched.length,1);
 assert.equal(matched[0].hasEstimatedTime,false);
 assert.equal(matched[0].estimatedTime,null);
});
