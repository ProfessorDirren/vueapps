/**
 * Manual-only end-to-end smoke check using private same-archive GTFS artifacts.
 * This never returns user-facing departures or any secret/station/trip IDs.
 */
import {readFile} from 'node:fs/promises';
import {createSLRegionalRealtimeSource} from '../core/commutevue-sl-regional-realtime.js';
import {probeProvisionedRegionalJourney} from '../core/commutevue-regional-shadow-proof.js';
import {stockholmServiceDate} from './commutevue-build-regional-snapshot.mjs';

export async function verifyPrivateRegionalLiveJoin({manifest,signingKey,realtimeKey,now=Date.now(),source}={}){
 if(!manifest||typeof manifest!=='object'||typeof signingKey!=='string'||signingKey.length<32||typeof realtimeKey!=='string'||!realtimeKey.trim())throw new Error('Missing private regional verification configuration');
 const origin=manifest.COMMUTVUE_REGIONAL_ORIGIN_STOP_IDS;
 const destination=manifest.COMMUTVUE_REGIONAL_DESTINATION_STOP_IDS;
 if(typeof origin!=='string'||typeof destination!=='string'||!origin||!destination)throw new Error('Missing station mapping');
 const result=await probeProvisionedRegionalJourney({
  source:source||createSLRegionalRealtimeSource({apiKey:realtimeKey}),
  encodedEnvelope:manifest.COMMUTVUE_REGIONAL_SIGNED_SNAPSHOT_BASE64,
  signingKey,serviceDate:stockholmServiceDate(new Date(now)),
  originStopIds:new Set(origin.split(',')),destinationStopIds:new Set(destination.split(',')),now
 });
 return {status:result.status,reason:result.reason,verifiedDepartureCount:result.verifiedDepartureCount};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const manifestPath=process.argv[2];
 if(!manifestPath)throw new Error('Private manifest path required');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 const result=await verifyPrivateRegionalLiveJoin({manifest,signingKey:process.env.COMMUTEVUE_SNAPSHOT_SIGNING_KEY,realtimeKey:process.env.TRAFIKLAB_REGIONAL_REALTIME_KEY});
 console.log(JSON.stringify(result));
 if(result.status!=='route_matched')process.exitCode=1;
}
