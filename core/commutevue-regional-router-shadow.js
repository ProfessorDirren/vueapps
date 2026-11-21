import {createSLRegionalRealtimeSource} from './commutevue-sl-regional-realtime.js';
import {probeProvisionedRegionalJourney} from './commutevue-regional-shadow-proof.js';
import {extractGTFSRealtimeTripEvidence} from './commutevue-gtfsrt-trip-evidence.js';
import {matchProvisionedRegionalJourney} from './commutevue-regional-runtime-proof.js';
import {prepareRegionalPublication} from './commutevue-regional-publication-gate.js';

const STOP_ID=/^[A-Za-z0-9_.:-]{1,96}$/;
const DAY=/^[0-9]{8}$/;
export function stockholmRegionalDay(now=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 return parts.year+parts.month+parts.day;
}
export function parseRegionalStopIds(value){
 if(typeof value!=='string'||!value.length||value.length>2048)return null;
 const ids=value.split(',').map(x=>x.trim());
 if(!ids.length||ids.length>40||ids.some(x=>!STOP_ID.test(x))||new Set(ids).size!==ids.length)return null;
 return new Set(ids);
}
/**
 * Strictly opt-in diagnostic; only the explicitly provisioned corridor is
 * eligible. No customer-visible realtime result and no secrets in output.
 */
export async function runRegionalRouterShadow({env={},from,to,now=Date.now(),source}={}){
 const unavailable=reason=>({status:'unavailable',reason,verifiedDepartureCount:0});
 if(env.COMMUTVUE_REGIONAL_SHADOW_ENABLED!=='true')return unavailable('disabled');
 if(from!=='Jordbro'||to!=='Stockholm City')return unavailable('unsupported_corridor');
 const originStopIds=parseRegionalStopIds(env.COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS);
 const destinationStopIds=parseRegionalStopIds(env.COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS);
 const serviceDate=stockholmRegionalDay(now);
 if(!DAY.test(serviceDate)||!originStopIds||!destinationStopIds||!(env.COMMUTVUE_REGIONAL_SNAPSHOT_SOURCE==='bundled'||env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_FILE||env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64)||!env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY||!env.TRAFIKLAB_REGIONAL_REALTIME_KEY)return unavailable('missing_configuration');
 try{
  const realtime=source||createSLRegionalRealtimeSource({apiKey:env.TRAFIKLAB_REGIONAL_REALTIME_KEY});
  return await probeProvisionedRegionalJourney({source:realtime,encodedEnvelope:env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,filePath:env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_FILE,useBundledSnapshot:env.COMMUTVUE_REGIONAL_SNAPSHOT_SOURCE==='bundled',signingKey:env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY,serviceDate,originStopIds,destinationStopIds,now});
 }catch{return unavailable('verification_error');}
}

/**
 * Opt-in publication adapter. Unlike the shadow probe this retains verified
 * trip details, then applies the strict publication gate. No public routing
 * changes occur until the API explicitly invokes it with a feature flag.
 */
export async function runRegionalRouterPublication({env={},from,to,now=Date.now(),source}={}){
 const unavailable=reason=>({status:'unavailable',reason,departures:[]});
 if(env.COMMUTVUE_REGIONAL_PUBLICATION_ENABLED!=='true')return unavailable('publication_disabled');
 if(from!=='Jordbro'||to!=='Stockholm City')return unavailable('unsupported_corridor');
 const originStopIds=parseRegionalStopIds(env.COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS);
 const destinationStopIds=parseRegionalStopIds(env.COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS);
 if(!originStopIds||!destinationStopIds||!(env.COMMUTVUE_REGIONAL_SNAPSHOT_SOURCE==='bundled'||env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_FILE||env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64)||!env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY||!env.TRAFIKLAB_REGIONAL_REALTIME_KEY)return unavailable('missing_configuration');
 try{
  const realtime=source||createSLRegionalRealtimeSource({apiKey:env.TRAFIKLAB_REGIONAL_REALTIME_KEY});
  const feed=await realtime.tripUpdates();
  if(!(feed?.bytes instanceof Uint8Array))return unavailable('invalid_feed');
  const evidence=extractGTFSRealtimeTripEvidence(feed.bytes);
  const proof=matchProvisionedRegionalJourney({encodedEnvelope:env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,filePath:env.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_FILE,useBundledSnapshot:env.COMMUTVUE_REGIONAL_SNAPSHOT_SOURCE==='bundled',signingKey:env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY,serviceDate:stockholmRegionalDay(now),originStopIds,destinationStopIds,evidence,now});
  return prepareRegionalPublication({proof,enabled:true,now});
 }catch{return unavailable('verification_error');}
}
