/**
 * Regional GTFS-RT route evidence must be joined to static GTFS from the
 * SAME SL Regional dataset. Caller supplies authoritative stop sequence.
 * Neither a destination label nor an unmatched realtime trip is route proof.
 */
export function verifyRegionalJourney({evidence,tripStops,tripMetadata=new Map(),originStopIds,destinationStopIds,now=Date.now(),maxAgeMs=120000}={}){
 if(!evidence||evidence.status!=='trip_evidence_unverified'||!Array.isArray(evidence.trips)||!(tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!Number.isFinite(now)||!Number.isFinite(maxAgeMs)||maxAgeMs<=0)return {status:'unavailable',reason:'missing_static_mapping',departures:[]};
 // Reject stale, future-dated or missing feed timestamps before evaluating trips.
 const feedAge=now-evidence.feedTimestampMs;
 if(!Number.isFinite(feedAge)||feedAge<0||feedAge>maxAgeMs)return {status:'unavailable',reason:'stale_or_missing_feed',departures:[]};
 const departures=[];
 const counts=new Map();
 for(const trip of evidence.trips)if(typeof trip?.tripId==='string')counts.set(trip.tripId,(counts.get(trip.tripId)||0)+1);
 for(const trip of evidence.trips){
  if(counts.get(trip?.tripId)!==1)continue;
  const stops=tripStops.get(trip.tripId);
  if(!Array.isArray(stops)||stops.length<2||stops.length>300)continue;
  const ids=stops.map(s=>typeof s==='string'?s:s?.stop);
  // A repeated matching stop makes the selected platform/stop occurrence
  // ambiguous without stop_sequence evidence. Fail closed rather than
  // attaching a prediction to the wrong leg of a looping service.
  const originMatches=ids.flatMap((id,i)=>originStopIds.has(id)?[i]:[]);
  if(originMatches.length!==1)continue;
  const originIndex=originMatches[0];
  const destinationMatches=ids.flatMap((id,i)=>i>originIndex&&destinationStopIds.has(id)?[i]:[]);
  if(destinationMatches.length!==1)continue;
  const destinationIndex=destinationMatches[0];
  const originUpdates=trip.stops?.filter(s=>s?.stopId===ids[originIndex])||[];
  if(originUpdates.length!==1)continue;
  const update=originUpdates[0];
  const time=update?.departure?.unixTime;
  if(!Number.isSafeInteger(time)||time<=0)continue;
  const departureMs=time*1000;
  // Feed freshness alone is insufficient: a fresh feed may include an
  // already departed trip or a prediction far outside the query window.
  if(!Number.isSafeInteger(departureMs)||departureMs<now-120000||departureMs>now+7200000)continue;
  // An event timestamp is a prediction, not a feed freshness timestamp.
  // Do not claim live status until a verified feed header timestamp is supplied.

  const scheduledStop=stops[originIndex],meta=tripMetadata instanceof Map?tripMetadata.get(trip.tripId)||{}:{};
  // Destination arrival is optional: only accept a unique GTFS-RT stop update
  // for the exact downstream stop in the authenticated static trip sequence.
  const destinationUpdates=trip.stops?.filter(s=>s?.stopId===ids[destinationIndex])||[];
  const arrivalSeconds=destinationUpdates.length===1?destinationUpdates[0]?.arrival?.unixTime:null;
  const arrivalMs=Number.isSafeInteger(arrivalSeconds)&&arrivalSeconds>0?arrivalSeconds*1000:null;
  const predictedArrival=Number.isSafeInteger(arrivalMs)&&arrivalMs>=departureMs&&arrivalMs<=departureMs+4*60*60*1000?new Date(arrivalMs).toISOString():null;
  departures.push({tripId:trip.tripId,originStopId:ids[originIndex],destinationStopId:ids[destinationIndex],scheduledDeparture:typeof scheduledStop==='object'?scheduledStop.departureTime||null:null,routeShortName:meta.routeShortName||null,routeLongName:meta.routeLongName||null,tripHeadsign:meta.tripHeadsign||null,tripShortName:meta.tripShortName||null,predictedDeparture:new Date(departureMs).toISOString(),predictedArrival,evidence:'regional_trip_update'});
 }
 return {status:departures.length?'route_matched':'unavailable',reason:departures.length?'fresh_trip_updates':'no_verified_updates',departures};
}
