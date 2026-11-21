/**
 * Regional GTFS-RT route evidence must be joined to static GTFS from the
 * SAME SL Regional dataset. Caller supplies authoritative stop sequence.
 * Neither a destination label nor an unmatched realtime trip is route proof.
 */
export function verifyRegionalJourney({evidence,tripStops,originStopIds,destinationStopIds,now=Date.now(),maxAgeMs=120000}={}){
 if(!evidence||evidence.status!=='trip_evidence_unverified'||!Array.isArray(evidence.trips)||!(tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!Number.isFinite(now)||!Number.isFinite(maxAgeMs)||maxAgeMs<=0)return {status:'unavailable',reason:'missing_static_mapping',departures:[]};
 const departures=[];
 for(const trip of evidence.trips){
  const stops=tripStops.get(trip.tripId);
  if(!Array.isArray(stops)||stops.length<2||stops.length>300)continue;
  const originIndex=stops.findIndex(s=>originStopIds.has(s));
  const destinationIndex=stops.findIndex((s,i)=>i>originIndex&&destinationStopIds.has(s));
  if(originIndex<0||destinationIndex<=originIndex)continue;
  const update=trip.stops?.find(s=>s.stopId===stops[originIndex]);
  const time=update?.departure?.unixTime;
  if(!Number.isSafeInteger(time)||time<=0)continue;
  const departureMs=time*1000;
  // An event timestamp is a prediction, not a feed freshness timestamp.
  // Do not claim live status until a verified feed header timestamp is supplied.
  const age=now-evidence.feedTimestampMs;
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)continue;
  departures.push({tripId:trip.tripId,originStopId:stops[originIndex],destinationStopId:stops[destinationIndex],predictedDeparture:new Date(departureMs).toISOString(),evidence:'regional_trip_update'});
 }
 return {status:departures.length?'route_matched':'unavailable',reason:departures.length?'fresh_trip_updates':'no_verified_updates',departures};
}
