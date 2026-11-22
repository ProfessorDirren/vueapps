// National journey-planner boundary. This module is not wired into production until
// credentials, provider response shapes and end-to-end verification are tested.
const BASE='https://api.resrobot.se/v2.1';
export function resRobotConfigured(env=process.env){
 return typeof env.RESROBOT_API_KEY==='string'&&env.RESROBOT_API_KEY.trim().length>0;
}
export function normalizeResRobotLeg(leg){
 if(!leg||typeof leg!=='object')return null;
 const origin=leg.Origin||leg.origin;
 const destination=leg.Destination||leg.destination;
 const departure=origin?.date&&origin?.time?origin.date+'T'+origin.time:null;
 const arrival=destination?.date&&destination?.time?destination.date+'T'+destination.time:null;
 if(!origin?.name||!destination?.name||!departure||!arrival)return null;
 return {from:origin.name,to:destination.name,departure,arrival,mode:leg.Product?.[0]?.catOut||leg.Product?.catOut||null};
}
export function normalizeResRobotTrips(payload){
 if(payload?.errorCode)return [];
 const trips=payload?.Trip;
 if(!Array.isArray(trips))return [];
 return trips.map(trip=>{
  const legs=trip?.LegList?.Leg;
  if(!Array.isArray(legs)||!legs.length)return null;
  const normalized=legs.map(normalizeResRobotLeg);
  if(normalized.some(leg=>!leg))return null;
  return {legs:normalized,departure:normalized[0].departure,arrival:normalized.at(-1).arrival,verified:false};
 }).filter(Boolean);
}
export async function lookupResRobotStops(query,{apiKey,fetchImpl=fetch}={}){
 if(!apiKey)throw new Error('resrobot_not_configured');
 if(typeof query!=='string'||!query.trim())throw new Error('missing_stop_query');
 const url=new URL(BASE+'/location.name');
 url.searchParams.set('input',query.trim());
 url.searchParams.set('format','json');
 url.searchParams.set('accessId',apiKey);
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('resrobot_stop_lookup_unavailable');
 const body=await response.json();
 if(body?.errorCode)return [];
 const entries=Array.isArray(body?.StopLocation)?body.StopLocation:body?.stopLocationOrCoordLocation||[];
 return entries.flatMap(item=>{
  const stop=item?.StopLocation||item;
  return stop?.id&&stop?.name?[{id:stop.id,name:stop.name}]:[];
 });
}
export async function planResRobotTrip(fromId,toId,{apiKey,fetchImpl=fetch}={}){
 if(!apiKey)throw new Error('resrobot_not_configured');
 if(!fromId||!toId)throw new Error('missing_stop_id');
 const url=new URL(BASE+'/trip');
 url.searchParams.set('originId',fromId);
 url.searchParams.set('destId',toId);
 url.searchParams.set('format','json');
 url.searchParams.set('accessId',apiKey);
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('resrobot_trip_unavailable');
 return normalizeResRobotTrips(await response.json());
}

const cleanName=value=>String(value||'').toLocaleLowerCase('sv-SE').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function chooseResRobotStop(stops,requested){
 const name=cleanName(requested);
 const exact=stops.filter(stop=>cleanName(stop.name)===name);
 // Never pick the first fuzzy hit when two stations could share a name.
 return exact.length===1?exact[0]:null;
}
export async function planNationalSwedenJourney(from,to,{apiKey,fetchImpl=fetch}={}){
 if(!apiKey)return {status:'not_configured',trips:[]};
 try{
  const [origins,destinations]=await Promise.all([
   lookupResRobotStops(from,{apiKey,fetchImpl}),
   lookupResRobotStops(to,{apiKey,fetchImpl})
  ]);
  const origin=chooseResRobotStop(origins,from),destination=chooseResRobotStop(destinations,to);
  if(!origin||!destination)return {status:'ambiguous_stop',trips:[]};
  const trips=await planResRobotTrip(origin.id,destination.id,{apiKey,fetchImpl});
  return {status:trips.length?'schedule_available':'no_journeys',trips:trips.slice(0,3)};
 }catch{return {status:'provider_unavailable',trips:[]};}
}
