/**
 * Regional GTFS-RT route evidence must be joined to static GTFS from the
 * SAME SL Regional dataset. Caller supplies authoritative stop sequence.
 * Neither a destination label nor an unmatched realtime trip is route proof.
 */
export function verifyRegionalJourney({evidence,tripStops,originStopIds,destinationStopIds,now=Date.now(),maxAgeMs=120000}={}){
 if(!evidence||evidence.status!=='trip_evidence_unverified'||!Array.isArray(evidence.trips)||!(tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!Number.isFinite(now)||!Number.isFinite(maxAgeMs)||maxAgeMs<=0)return {status:'unavailable',reason:'missing_static_mapping',departures:[]};
 const departures=[];
 const counts=new Map();
 for(const trip of evidence.trips)if(typeof trip?.tripId==='string')counts.set(trip.tripId,(counts.get(trip.tripId)||0)+1);
 for(const trip of evidence.trips){
  if(counts.get(trip?.tripId)!==1)continue;
  const stops=tripStops.get(trip.tripId);
  if(!Array.isArray(stops)||stops.length<2||stops.length>300)continue;
  const ids=stops.map(s=>typeof s==='string'?s:s?.stop);
  const originIndex=ids.findIndex(s=>originStopIds.has(s));
  const destinationIndex=ids.findIndex((s,i)=>i>originIndex&&destinationStopIds.has(s));
  if(originIndex<0||destinationIndex<=originIndex)continue;
  const originUpdates=trip.stops?.filter(s=>s?.stopId===ids[originIndex])||[];
  if(originUpdates.length!==1)continue;
  const update=originUpdates[0];
  const time=update?.departure?.unixTime;
  if(!Number.isSafeInteger(time)||time<=0)continue;
  const departureMs=time*1000;
  // An event timestamp is a prediction, not a feed freshness timestamp.
  // Do not claim live status until a verified feed header timestamp is supplied.
  const age=now-evidence.feedTimestampMs;
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)continue;
  departures.push({tripId:trip.tripId,originStopId:ids[originIndex],destinationStopId:ids[destinationIndex],predictedDeparture:new Date(departureMs).toISOString(),evidence:'regional_trip_update'});
 }
 return {status:departures.length?'route_matched':'unavailable',reason:departures.length?'fresh_trip_updates':'no_verified_updates',departures};
}
