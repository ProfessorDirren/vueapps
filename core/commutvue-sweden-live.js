/**
 * Trafiklab's actual Timetables + Trips API, not a mock station-board contract.
 * Fail closed when a stop match, route order, timestamp or realtime flag is missing.
 * Server-side only. Never expose API keys in source URLs.
 */
const ROOT='https://realtime-api.trafiklab.se/v1/';
const MAX_FETCH_MS=7000;
const MAX_RESPONSE_BYTES=350000;
export class TrafiklabRequestError extends Error {
 constructor(stage,category){super('Trafiklab '+category+' at '+stage);this.name='TrafiklabRequestError';this.stage=stage;this.category=category;}
}
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
 if(!apiKey||typeof fetcher!=='function'||typeof resolveStop!=='function'||typeof now!=='function'||!Number.isInteger(maxTrips)||maxTrips<1||maxTrips>8)throw new TypeError('Server-only Trafiklab credentials, fetcher and stop lookup required');
 async function get(path){
  const url=new URL(path,ROOT);url.searchParams.set('key',apiKey);
  let res;try{res=await fetcher(url.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError(path.startsWith('trips/')?'trip_lookup':'departure_board','network_or_timeout');}
  if(!res.ok)throw new TrafiklabRequestError(path.startsWith('stops/')?'stop_lookup':path.startsWith('trips/')?'trip_lookup':'departure_board',res.status===401||res.status===403?'authorization':res.status===429?'rate_limited':'http_error');
  if(Number(res.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Trafiklab payload too large');
  const body=await res.text();
  if(Buffer.byteLength(body,'utf8')>MAX_RESPONSE_BYTES)throw Error('Trafiklab payload too large');
  return JSON.parse(body);
 }
 return async({provider,from,to})=>{
  if(provider!=='stockholm')throw Error('Unexpected region');
  const safeResolve=async(name,category,role)=>{
   try{return await resolveStop(name);}
   catch(error){
    if(error instanceof TrafiklabRequestError){error.stopRole=role;throw error;}
    // Identify which requested stop failed, without revealing upstream response data.
    const wrapped=new TrafiklabRequestError('stop_lookup',category);wrapped.stopRole=role;throw wrapped;
   }
  };
  const [originResult,destinationResult]=await Promise.all([
   safeResolve(from,'invalid_origin_stop_data','origin'),
   safeResolve(to,'invalid_destination_stop_data','destination')
  ]);
  const origin=typeof originResult==='string'?originResult:originResult?.id;
  const destination=typeof destinationResult==='string'?destinationResult:destinationResult?.id;
  const originStops=Array.isArray(originResult?.stopIds)?originResult.stopIds:[];
  const destinationStops=Array.isArray(destinationResult?.stopIds)?destinationResult.stopIds:[];
  // Distinct platforms may share a Trafiklab meta-stop. Compare actual stop IDs, not just group IDs.
  if(!area(origin)||!area(destination)||!originStops.length||!destinationStops.length||originStops.some(id=>destinationStops.includes(id)))return {provider,status:'unavailable',reason:'stop_resolution',departures:[]};
  const board=await get('departures/'+origin);
  if(!Array.isArray(board.departures)||!fresh(board.timestamp,now()))return {provider,status:'unavailable',reason:'board_unavailable',departures:[]};
  const originStopIds=new Set(originStops);
  const destinationStopIds=new Set(destinationStops);
  const departures=[];const ids=[];const seen=new Set();const alerts=[];const alertKeys=new Set();let tripRequests=0;let scheduledOnlyAtOrigin=false;
  for(const d of board.departures){
   if(departures.length>=maxTrips)break;
   const tripId=d?.trip?.trip_id,startDate=d?.trip?.start_date;
   if(originStopIds.has(d?.stop?.id)&&d?.is_realtime===false&&d?.canceled!==true)scheduledOnlyAtOrigin=true;
   if(typeof tripId!=='string'||!tripId||!date(startDate)||d.is_realtime!==true||!originStopIds.has(d.stop?.id)||d.canceled===true)continue;
   // Reject stale/far-future departures before spending a Trips API request.
   const scheduled=swedishTime(d.scheduled),expected=swedishTime(d.realtime);
   if(!Number.isFinite(scheduled)||!Number.isFinite(expected)||expected<now()-120000||expected>now()+4*60*60*1000)continue;
   const line=String(d.route?.designation||d.route?.name||'').trim();
   const direction=String(d.route?.direction||d.route?.destination?.name||'').trim();
   if(!line||!direction)continue; // One incomplete route must not invalidate other verified departures.
   const id=tripId+'|'+startDate+'|'+d.stop.id;
   if(seen.has(id))continue;seen.add(id);
   if(tripRequests>=maxTrips)break;
   tripRequests++;
   const details=await get('trips/'+encodeURIComponent(tripId)+'/'+startDate);
   if(!fresh(details.timestamp,now())||!Array.isArray(details.calls)||details.trip?.trip_id!==tripId||details.trip?.start_date!==startDate)continue;
   const calls=details.calls;
   const i=calls.findIndex(c=>c.stop?.id===d.stop.id);
   const j=calls.findIndex((c,k)=>k>i&&destinationStopIds.has(c.stop?.id));
   if(i<0||j<=i||calls[i].is_realtime!==true||d.canceled===true||calls[i].canceled===true||calls[j].canceled===true||!Number.isFinite(swedishTime(d.scheduled))||!Number.isFinite(swedishTime(d.realtime)))continue;
   // Only attach messages to a trip whose route to the requested destination was verified.
   // Trafiklab's alerts are {type,title,text}; do not invent missing identifiers.
   for(const [index,alert] of (Array.isArray(d.alerts)?d.alerts:[]).slice(0,20).entries()){
    if(typeof alert?.title!=='string'||!alert.title.trim())continue;
    const title=alert.title.trim().slice(0,240),description=typeof alert.text==='string'?alert.text.slice(0,1200):'';
    const key=title+'|'+description;
    if(alertKeys.has(key))continue;
    alertKeys.add(key);
    alerts.push({id:'trafiklab-'+id+'-'+index,title,description,type:'disruption',status:'active',affectedLines:[line]});
   }
   departures.push({id,line,destination:direction,scheduled:new Date(scheduled).toISOString(),expected:new Date(expected).toISOString(),cancelled:false});
   ids.push(id);
  }
  if(!departures.length)return {provider,status:'unavailable',reason:tripRequests===0?(scheduledOnlyAtOrigin?'scheduled_only':'no_eligible_departures'):'route_not_verified',departures:[]};
  departures.sort((a,b)=>Date.parse(a.expected)-Date.parse(b.expected));
  // Evidence IDs must follow the same order as the departures presented to callers.
  ids.splice(0,ids.length,...departures.map(d=>d.id));
  return {provider,status:'ok',sourceUrl:ROOT+'departures/'+origin,updatedAt:new Date(swedishTime(board.timestamp)).toISOString(),journeyEvidence:{verified:true,originId:origin+'|'+originStops.join(','),destinationId:destination+'|'+destinationStops.join(','),departureIds:ids},departures,alerts:alerts.slice(0,100)};
 };
}

/** Official stop lookup. Ambiguous names fail closed instead of picking a random stop. */
export function createTrafiklabStopResolver({apiKey,fetcher=fetch}={}){
 if(!apiKey||typeof fetcher!=='function')throw new TypeError('Trafiklab key and fetcher required');
 return async name=>{
  if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Invalid stop name');
  const url=new URL('stops/name/'+encodeURIComponent(name.trim()),ROOT);
  url.searchParams.set('key',apiKey);
  let response;try{response=await fetcher(url.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
  if(!response.ok)throw new TrafiklabRequestError('stop_lookup',response.status===401||response.status===403?'authorization':response.status===429?'rate_limited':'http_error');
  if(Number(response.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
  const body=await response.text();
  if(Buffer.byteLength(body,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
  const payload=JSON.parse(body);
  let groups=Array.isArray(payload.stop_groups)?payload.stop_groups:[];
  // Trafiklab publishes Stockholm City as a child of the Stockholm meta-stop.
  // If the direct child-name lookup omits that parent, request the documented parent
  // and still require an exact child-name match. Never accept a fuzzy station match.
  if(!groups.some(g=>g.name?.trim().toLocaleLowerCase('sv')===name.trim().toLocaleLowerCase('sv')||(g.stops||[]).some(s=>s.name?.trim().toLocaleLowerCase('sv')===name.trim().toLocaleLowerCase('sv')))&&['stockholm city','t-centralen'].includes(name.trim().toLocaleLowerCase('sv'))){
   const parentUrl=new URL('stops/name/Stockholm',ROOT);parentUrl.searchParams.set('key',apiKey);
   let parentResponse;try{parentResponse=await fetcher(parentUrl.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
   if(!parentResponse.ok)throw new TrafiklabRequestError('stop_lookup',parentResponse.status===401||parentResponse.status===403?'authorization':parentResponse.status===429?'rate_limited':'http_error');
   if(Number(parentResponse.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const parentBody=await parentResponse.text();
   if(Buffer.byteLength(parentBody,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const parentPayload=JSON.parse(parentBody);
   groups=Array.isArray(parentPayload.stop_groups)?parentPayload.stop_groups:[];
  }
  // A full-name lookup can return zero groups even when a shorter indexed search
  // finds the station. Retry with a prefix, but still require an exact name below.
  if(!groups.length&&name.trim().length>=4&&!['stockholm city','t-centralen'].includes(name.trim().toLocaleLowerCase('sv'))){
   const prefix=name.trim().slice(0,Math.max(3,Math.min(5,name.trim().length-1)));
   const prefixUrl=new URL('stops/name/'+encodeURIComponent(prefix),ROOT);
   prefixUrl.searchParams.set('key',apiKey);
   let prefixResponse;try{prefixResponse=await fetcher(prefixUrl.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
   if(!prefixResponse.ok)throw new TrafiklabRequestError('stop_lookup',prefixResponse.status===401||prefixResponse.status===403?'authorization':prefixResponse.status===429?'rate_limited':'http_error');
   if(Number(prefixResponse.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const prefixBody=await prefixResponse.text();
   if(Buffer.byteLength(prefixBody,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const prefixPayload=JSON.parse(prefixBody);
   groups=Array.isArray(prefixPayload.stop_groups)?prefixPayload.stop_groups:[];
  }
  const same=(a,b)=>typeof a==='string'&&a.trim().toLocaleLowerCase('sv')===b.trim().toLocaleLowerCase('sv');
  const exact=groups.filter(s=>area(s.id)&&same(s.name,name));
  // Duplicate rows for one station area are not different locations. Combine their
  // child platforms; still reject exact-name matches across different area IDs.
  const exactAreaIds=new Set(exact.map(s=>s.id));
  if(exactAreaIds.size>1){
   // Prefer an exact station with explicitly rail-classified platforms only when
   // exactly one area qualifies. Never infer rail service from names or area IDs.
   // Stop Lookup documents transport_modes on the GROUP, not child stops.
   // A unique TRAIN-capable group is a safe rail candidate; Trips validation
   // still checks that an actual train reaches the requested destination.
   const rail=group=>Array.isArray(group.transport_modes)&&group.transport_modes.some(mode=>['TRAIN','RAIL','COMMUTER_RAIL','SUBURBAN_RAIL'].includes(String(mode).toUpperCase()));
   const railAreas=new Set(exact.filter(rail).map(group=>group.id));
   if(railAreas.size===1){
    const selected=[...railAreas][0];
    const stopIds=[...new Set(exact.filter(group=>group.id===selected).flatMap(group=>(group.stops||[]).map(stop=>stop.id).filter(id=>typeof id==='string'&&id.length>0)))];
    if(stopIds.length)return {id:selected,stopIds};
   }
   throw new TrafiklabRequestError('stop_lookup','ambiguous_station');
  }
  if(exactAreaIds.size===1){
   const stopIds=[...new Set(exact.flatMap(group=>(group.stops||[]).map(stop=>stop.id).filter(id=>typeof id==='string'&&id.length>0)))];
   if(!stopIds.length)throw new TrafiklabRequestError('stop_lookup','missing_platform_ids');
   return {id:exact[0].id,stopIds};
  }
  // Stockholm City can be a named child of the Stockholm meta-stop in Trafiklab.
  // Match exactly one child across all groups; never guess from partial names.
  const children=groups.filter(s=>area(s.id)).flatMap(group=>(group.stops||[]).filter(stop=>same(stop.name,name)&&typeof stop.id==='string'&&stop.id.length>0).map(stop=>({id:group.id,stopIds:[stop.id]})));
  // Several platforms with the same exact name are valid only within one meta-stop.
  const parents=new Set(children.map(child=>child.id));
  if(!children.length)throw new TrafiklabRequestError('stop_lookup',groups.length?'station_not_found':'empty_station_results');
  if(parents.size!==1)throw new TrafiklabRequestError('stop_lookup','ambiguous_station');
  return {id:children[0].id,stopIds:[...new Set(children.flatMap(child=>child.stopIds))]};
 };
}
/** Fully configured Sweden adapter using one server-only Trafiklab key. */
export function createTrafiklabSwedenLive({apiKey,fetcher=fetch,now,maxTrips}={}){
 return createVerifiedSwedenAdapter({apiKey,fetcher,now,maxTrips,resolveStop:createTrafiklabStopResolver({apiKey,fetcher})});
}
