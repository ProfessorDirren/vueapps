/**
 * Fetch the static SL Regional GTFS archive via a separately verified URL.
 * Endpoint is deliberately configurable: do not guess Trafiklab's product
 * URL or assume the realtime API key authorizes static GTFS downloads.
 */
import {parseRegionalGTFSZip} from './commutevue-regional-gtfs-zip.js';
const MAX_BYTES=45*1024*1024;
export class RegionalStaticDownloadError extends Error{
 constructor(reason){super('SL Regional static GTFS unavailable');this.name='RegionalStaticDownloadError';this.reason=reason;}
}
export function createRegionalStaticGTFSDownloader({url,fetcher=fetch}={}){
 let endpoint;
 try{endpoint=new URL(url);}catch{throw new TypeError('Verified regional GTFS HTTPS URL required');}
 if(endpoint.protocol!=='https:'||endpoint.hostname!=='opendata.samtrafiken.se'||endpoint.username||endpoint.password||endpoint.hash||typeof fetcher!=='function')throw new TypeError('Only trusted Trafiklab HTTPS endpoint allowed');
 return async()=>{
  let response;
  try{response=await fetcher(endpoint.toString(),{method:'GET',headers:{accept:'application/zip,application/octet-stream'},redirect:'error',signal:AbortSignal.timeout(12000)});}
  catch{throw new RegionalStaticDownloadError('network_or_timeout');}
  if(!response.ok)throw new RegionalStaticDownloadError([401,403].includes(response.status)?'authorization':response.status===429?'rate_limited':'http_error');
  const length=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(length)&&length>MAX_BYTES)throw new RegionalStaticDownloadError('oversized_archive');
  let bytes;
  try{bytes=new Uint8Array(await response.arrayBuffer());}catch{throw new RegionalStaticDownloadError('invalid_body');}
  if(!bytes.length)throw new RegionalStaticDownloadError('empty_archive');
  if(bytes.length>MAX_BYTES)throw new RegionalStaticDownloadError('oversized_archive');
  if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b||![0x03,0x05,0x07].includes(bytes[2])||![0x04,0x06,0x08].includes(bytes[3]))throw new RegionalStaticDownloadError('non_zip_response');
  try{return {status:'static_trip_stops_unverified',tripStops:parseRegionalGTFSZip(bytes)};}
  catch{throw new RegionalStaticDownloadError('invalid_archive');}
 };
}
