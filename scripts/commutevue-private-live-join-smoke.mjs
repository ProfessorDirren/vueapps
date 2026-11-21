/**
 * Manual-only end-to-end smoke check using private same-archive GTFS artifacts.
 * This never returns user-facing departures or any secret/station/trip IDs.
 */
import {readFile} from 'node:fs/promises';
import {createSLRegionalRealtimeSource} from '../core/commutevue-sl-regional-realtime.js';
import {probeProvisionedRegionalJourney} from '../core/commutevue-regional-shadow-proof.js';
import {stockholmServiceDate} from './commutevue-build-regional-snapshot.mjs';
import {extractGTFSRealtimeTripEvidence} from '../core/commutevue-gtfsrt-trip-evidence.js';
import {loadRegionalSnapshotFromEnvironment} from '../core/commutevue-regional-runtime-artifact.js';

export async function verifyPrivateRegionalLiveJoin({manifest,signingKey,realtimeKey,now=Date.now(),source}={}){
 if(!manifest||typeof manifest!=='object'||typeof signingKey!=='string'||signingKey.length<32||typeof realtimeKey!=='string'||!realtimeKey.trim())throw new Error('Missing private regional verification configuration');
 const origin=manifest.COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS;
 const destination=manifest.COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS;
 if(typeof origin!=='string'||typeof destination!=='string'||!origin||!destination)throw new Error('Missing station mapping');
 const feedSource=source||createSLRegionalRealtimeSource({apiKey:realtimeKey});
 let feedBytes;
 const countingSource={tripUpdates:async()=>{const response=await feedSource.tripUpdates();feedBytes=response?.bytes;return response;}};
 const result=await probeProvisionedRegionalJourney({
  source:countingSource,
  encodedEnvelope:manifest.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,
  signingKey,serviceDate:stockholmServiceDate(new Date(now)),
  originStopIds:new Set(origin.split(',')),destinationStopIds:new Set(destination.split(',')),now
 });
 const summary={status:result.status,reason:result.reason,verifiedDepartureCount:result.verifiedDepartureCount};
 if(result.reason==='no_verified_updates'&&feedBytes instanceof Uint8Array){
  try{
   const evidence=extractGTFSRealtimeTripEvidence(feedBytes);
   const snapshot=loadRegionalSnapshotFromEnvironment({encodedEnvelope:manifest.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,signingKey,expectedServiceDate:stockholmServiceDate(new Date(now)),now});
   if(snapshot.status==='validated'){
    const relevant=evidence.trips.filter(t=>snapshot.tripStops.has(t.tripId));
    const originIds=new Set(origin.split(','));
    const destinationIds=new Set(destination.split(','));
    const corridor=relevant.filter(t=>{const stops=snapshot.tripStops.get(t.tripId)||[];const ids=stops.map(s=>typeof s==='string'?s:s?.stop);return ids.some((id,i)=>originIds.has(id)&&ids.slice(i+1).some(next=>destinationIds.has(next)));});
    const withOriginUpdate=corridor.filter(t=>t.stops?.some(st=>originIds.has(st.stopId)&&Number.isSafeInteger(st.departure?.unixTime)));
    summary.diagnostics={feedTripCount:evidence.trips.length,matchedStaticTripCount:relevant.length,corridorTripCount:corridor.length,corridorOriginPredictionCount:withOriginUpdate.length,feedAgeSeconds:Number.isFinite(evidence.feedTimestampMs)?Math.round((now-evidence.feedTimestampMs)/1000):null};
   }
  }catch{/* Optional counters must never override fail-closed result. */}
 }
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const manifestPath=process.argv[2];
 if(!manifestPath)throw new Error('Private manifest path required');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 const result=await verifyPrivateRegionalLiveJoin({manifest,signingKey:process.env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY,realtimeKey:process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY});
 console.log(JSON.stringify(result));
 if(result.status!=='route_matched')process.exitCode=1;
}
