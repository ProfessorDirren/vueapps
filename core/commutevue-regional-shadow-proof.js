import {extractGTFSRealtimeTripEvidence} from './commutevue-gtfsrt-trip-evidence.js';
import {matchProvisionedRegionalJourney} from './commutevue-regional-runtime-proof.js';

/**
 * Server-side shadow-only regional verification. No user-facing departures.
 * The caller supplies a trusted same-archive station mapping and a feed source.
 * Never log stop IDs, trip IDs, credentials, URLs or user input.
 */
export async function probeProvisionedRegionalJourney({
 source,encodedEnvelope,filePath,signingKey,serviceDate,originStopIds,destinationStopIds,now=Date.now()
}={}){
 const unavailable=reason=>({status:'unavailable',reason,verifiedDepartureCount:0});
 if(typeof source?.tripUpdates!=='function')return unavailable('missing_source');
 if((typeof encodedEnvelope!=='string'&&!filePath)||!signingKey||!serviceDate||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!originStopIds.size||!destinationStopIds.size)return unavailable('missing_configuration');
 try{
  const feed=await source.tripUpdates();
  if(!(feed?.bytes instanceof Uint8Array))return unavailable('invalid_feed');
  const evidence=extractGTFSRealtimeTripEvidence(feed.bytes);
  const result=matchProvisionedRegionalJourney({encodedEnvelope,filePath,signingKey,serviceDate,originStopIds,destinationStopIds,evidence,now});
  const reason=typeof result.reason==='string'&&/^[a-z_]{1,60}$/.test(result.reason)?result.reason:'unknown';
  return {status:result.status==='route_matched'?'route_matched':'unavailable',reason,verifiedDepartureCount:Math.min(result.departures?.length||0,100)};
 }catch{return unavailable('feed_or_verification_error');}
}
