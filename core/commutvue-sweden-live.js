/**
 * Trafiklab's actual Timetables + Trips API, not a mock station-board contract.
 * Fail closed when a stop match, route order, timestamp or realtime flag is missing.
 * Server-side only. Never expose API keys in source URLs.
 */
const ROOT='https://realtime-api.trafiklab.se/v1/';
const area=id=>/^740\d{6}$/.test(String(id));
const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d));
// Trafiklab timestamps are local Swedish wall-clock values without UTC offset.
function swedishTime(value){
 if(typeof value!=='string')return NaN;
 if(/(?:Z|[+-]\d{2}:\d{2})$/.test(value))return Date.parse(value);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value))return NaN;
 const wall=Date.parse(value+'Z');
 if(!Number.isFinite(wall))return NaN;
 const zone='Europe/Stockholm';
 const offsetAt=instant=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(new Date(instant));
  const offset=parts.find(p=>p.type==='timeZoneName')?.value||'';
  const m=/^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(offset);
  if(!m)return NaN;
  return (m[1]==='-'?-1:1)*(Number(m[2]||0)*60+Number(m[3]||0))*60000;
 };
 const offsets=[offsetAt(wall-3600000),offsetAt(wall-7200000)];
 const matches=[...new Set(offsets)].map(o=>wall-o).filter(t=>Number.isFinite(t)&&offsetAt(t)===wall-t);
 // DST autumn overlap is ambiguous without an explicit offset: do not guess.
 return matches.length===1?matches[0]:NaN;
}
const fresh=(t,now)=>Number.isFinite(swedishTime(t))&&now-swedishTime(t)>=0&&now-swedishTime(t)<=120000;
export function createVerifiedSwedenAdapter({apiKey,fetcher=fetch,resolveStop,now=()=>Date.now(),maxTrips=8}={}){
 if(!apiKey||typeof fetcher!=='function'||typeof resolveStop!=='function'||typeof now!=='function')throw new TypeError('Server-only Trafiklab credentials, fetcher and stop lookup required');
 async function get(path){
  const url=new URL(path,ROOT);url.searchParams.set('key',apiKey);
  const res=await fetcher(url.toString(),{headers:{accept:'application/json'}});
  if(!res.ok)throw Error('Trafiklab unavailable');
  return res.json();
 }
 return async({provider,from,to})=>{
  if(provider!=='stockholm')throw Error('Unexpected region');
  const [origin,destination]=await Promise.all([resolveStop(from),resolveStop(to)]);
  if(!area(origin)||!area(destination)||origin===destination)return {provider,status:'unavailable',departures:[]};
  const board=await get('departures/'+origin);
  if(!Array.isArray(board.departures)||!fresh(board.timestamp,now()))return {provider,status:'unavailable',departures:[]};
  const departures=[];const ids=[];const seen=new Set();
  for(const d of board.departures){
   if(departures.length>=maxTrips)break;
   const tripId=d?.trip?.trip_id,startDate=d?.trip?.start_date;
   if(typeof tripId!=='string'||!tripId||!date(startDate)||!d.is_realtime||!d.stop?.id)continue;
   const id=tripId+'|'+startDate+'|'+d.stop.id;
   if(seen.has(id))continue;seen.add(id);
   const details=await get('trips/'+encodeURIComponent(tripId)+'/'+startDate);
   if(!fresh(details.timestamp,now())||!Array.isArray(details.calls)||details.trip?.trip_id!==tripId||details.trip?.start_date!==startDate)continue;
   const calls=details.calls;
   const i=calls.findIndex(c=>c.stop?.id===d.stop.id&&c.stop?.area_id===origin);
   const j=calls.findIndex((c,k)=>k>i&&c.stop?.area_id===destination);
   if(i<0||j<=i||!calls[i].is_realtime||!Number.isFinite(swedishTime(d.scheduled))||!Number.isFinite(swedishTime(d.realtime)))continue;
   const scheduled=swedishTime(d.scheduled),expected=swedishTime(d.realtime);
   if(!Number.isFinite(scheduled)||!Number.isFinite(expected))continue;
   departures.push({id,line:String(d.route?.designation||d.route?.name||''),destination:String(d.route?.direction||d.route?.destination?.name||''),scheduled:new Date(scheduled).toISOString(),expected:new Date(expected).toISOString(),cancelled:d.canceled===true});
   ids.push(id);
  }
  if(!departures.length)return {provider,status:'unavailable',departures:[]};
  return {provider,status:'ok',sourceUrl:ROOT+'departures/'+origin,updatedAt:new Date(now()).toISOString(),journeyEvidence:{verified:true,originId:origin,destinationId:destination,departureIds:ids},departures};
 };
}

/** Official stop lookup. Ambiguous names fail closed instead of picking a random stop. */
export function createTrafiklabStopResolver({apiKey,fetcher=fetch}={}){
 if(!apiKey||typeof fetcher!=='function')throw new TypeError('Trafiklab key and fetcher required');
 return async name=>{
  if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Invalid stop name');
  const url=new URL('stops/name/'+encodeURIComponent(name.trim()),ROOT);
  url.searchParams.set('key',apiKey);
  const response=await fetcher(url.toString(),{headers:{accept:'application/json'}});
  if(!response.ok)throw Error('Stop lookup unavailable');
  const payload=await response.json();
  const exact=(payload.stop_groups||[]).filter(s=>area(s.id)&&s.name?.trim().toLocaleLowerCase('sv')===name.trim().toLocaleLowerCase('sv'));
  if(exact.length!==1)throw Error('Stop not uniquely identified');
  return exact[0].id;
}
/** Fully configured Sweden adapter using one server-only Trafiklab key. */
export function createTrafiklabSwedenLive({apiKey,fetcher=fetch,now,maxTrips}={}){
 return createVerifiedSwedenAdapter({apiKey,fetcher,now,maxTrips,resolveStop:createTrafiklabStopResolver({apiKey,fetcher})});
}
