import {loadRegionalSnapshotFromEnvironment,loadRegionalSnapshotFromFile,loadBundledRegionalSnapshot} from './commutevue-regional-runtime-artifact.js';
import {matchRegionalRealtimeJourney} from './commutevue-regional-provider-core.js';

/**
 * Server-only, network-free runtime proof for a pre-provisioned corridor.
 * Both station ID sets must come from the SAME verified static GTFS archive.
 * A missing or invalid signed snapshot never falls back to unverified realtime.
 */
export function matchProvisionedRegionalJourney({
 encodedEnvelope,filePath,useBundledSnapshot=false,signingKey,serviceDate,originStopIds,destinationStopIds,evidence,now=Date.now()
}={}){
 const unavailable=reason=>({status:'unavailable',reason,departures:[]});
 if(!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!originStopIds.size||!destinationStopIds.size)return unavailable('missing_station_ids');
 const staticSnapshot=useBundledSnapshot?loadBundledRegionalSnapshot({signingKey,expectedServiceDate:serviceDate,now}):filePath?loadRegionalSnapshotFromFile({filePath,signingKey,expectedServiceDate:serviceDate,now}):loadRegionalSnapshotFromEnvironment({encodedEnvelope,signingKey,expectedServiceDate:serviceDate,now});
 if(staticSnapshot.status!=='validated')return unavailable(staticSnapshot.reason);
 // Never accept station IDs absent from the authenticated trip sequences.
 const mappedIds=new Set([...staticSnapshot.tripStops.values()].flat().map(stop=>typeof stop==='string'?stop:stop?.stop).filter(Boolean));
 if(![...originStopIds].some(id=>mappedIds.has(id))||![...destinationStopIds].some(id=>mappedIds.has(id)))return unavailable('station_ids_not_in_snapshot');
 return matchRegionalRealtimeJourney({staticSnapshot,evidence,originStopIds,destinationStopIds,now});
}
