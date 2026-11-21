import {verifyRegionalJourney} from './commutevue-regional-journey-proof.js';

/**
 * Provider-neutral, fail-closed join of a validated regional GTFS static snapshot
 * with GTFS-RT trip evidence. The snapshot must come from the SAME dataset.
 * This function performs no network I/O and cannot publish unjoined realtime.
 * Static snapshot download, refresh and station resolution are separate concerns.
 */
export function matchRegionalRealtimeJourney({staticSnapshot,evidence,originStopIds,destinationStopIds,now=Date.now()}={}){
 if(!staticSnapshot||staticSnapshot.status!=='validated'||!(staticSnapshot.tripStops instanceof Map)||!(originStopIds instanceof Set)||!(destinationStopIds instanceof Set)||!originStopIds.size||!destinationStopIds.size){
  return {status:'unavailable',reason:'missing_static_mapping',departures:[]};
 }
 if(!Number.isFinite(staticSnapshot.validatedAtMs)||staticSnapshot.validatedAtMs>now||now-staticSnapshot.validatedAtMs>24*60*60*1000){
  return {status:'unavailable',reason:'stale_static_snapshot',departures:[]};
 }
 const proof=verifyRegionalJourney({evidence,tripStops:staticSnapshot.tripStops,originStopIds,destinationStopIds,now});
 if(proof.status!=='route_matched')return {status:'unavailable',reason:proof.reason,departures:[]};
 return {status:'route_matched',reason:proof.reason,departures:proof.departures};
}
