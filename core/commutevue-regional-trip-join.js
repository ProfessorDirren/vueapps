/** Join GTFS-RT trip updates to trip-stop sequences from the SAME static GTFS feed. */
export function joinRegionalTripEvidence({tripStops,evidence,originStopId,destinationStopId}={}){
 if(!(tripStops instanceof Map)||!Array.isArray(evidence?.trips)||typeof originStopId!=='string'||!originStopId||typeof destinationStopId!=='string'||!destinationStopId||originStopId===destinationStopId)throw new TypeError('Verified static trip map, realtime evidence and distinct stop IDs required');
 const matches=[];
 const seenTripIds=new Set();
 const duplicateTripIds=new Set();
 for(const update of evidence.trips){
  if(typeof update?.tripId!=='string')continue;
  if(seenTripIds.has(update.tripId))duplicateTripIds.add(update.tripId);
  seenTripIds.add(update.tripId);
 }
 for(const update of evidence.trips){
  // Multiple TripUpdates for the same trip can contradict each other;
  // never publish an arbitrary first or last update as verified evidence.
  if(typeof update?.tripId!=='string'||duplicateTripIds.has(update.tripId)||!Array.isArray(update.stops))continue;
  const sequence=tripStops.get(update.tripId);
  if(!Array.isArray(sequence)||sequence.length<2||sequence.length>300)continue;
  // The actual SL Regional parser emits timed stop objects; legacy fixtures
  // use strings. Match both without losing station order or trip identity.
  const ids=sequence.map(stop=>typeof stop==='string'?stop:stop?.stop);
  const originIndex=ids.indexOf(originStopId),destinationIndex=ids.indexOf(destinationStopId);
  if(originIndex<0||destinationIndex<=originIndex)continue;
  const matchingStops=update.stops.filter(s=>s?.stopId===originStopId);
  if(matchingStops.length!==1)continue;
  const event=matchingStops[0].departure;
  if(!event||(!Number.isSafeInteger(event.unixTime)&&!Number.isSafeInteger(event.delaySeconds)))continue;
  matches.push({tripId:update.tripId,originStopId,destinationStopId,departureUnixTime:Number.isSafeInteger(event.unixTime)?event.unixTime:null,delaySeconds:Number.isSafeInteger(event.delaySeconds)?event.delaySeconds:null});
 }
 return {status:'matched_static_trip_evidence',matches};
}
