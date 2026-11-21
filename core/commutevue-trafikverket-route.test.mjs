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

test('COMMUTEVUE distinguishes actual and modified timestamps from estimated departures',()=>{
 const matched=matchTrafikverketTrainRoute({...args,origin:[{...origin,EstimatedTimeAtLocation:undefined,TimeAtLocation:'2026-11-21T10:02:00+01:00',ModifiedTime:'2026-11-21T09:58:00+01:00'}]});
 assert.equal(matched.length,1);
 assert.equal(matched[0].hasEstimatedTime,false);
 assert.equal(matched[0].hasActualTime,true);
 assert.equal(matched[0].hasModifiedTime,true);
 assert.equal(matched[0].estimatedTime,null);
});
test('COMMUTEVUE does not count invalid time evidence',()=>{
 const matched=matchTrafikverketTrainRoute({...args,origin:[{...origin,EstimatedTimeAtLocation:null,TimeAtLocation:'invalid',ModifiedTime:''}]});
 assert.equal(matched[0].hasActualTime,false);
 assert.equal(matched[0].hasModifiedTime,false);
});

test('Swedish local midnight service date matches trains crossing UTC date boundaries',()=>{
 const late={...origin,AdvertisedTimeAtLocation:'2026-11-21T00:15:00+01:00'};
 const arrival={...dest,AdvertisedTimeAtLocation:'2026-11-21T00:40:00+01:00'};
 const now=Date.parse('2026-11-21T00:10:00+01:00');
 assert.equal(matchTrafikverketTrainRoute({...args,origin:[late],destination:[arrival],now}).length,1);
 // A different Swedish service date must not match even when the train ID repeats.
 const nextDay={...arrival,AdvertisedTimeAtLocation:'2026-11-22T00:40:00+01:00'};
 assert.deepEqual(matchTrafikverketTrainRoute({...args,origin:[late],destination:[nextDay],now}),[]);
});

test('Swedish train travelling across midnight retains verified destination',()=>{
 const late={...origin,AdvertisedTimeAtLocation:'2026-11-21T23:55:00+01:00'};
 const nextDayArrival={...dest,AdvertisedTimeAtLocation:'2026-11-22T00:20:00+01:00'};
 const now=Date.parse('2026-11-21T23:50:00+01:00');
 const matched=matchTrafikverketTrainRoute({...args,origin:[late],destination:[nextDayArrival],now});
 assert.equal(matched.length,1);
 assert.equal(matched[0].destinationArrival,new Date(nextDayArrival.AdvertisedTimeAtLocation).toISOString());
 const tooLate={...nextDayArrival,AdvertisedTimeAtLocation:'2026-11-22T03:30:00+01:00'};
 assert.deepEqual(matchTrafikverketTrainRoute({...args,origin:[late],destination:[tooLate],now}),[]);
});
