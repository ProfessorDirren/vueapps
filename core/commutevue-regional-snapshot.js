import {filterRegionalActiveTrips} from './commutevue-regional-static-gtfs.js';

/** Build an in-memory, service-date-scoped mapping from one verified regional GTFS archive.
 * The caller must parse all inputs from the same archive and supply its validation time.
 * The builder never fetches data and never promotes an unverified archive to validated.
 */
export function buildRegionalServiceSnapshot({tripStops,serviceMetadata,serviceDate,validatedAtMs,archiveVerified=false,routeTypes=null}={}){
 if(archiveVerified!==true||!(tripStops instanceof Map)||!tripStops.size||!serviceMetadata||!Number.isSafeInteger(validatedAtMs)||validatedAtMs<=0){
  return {status:'unavailable',reason:'unverified_archive'};
 }
 try{
  const active=filterRegionalActiveTrips(tripStops,serviceMetadata,serviceDate,{routeTypes});
  if(!active.trips.size)return {status:'unavailable',reason:'no_active_trips'};
  return {status:'validated',validatedAtMs,serviceDate,tripStops:active.trips,activeTripCount:active.trips.size};
 }catch{
  return {status:'unavailable',reason:'invalid_service_metadata'};
 }
}

/** Resolve exact station names and their child platforms, never substring guesses. */
export function resolveRegionalStationStopIds(stops,name){
 if(!Array.isArray(stops)||typeof name!=='string'||!name.trim())return new Set();
 const normalize=s=>String(s||'').trim().normalize('NFC').toLocaleLowerCase('sv');
 const matched=stops.filter(s=>normalize(s.stopName)===normalize(name));
 const parentIds=new Set(matched.filter(s=>String(s.locationType)==='1').map(s=>s.stopId));
 const ids=new Set(matched.map(s=>s.stopId));
 for(const stop of stops)if(parentIds.has(stop.parentStation)&&String(stop.locationType)==='0')ids.add(stop.stopId);
 return ids;
}
