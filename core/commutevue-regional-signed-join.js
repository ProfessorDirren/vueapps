import {verifySignedRegionalSnapshot} from './commutevue-regional-snapshot-auth.js';
import {matchRegionalRealtimeJourney} from './commutevue-regional-provider-core.js';

/**
 * Server-only boundary: authenticate an offline snapshot before joining it
 * with fresh GTFS-RT evidence from the same regional dataset.
 * This does not fetch, publish or infer any route/stop identifiers.
 */
export function matchSignedRegionalRealtimeJourney({
 signedSnapshot,signingKey,serviceDate,evidence,originStopIds,destinationStopIds,now=Date.now()
}={}){
 const unavailable=(reason)=>({status:'unavailable',reason,departures:[]});
 if(typeof signedSnapshot!=='string'||!signingKey||typeof serviceDate!=='string')return unavailable('missing_signed_snapshot');
 if(!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!originStopIds.size||!destinationStopIds.size)return unavailable('missing_station_ids');
 const staticSnapshot=verifySignedRegionalSnapshot(signedSnapshot,{key:signingKey,expectedServiceDate:serviceDate,now});
 if(staticSnapshot.status!=='validated')return unavailable(staticSnapshot.reason);
 return matchRegionalRealtimeJourney({staticSnapshot,evidence,originStopIds,destinationStopIds,now});
}
