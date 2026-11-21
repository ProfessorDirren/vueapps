/**
 * Small, explicit offline-to-runtime snapshot boundary. Only selected active
 * trips are serialized; never ship an entire GTFS archive to serverless routes.
 * The caller authenticates the artifact before passing trusted bytes here.
 */
const MAX_TRIPS=10000,MAX_STOPS=300,MAX_BYTES=4*1024*1024;
const ID=/^[A-Za-z0-9_.:-]{1,96}$/;
const GTFS_TIME=/^(?:[0-9]{2,3}):[0-5][0-9]:[0-5][0-9]$/;
export function encodeRegionalSnapshot(snapshot,{allowedTripIds}={}){
 if(snapshot?.status!=='validated'||!(snapshot.tripStops instanceof Map)||!(allowedTripIds instanceof Set)||!allowedTripIds.size||allowedTripIds.size>MAX_TRIPS||!Number.isSafeInteger(snapshot.validatedAtMs)||!/^[0-9]{8}$/.test(snapshot.serviceDate||''))throw new Error('Invalid regional snapshot input');
 const trips=[];
 for(const id of allowedTripIds){
  if(!ID.test(id))throw new Error('Invalid regional trip ID');
  const sequence=snapshot.tripStops.get(id);
  if(!sequence)continue;
  if(!Array.isArray(sequence)||sequence.length<2||sequence.length>MAX_STOPS)throw new Error('Invalid regional stop sequence');
  const stops=sequence.map(entry=>{
   const stop=typeof entry==='string'?entry:entry?.stop;
   if(typeof stop!=='string'||!ID.test(stop))throw new Error('Invalid regional stop ID');
   if(typeof entry==='string')return stop;
   const arrivalTime=entry?.arrivalTime||null,departureTime=entry?.departureTime||null;
   if((arrivalTime!==null&&(typeof arrivalTime!=='string'||!GTFS_TIME.test(arrivalTime)))||(departureTime!==null&&(typeof departureTime!=='string'||!GTFS_TIME.test(departureTime))))throw new Error('Invalid regional stop time');
   return {stop,arrivalTime,departureTime,sequence:Number.isSafeInteger(entry?.sequence)?entry.sequence:null};
  });
  trips.push([id,stops]);
 }
 if(!trips.length)throw new Error('No selected active regional trips');
 const encoded=JSON.stringify({version:2,serviceDate:snapshot.serviceDate,validatedAtMs:snapshot.validatedAtMs,trips});
 if(Buffer.byteLength(encoded,'utf8')>MAX_BYTES)throw new Error('Regional snapshot exceeds size limit');
 return encoded;
}
export function decodeRegionalSnapshot(encoded,{now=Date.now(),expectedServiceDate}={}){
 try{
  if(typeof encoded!=='string'||Buffer.byteLength(encoded,'utf8')>MAX_BYTES||!Number.isFinite(now))throw new Error();
  const value=JSON.parse(encoded);
  if(![1,2].includes(value?.version)||!/^[0-9]{8}$/.test(value.serviceDate)||value.serviceDate!==expectedServiceDate||!Number.isSafeInteger(value.validatedAtMs)||value.validatedAtMs>now||now-value.validatedAtMs>24*3600000||!Array.isArray(value.trips)||!value.trips.length||value.trips.length>MAX_TRIPS)throw new Error();
  const tripStops=new Map();
  for(const entry of value.trips){
   if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!ID.test(entry[0])||tripStops.has(entry[0])||!Array.isArray(entry[1])||entry[1].length<2||entry[1].length>MAX_STOPS)throw new Error();
   const stops=entry[1].map(stop=>{
    if(value.version===1){if(typeof stop!=='string'||!ID.test(stop))throw new Error();return stop;}
    if(typeof stop==='string'){if(!ID.test(stop))throw new Error();return stop;}
    if(!stop||typeof stop!=='object'||Array.isArray(stop)||typeof stop.stop!=='string'||!ID.test(stop.stop)||(stop.arrivalTime!==null&&stop.arrivalTime!==undefined&&(typeof stop.arrivalTime!=='string'||!GTFS_TIME.test(stop.arrivalTime)))||(stop.departureTime!==null&&stop.departureTime!==undefined&&(typeof stop.departureTime!=='string'||!GTFS_TIME.test(stop.departureTime)))||(stop.sequence!==null&&stop.sequence!==undefined&&(!Number.isSafeInteger(stop.sequence)||stop.sequence<0)))throw new Error();
    return {stop:stop.stop,arrivalTime:stop.arrivalTime||null,departureTime:stop.departureTime||null,sequence:Number.isSafeInteger(stop.sequence)?stop.sequence:null};
   });
   tripStops.set(entry[0],stops);
  }
  return {status:'validated',serviceDate:value.serviceDate,validatedAtMs:value.validatedAtMs,tripStops};
 }catch{return {status:'unavailable',reason:'invalid_or_stale_snapshot'};}
}
