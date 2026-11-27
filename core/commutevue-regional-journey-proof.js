import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';

/**
 * Regional GTFS-RT route evidence must be joined to static GTFS from the
 * SAME SL Regional dataset. Caller supplies authoritative stop sequence.
 * Neither a destination label nor an unmatched realtime trip is route proof.
 */
function matchingStopUpdates(updates, stopId, sequence){
 const matches=(updates||[]).filter(update=>update?.stopId===stopId||
  (Number.isInteger(sequence)&&update?.stopSequence===sequence));
 if(matches.length!==1)return [];
 const [update]=matches;
 if(update.stopId!=null&&update.stopId!==stopId)return [];
 if(Number.isInteger(sequence)&&update.stopSequence!=null&&update.stopSequence!==sequence)return [];
 return matches;
}
function stopEventInstant(event, scheduledTime, serviceDate){
 if(Number.isSafeInteger(event?.unixTime)&&event.unixTime>0)return event.unixTime*1000;
 if(event?.unixTime!=null||!Number.isSafeInteger(event?.delaySeconds)||!/^\d{8}$/.test(serviceDate||''))return NaN;
 const clock=/^(\d{2,3}):([0-5]\d):([0-5]\d)$/.exec(scheduledTime||'');
 if(!clock)return NaN;
 const day=serviceDate.slice(0,4)+'-'+serviceDate.slice(4,6)+'-'+serviceDate.slice(6);
 // GTFS time is elapsed from local noon minus 12 hours, including on DST days.
 const noon=Date.parse(stockholmWallClockToInstant(day+'T12:00:00')||'');
 const seconds=Number(clock[1])*3600+Number(clock[2])*60+Number(clock[3]);
 return noon+(seconds+event.delaySeconds-43200)*1000;
}
export function verifyRegionalJourney({evidence,tripStops,tripMetadata=new Map(),originStopIds,destinationStopIds,serviceDate,now=Date.now(),maxAgeMs=120000,diagnose}={}){
 if(!evidence||evidence.status!=='trip_evidence_unverified'||!Array.isArray(evidence.trips)||!(tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!Number.isFinite(now)||!Number.isFinite(maxAgeMs)||maxAgeMs<=0)return {status:'unavailable',reason:'missing_static_mapping',departures:[]};
 // Reject stale, future-dated or missing feed timestamps before evaluating trips.
 const feedAge=now-evidence.feedTimestampMs;
 if(!Number.isSafeInteger(evidence.feedTimestampMs)||evidence.feedTimestampMs<=0||!Number.isFinite(feedAge)||feedAge<0||feedAge>maxAgeMs)return {status:'unavailable',reason:'stale_or_missing_feed',departures:[]};
 const departures=[];
 const stages={feedTrips:evidence.trips.length,staticTrips:tripStops.size,matchedTrips:0,matchedRoutes:0,originUpdates:0,departureTimes:0,departureDelays:0,predictionsInWindow:0};
 const counts=new Map();
 for(const trip of evidence.trips)if(typeof trip?.tripId==='string')counts.set(trip.tripId,(counts.get(trip.tripId)||0)+1);
 for(const trip of evidence.trips){
  if(counts.get(trip?.tripId)!==1)continue;
  if(serviceDate&&trip.startDate&&trip.startDate!==serviceDate)continue;
  const stops=tripStops.get(trip.tripId);
  if(!Array.isArray(stops)||stops.length<2||stops.length>300)continue;
  stages.matchedTrips++;
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
  stages.matchedRoutes++;
  const originUpdates=matchingStopUpdates(trip.stops,ids[originIndex],stops[originIndex]?.sequence);
  if(originUpdates.length!==1)continue;
  stages.originUpdates++;
  const update=originUpdates[0];
  if(Number.isSafeInteger(update?.departure?.delaySeconds))stages.departureDelays++;
  const datedService=trip.startDate===serviceDate?serviceDate:null;
  const departureMs=stopEventInstant(update.departure,stops[originIndex]?.departureTime,datedService);
  if(Number.isSafeInteger(update.departure?.unixTime)&&update.departure.unixTime>0)stages.departureTimes++;
  // Feed freshness alone is insufficient: a fresh feed may include an
  // already departed trip or a prediction far outside the query window.
  if(!Number.isSafeInteger(departureMs)||departureMs<now-120000||departureMs>now+7200000)continue;
  stages.predictionsInWindow++;
  // An event timestamp is a prediction, not a feed freshness timestamp.
  // Do not claim live status until a verified feed header timestamp is supplied.

  const scheduledStop=stops[originIndex],meta=tripMetadata instanceof Map?tripMetadata.get(trip.tripId)||{}:{};
  // Destination arrival is optional: only accept a unique GTFS-RT stop update
  // for the exact downstream stop in the authenticated static trip sequence.
  const destinationUpdates=matchingStopUpdates(trip.stops,ids[destinationIndex],stops[destinationIndex]?.sequence);
  const arrivalMs=destinationUpdates.length===1
   ?stopEventInstant(destinationUpdates[0].arrival,stops[destinationIndex]?.arrivalTime,datedService):NaN;
  const predictedArrival=Number.isSafeInteger(arrivalMs)&&arrivalMs>=departureMs&&arrivalMs<=departureMs+4*60*60*1000?new Date(arrivalMs).toISOString():null;
  const delaySeconds=update.departure.delaySeconds;
  const delayMinutes=Number.isSafeInteger(delaySeconds)?Math.max(0,Math.round(delaySeconds/60)):null;
  departures.push({delayMinutes,tripId:trip.tripId,originStopId:ids[originIndex],destinationStopId:ids[destinationIndex],scheduledDeparture:typeof scheduledStop==='object'?scheduledStop.departureTime||null:null,routeShortName:meta.routeShortName||null,routeLongName:meta.routeLongName||null,tripHeadsign:meta.tripHeadsign||null,tripShortName:meta.tripShortName||null,predictedDeparture:new Date(departureMs).toISOString(),predictedArrival,evidence:'regional_trip_update'});
 }
 if(!departures.length)diagnose?.(stages);
 return {status:departures.length?'route_matched':'unavailable',reason:departures.length?'fresh_trip_updates':'no_verified_updates',feedTimestampMs:evidence.feedTimestampMs,departures};
}
