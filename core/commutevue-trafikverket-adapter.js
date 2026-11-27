import {createTrafikverketClient,TrafikverketError} from './commutevue-trafikverket.js';
import {matchTrafikverketTrainRoute} from './commutevue-trafikverket-route.js';
import {classifyTrafikverketDeparture} from './commutevue-trafikverket-evidence.js';
/**
 * Experimental server-only adapter. No user-facing activation until the
 * upstream response contract and station mapping are validated.
 */
export function createTrafikverketJourneyProbe({apiKey,fetcher,now=()=>Date.now()}={}){
 const client=createTrafikverketClient({apiKey,fetcher});
 return async function probe({from,to,arrivalTime}={}){
  if(typeof from!=='string'||typeof to!=='string'||!from.trim()||!to.trim()||from.trim().toLowerCase()===to.trim().toLowerCase())return {status:'unavailable',reason:'invalid_journey',departures:[]};
  // Translate known provider labels, then still require an exact Trafikverket lookup.
  const resolveStation=async name=>{
   const aliases={
    'stockholm centralstation':['Stockholm C','Stockholm Central','Stockholm'],
    'göteborg centralstation':['Göteborg C','Göteborg Central','Göteborg']
   };
   for(const candidate of [name,...(aliases[name.trim().toLocaleLowerCase('sv-SE')]||[])]){
    try{return await client.station(candidate);}
    catch(error){if(!(error instanceof TrafikverketError)||error.reason!=='station_not_found')throw error;}
   }
   throw new TrafikverketError('station_not_found');
  };
  let originSignature,destinationSignature;
  try{[originSignature,destinationSignature]=await Promise.all([resolveStation(from),resolveStation(to)]);}catch(error){if(error instanceof TrafikverketError)return {status:'unavailable',reason:error.reason,departures:[]};throw error;}
  if(originSignature===destinationSignature)return {status:'unavailable',reason:'same_station',departures:[]};
  let origin,destination;
  try{[origin,destination]=await Promise.all([client.departuresAt(originSignature),client.arrivalsAt(destinationSignature,arrivalTime)]);}catch(error){if(error instanceof TrafikverketError)return {status:'unavailable',reason:error.reason,departures:[]};throw error;}
  const validTime=value=>typeof value==='string'&&value.trim()&&Number.isFinite(Date.parse(value));
  // Aggregate only: determine whether estimates are missing at source or lost during route matching.
  const coverage={originCount:origin.length,destinationCount:destination.length,originEstimatedCount:origin.filter(x=>validTime(x?.EstimatedTimeAtLocation)).length,originPlannedEstimatedCount:origin.filter(x=>validTime(x?.PlannedEstimatedTimeAtLocation)&&x?.PlannedEstimatedTimeAtLocationIsValid===true).length,destinationEstimatedCount:destination.filter(x=>validTime(x?.EstimatedTimeAtLocation)).length,originActualCount:origin.filter(x=>validTime(x?.TimeAtLocation)).length,originCancelledCount:origin.filter(x=>x?.Canceled===true).length,originDeviationCount:origin.filter(x=>Array.isArray(x?.Deviation)?x.Deviation.some(y=>typeof y==='string'&&y.trim()):typeof x?.Deviation==='string'&&x.Deviation.trim().length>0).length};
  const checkedAt=now();
  const matches=matchTrafikverketTrainRoute({origin,destination,originSignature,destinationSignature,now:checkedAt,maxJourneyMs:arrivalTime?6*3600000:undefined}).map(departure=>({...departure,evidence:classifyTrafikverketDeparture(departure,{now:checkedAt})}));
  return {status:matches.length?'matched':'unavailable',reason:matches.length?'two_station_match':'no_verified_route',departures:matches,coverage,originSignature,destinationSignature};
 };
}
