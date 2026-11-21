/** Validate offline-produced GTFS trip-stop JSON before it can be used for realtime joins. */
export function loadRegionalTripStops(data,{maxTrips=100000,maxStopsPerTrip=300}={}){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.format!=='commutevue-regional-trip-stops-v1'||!Number.isSafeInteger(data.tripCount)||data.tripCount<1||!data.trips||typeof data.trips!=='object'||Array.isArray(data.trips)||!Number.isInteger(maxTrips)||maxTrips<1||maxTrips>100000||!Number.isInteger(maxStopsPerTrip)||maxStopsPerTrip<2||maxStopsPerTrip>300)throw new TypeError('Invalid regional GTFS trip-stop dataset');
 const entries=Object.entries(data.trips);
 if(entries.length!==data.tripCount||entries.length>maxTrips)throw new Error('Regional GTFS trip count mismatch');
 const result=new Map();
 for(const [tripId,stops] of entries){
  if(!tripId||tripId.length>200||!Array.isArray(stops)||stops.length<2||stops.length>maxStopsPerTrip||stops.some(stop=>typeof stop!=='string'||!stop||stop.length>200))throw new Error('Invalid regional GTFS trip stops');
  result.set(tripId,stops.slice());
 }
 return result;
}
