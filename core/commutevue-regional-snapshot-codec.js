/**
 * Small, explicit offline-to-runtime snapshot boundary. Only selected active
 * trips are serialized; never ship an entire GTFS archive to serverless routes.
 * The caller authenticates the artifact before passing trusted bytes here.
 */
const MAX_TRIPS=10000,MAX_STOPS=300,MAX_BYTES=4*1024*1024;
const ID=/^[A-Za-z0-9_.:-]{1,96}$/;
export function encodeRegionalSnapshot(snapshot,{allowedTripIds}={}){
 if(snapshot?.status!=='validated'||!(snapshot.tripStops instanceof Map)||!(allowedTripIds instanceof Set)||!allowedTripIds.size||allowedTripIds.size>MAX_TRIPS||!Number.isSafeInteger(snapshot.validatedAtMs)||!/^[0-9]{8}$/.test(snapshot.serviceDate||''))throw new Error('Invalid regional snapshot input');
 const trips=[];
 for(const id of allowedTripIds){
  if(!ID.test(id))throw new Error('Invalid regional trip ID');
  const sequence=snapshot.tripStops.get(id);
  if(!sequence)continue;
  if(!Array.isArray(sequence)||sequence.length<2||sequence.length>MAX_STOPS)throw new Error('Invalid regional stop sequence');
  const stops=sequence.map(s=>typeof s==='string'?s:s?.stop);
  if(stops.some(s=>typeof s!=='string'||!ID.test(s)))throw new Error('Invalid regional stop ID');
  trips.push([id,stops]);
 }
 if(!trips.length)throw new Error('No selected active regional trips');
 const encoded=JSON.stringify({version:1,serviceDate:snapshot.serviceDate,validatedAtMs:snapshot.validatedAtMs,trips});
 if(Buffer.byteLength(encoded,'utf8')>MAX_BYTES)throw new Error('Regional snapshot exceeds size limit');
 return encoded;
}
export function decodeRegionalSnapshot(encoded,{now=Date.now(),expectedServiceDate}={}){
 try{
  if(typeof encoded!=='string'||Buffer.byteLength(encoded,'utf8')>MAX_BYTES||!Number.isFinite(now))throw new Error();
  const value=JSON.parse(encoded);
  if(value?.version!==1||!/^[0-9]{8}$/.test(value.serviceDate)||value.serviceDate!==expectedServiceDate||!Number.isSafeInteger(value.validatedAtMs)||value.validatedAtMs>now||now-value.validatedAtMs>24*3600000||!Array.isArray(value.trips)||!value.trips.length||value.trips.length>MAX_TRIPS)throw new Error();
  const tripStops=new Map();
  for(const entry of value.trips){
   if(!Array.isArray(entry)||entry.length!==2||!ID.test(entry[0])||tripStops.has(entry[0])||!Array.isArray(entry[1])||entry[1].length<2||entry[1].length>MAX_STOPS||entry[1].some(id=>typeof id!=='string'||!ID.test(id)))throw new Error();
   tripStops.set(entry[0],entry[1]);
  }
  return {status:'validated',serviceDate:value.serviceDate,validatedAtMs:value.validatedAtMs,tripStops};
 }catch{return {status:'unavailable',reason:'invalid_or_stale_snapshot'};}
}
