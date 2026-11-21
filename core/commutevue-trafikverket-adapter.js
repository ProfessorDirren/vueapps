import {createTrafikverketClient} from './commutevue-trafikverket.js';
import {matchTrafikverketTrainRoute} from './commutevue-trafikverket-route.js';
/**
 * Experimental server-only adapter. No user-facing activation until the
 * upstream response contract and station mapping are validated.
 */
export function createTrafikverketJourneyProbe({apiKey,fetcher,now=()=>Date.now()}={}){
 const client=createTrafikverketClient({apiKey,fetcher});
 return async function probe({from,to}={}){
  if(typeof from!=='string'||typeof to!=='string'||!from.trim()||!to.trim()||from.trim().toLowerCase()===to.trim().toLowerCase())return {status:'unavailable',reason:'invalid_journey',departures:[]};
  const [originSignature,destinationSignature]=await Promise.all([client.station(from),client.station(to)]);
  if(originSignature===destinationSignature)return {status:'unavailable',reason:'same_station',departures:[]};
  const [origin,destination]=await Promise.all([client.departuresAt(originSignature),client.arrivalsAt(destinationSignature)]);
  const matches=matchTrafikverketTrainRoute({origin,destination,originSignature,destinationSignature,now:now()});
  return {status:matches.length?'matched':'unavailable',reason:matches.length?'two_station_match':'no_verified_route',departures:matches,originSignature,destinationSignature};
 };
}
