/** Produce a bounded, date-scoped, public-data-only index offline.
 * Never fetch the 60MB SL archive inside a user-facing serverless request.
 * Only active trips containing one of the requested platform stop IDs are retained.
 */
export function buildRegionalActiveTripIndex({activeTrips,serviceDate,stopIds,maxTrips=10000,maxStopsPerTrip=300}={}){
 if(!(activeTrips instanceof Map)||typeof serviceDate!=='string'||!/^[0-9]{8}$/.test(serviceDate)||!(stopIds instanceof Set)||!stopIds.size||![...stopIds].every(s=>typeof s==='string'&&s.length>0)||!Number.isSafeInteger(maxTrips)||maxTrips<1||maxTrips>100000||!Number.isSafeInteger(maxStopsPerTrip)||maxStopsPerTrip<2||maxStopsPerTrip>300)throw new TypeError('Invalid regional index inputs');
 const trips=Object.create(null);let count=0;
 for(const [tripId,sequence] of activeTrips){
  if(typeof tripId!=='string'||!tripId||tripId.length>200||!Array.isArray(sequence)||sequence.length<2||sequence.length>maxStopsPerTrip)throw new Error('Invalid regional trip');
  const ids=sequence.map(s=>typeof s==='string'?s:s?.stop);
  if(ids.some(s=>typeof s!=='string'||!s||s.length>200))throw new Error('Invalid regional stop');
  if(!ids.some(s=>stopIds.has(s)))continue;
  if(count>=maxTrips)throw new Error('Regional index trip limit');
  trips[tripId]=ids;count++;
 }
 return {format:'commutevue-regional-trip-stops-v1',serviceDate,tripCount:count,trips};
}
