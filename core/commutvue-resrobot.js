// National journey-planner boundary. This module is not wired into production until
// credentials, provider response shapes and end-to-end verification are tested.
const BASE='https://api.resrobot.se/v2.1';
export function resRobotConfigured(env=process.env){
 return typeof env.RESROBOT_API_KEY==='string'&&env.RESROBOT_API_KEY.trim().length>0;
}
// Preserve provider train identity only when a single explicit product identifier
// exists. Never derive it from a display name, mode or station pair.
export function resRobotServiceIdentity(leg){
 const products=Array.isArray(leg?.Product)?leg.Product:leg?.Product&&typeof leg.Product==='object'?[leg.Product]:[];
 if(products.length!==1)return null;
 const value=products[0]?.num;
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const id=String(value).trim();
 return /^\\d{1,8}$/.test(id)?id:null;
}
export function normalizeResRobotLeg(leg){
 if(!leg||typeof leg!=='object')return null;
 const origin=leg.Origin||leg.origin;
 const destination=leg.Destination||leg.destination;
 const departure=origin?.date&&origin?.time?origin.date+'T'+origin.time:null;
 const arrival=destination?.date&&destination?.time?destination.date+'T'+destination.time:null;
 if(!origin?.name||!destination?.name||!departure||!arrival)return null;
 return {from:origin.name,to:destination.name,departure,arrival,mode:leg.Product?.[0]?.catOut||leg.Product?.catOut||(/^walk$/i.test(String(leg.type||''))?'WALK':null),serviceId:resRobotServiceIdentity(leg)};
}
export function normalizeResRobotTrips(payload){
 if(payload?.errorCode)return [];
 const rawTrips=payload?.Trip;
 const trips=Array.isArray(rawTrips)?rawTrips:rawTrips&&typeof rawTrips==='object'?[rawTrips]:[];
 if(!trips.length)return [];
 return trips.map(trip=>{
  const rawLegs=trip?.LegList?.Leg;
  const legs=Array.isArray(rawLegs)?rawLegs:rawLegs&&typeof rawLegs==='object'?[rawLegs]:[];
  if(!legs.length)return null;
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
// Parse only an explicit Swedish arrive-by instruction; unsupported dates fail closed.
export function parseSwedishArrivalDeadline(question,{now=new Date()}={}){
 const text=String(question||'');
 const match=/\b(?:framme|ankomma|anlända)\s+senast\s+(?:kl\.?\s*)?(\d{1,2})[.:](\d{2})\s+den\s+(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)(?:\s+(\d{4}))?/iu.exec(text);
 if(!match)return null;
 const months=['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];
 const hour=Number(match[1]),minute=Number(match[2]),day=Number(match[3]),month=months.indexOf(match[4].toLocaleLowerCase('sv-SE'))+1;
 if(hour>23||minute>59||!month)return {invalid:true};
 const stockholm=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const yearNow=Number(stockholm.find(part=>part.type==='year').value);
 const year=match[5]?Number(match[5]):yearNow;
 const valid=new Date(Date.UTC(year,month-1,day));
 if(valid.getUTCFullYear()!==year||valid.getUTCMonth()!==month-1||valid.getUTCDate()!==day)return {invalid:true};
 const date=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 const time=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
 return {date,time,cutoff:date+'T'+time,explicitYear:!!match[5]};
}
export async function planResRobotTrip(fromId,toId,{apiKey,fetchImpl=fetch,arriveBy=null}={}){
 if(!apiKey)throw new Error('resrobot_not_configured');
 if(!fromId||!toId)throw new Error('missing_stop_id');
 const url=new URL(BASE+'/trip');
 url.searchParams.set('originId',fromId);
 url.searchParams.set('destId',toId);
 if(arriveBy){url.searchParams.set('date',arriveBy.date);url.searchParams.set('time',arriveBy.time);url.searchParams.set('searchForArrival','1');}
 url.searchParams.set('format','json');
 url.searchParams.set('accessId',apiKey);
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('resrobot_trip_unavailable');
 return normalizeResRobotTrips(await response.json());
}

const cleanName=value=>String(value||'').toLocaleLowerCase('sv-SE').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function chooseResRobotStop(stops,requested){
 const name=cleanName(requested);
 const exact=stops.filter(stop=>cleanName(stop.name)===name);
 if(exact.length===1)return exact[0];
 if(exact.length>1)return null;
 // Trafiklab may append a municipality in parentheses to the station name.
 // Match only this explicit suffix form and only when unique.
 const qualified=stops.filter(stop=>{
  const label=String(stop.name||'');
  const match=/^(.+?)\s*\(([^()]*)\)\s*$/.exec(label);
  return match&&cleanName(match[1])===name;
 });
 return qualified.length===1?qualified[0]:null;
}
// Rank only chronologically valid provider journeys; never invent an alternative.
export function rankResRobotTrips(trips){
 const candidates=trips.flatMap(trip=>{
  if(!Array.isArray(trip?.legs)||!trip.legs.length)return [];
  const legs=trip.legs;
  const times=legs.map(leg=>[Date.parse(leg.departure),Date.parse(leg.arrival)]);
  if(times.some(([start,end])=>!Number.isFinite(start)||!Number.isFinite(end)||end<start))return [];
  if(times.some(([start],i)=>i>0&&start<times[i-1][1]))return [];
  // A transfer must connect at the same named stop. Otherwise the itinerary
  // may silently teleport between stations and must not be presented as valid.
  if(legs.some((leg,i)=>i>0&&cleanName(legs[i-1].to)!==cleanName(leg.from)))return [];

  const minutes=(times.at(-1)[1]-times[0][0])/60000;
  if(minutes<=0||minutes>1440)return [];
  const transfers=Math.max(0,legs.filter(leg=>leg.from!==leg.to).length-1);
  return [{trip,minutes,transfers}];
 });
 // Faster first; within 15 minutes prefer fewer transfers.
 // Stable total order: earliest arrival among reasonable alternatives, with a
 // deterministic transfer penalty instead of a non-transitive pairwise threshold.
 const seen=new Set();
 return candidates.sort((a,b)=>(a.minutes+a.transfers*10)-(b.minutes+b.transfers*10)||a.minutes-b.minutes||a.transfers-b.transfers).flatMap(item=>{
  const key=JSON.stringify(item.trip.legs.map(leg=>[leg.from,leg.to,leg.departure,leg.arrival,leg.mode]));
  if(seen.has(key))return [];
  seen.add(key);
  return [item.trip];
 });
}
export async function planNationalSwedenJourney(from,to,{apiKey,fetchImpl=fetch,arriveBy=null}={}){
 if(!apiKey)return {status:'not_configured',trips:[]};
 try{
  const [origins,destinations]=await Promise.all([
   lookupResRobotStops(from,{apiKey,fetchImpl}),
   lookupResRobotStops(to,{apiKey,fetchImpl})
  ]);
  const origin=chooseResRobotStop(origins,from),destination=chooseResRobotStop(destinations,to);
  if(!origin||!destination)return {status:'ambiguous_stop',trips:[]};
  // A resolved identical stop ID is not a journey; never request or display one.
  if(origin.id===destination.id)return {status:'same_stop',trips:[]};
  const trips=await planResRobotTrip(origin.id,destination.id,{apiKey,fetchImpl,arriveBy});
  const ranked=rankResRobotTrips(trips).filter(trip=>!arriveBy||(trip.arrival.slice(0,16)<=arriveBy.cutoff&&trip.arrival.slice(0,10)===arriveBy.date));
  return {status:ranked.length?'schedule_available':'no_journeys',trips:ranked.slice(0,3)};
 }catch{return {status:'provider_unavailable',trips:[]};}
}
