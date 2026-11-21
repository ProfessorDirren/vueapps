/** Join GTFS-RT trip updates to trip-stop sequences from the SAME static GTFS feed. */
export function joinRegionalTripEvidence({tripStops,evidence,originStopId,destinationStopId}={}){
 if(!(tripStops instanceof Map)||!Array.isArray(evidence?.trips)||typeof originStopId!=='string'||!originStopId||typeof destinationStopId!=='string'||!destinationStopId||originStopId===destinationStopId)throw new TypeError('Verified static trip map, realtime evidence and distinct stop IDs required');
 const matches=[];
 for(const update of evidence.trips){
  if(typeof update?.tripId!=='string'||!Array.isArray(update.stops))continue;
  const sequence=tripStops.get(update.tripId);
  if(!Array.isArray(sequence)||sequence.length<2||sequence.length>300)continue;
  const originIndex=sequence.indexOf(originStopId),destinationIndex=sequence.indexOf(destinationStopId);
  if(originIndex<0||destinationIndex<=originIndex)continue;
  const matchingStops=update.stops.filter(s=>s?.stopId===originStopId);
  if(matchingStops.length!==1)continue;
  const event=matchingStops[0].departure;
  if(!event||(!Number.isSafeInteger(event.unixTime)&&!Number.isSafeInteger(event.delaySeconds)))continue;
  matches.push({tripId:update.tripId,originStopId,destinationStopId,departureUnixTime:Number.isSafeInteger(event.unixTime)?event.unixTime:null,delaySeconds:Number.isSafeInteger(event.delaySeconds)?event.delaySeconds:null});
 }
 return {status:'matched_static_trip_evidence',matches};
}
