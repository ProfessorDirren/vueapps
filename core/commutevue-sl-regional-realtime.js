/**
 * SL's GTFS Regional realtime feed is independent of GTFS Sweden 3.
 * Server-only transport boundary. Do not equate a successful download with
 * a verified journey, forecast or delay: GTFS-RT protobuf decoding and
 * regional static GTFS stop/trip mapping are separate mandatory gates.
 */
const ROOT='https://opendata.samtrafiken.se/gtfs-rt/sl/';
const MAX_BYTES=8*1024*1024;
export class SLRegionalRealtimeError extends Error{
 constructor(reason){super('SL regional realtime unavailable');this.name='SLRegionalRealtimeError';this.reason=reason;}
}
export function createSLRegionalRealtimeSource({apiKey,fetcher=fetch}={}){
 if(typeof apiKey!=='string'||!apiKey.trim()||typeof fetcher!=='function')throw new TypeError('SL GTFS Regional server credentials and fetcher required');
 async function fetchFeed(kind){
  if(!['TripUpdates','ServiceAlerts'].includes(kind))throw new SLRegionalRealtimeError('unsupported_feed');
  const url=new URL(kind+'.pb',ROOT);
  url.searchParams.set('key',apiKey);
  let response;
  try{response=await fetcher(url.toString(),{method:'GET',headers:{accept:'application/octet-stream'},signal:AbortSignal.timeout(6500)});}
  catch{throw new SLRegionalRealtimeError('network_or_timeout');}
  if(!response.ok)throw new SLRegionalRealtimeError(response.status===401||response.status===403?'authorization':response.status===429?'rate_limited':'http_error');
  const size=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(size)&&size>MAX_BYTES)throw new SLRegionalRealtimeError('oversized_feed');
  let bytes;
  try{bytes=new Uint8Array(await response.arrayBuffer());}catch{throw new SLRegionalRealtimeError('invalid_body');}
  if(!bytes.length||bytes.length>MAX_BYTES)throw new SLRegionalRealtimeError('invalid_size');
  // A protobuf document must be decoded and cross-referenced to the SL
  // regional static GTFS feed before any user-facing realtime claim.
  return {status:'raw_unverified',kind,bytes};
 }
 return {tripUpdates:()=>fetchFeed('TripUpdates'),serviceAlerts:()=>fetchFeed('ServiceAlerts')};
}
