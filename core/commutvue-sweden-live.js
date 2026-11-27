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
 return async({provider,from,to,transportMode})=>{
  if(provider!=='stockholm')throw Error('Unexpected region');
  const safeResolve=async(name,category,role)=>{
   try{return await resolveStop(name,transportMode);}
   catch(error){
    // Log only bounded diagnostic categories and stop role; never station input or credentials.
    console.info('commutvue_stop_resolution_failure',JSON.stringify({role,stage:'stop_lookup',reason:error instanceof TrafiklabRequestError?error.category:category,...(role==='destination'?{input_class:typeof name!=='string'?'non_string':name.trim().toLocaleLowerCase('sv')==='stockholm city'?'stockholm_city':name.trim().toLocaleLowerCase('sv')==='t-centralen'?'t_centralen':name.trim().toLocaleLowerCase('sv')==='stockholm c'?'stockholm_c':'other',error_stage:error instanceof TrafiklabRequestError?error.stage:'unexpected'}:{})}));
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
  if(!Array.isArray(board?.departures)||!fresh(board?.timestamp,now()))return {provider,status:'unavailable',reason:'board_unavailable',departures:[]};
  const requestedMode=typeof transportMode==='string'?transportMode.toUpperCase():null;
  if(requestedMode&&!['BUS','METRO','TRAIN','TRAM','TAXI','BOAT'].includes(requestedMode))throw new TypeError('Unsupported requested transport mode');
  const originStopIds=new Set(originStops);
  const destinationStopIds=new Set(destinationStops);
  // T-Centralen resolves to Stockholm City for commuter rail. Compare the
  // provider's canonical child name when validating an exact area/name pair.
  const destinationCallName=(String(to).trim().toLocaleLowerCase('sv')==='t-centralen'&&destinationStops.includes('1617'))?'stockholm city':String(to).trim().toLocaleLowerCase('sv');
  // Diagnose the actual departure board before candidate validation: aggregate
  // service modes only for rows belonging to the resolved origin platforms.
  const boardModeCounts={},boardCodeCounts={},boardRealtimeByMode={};let boardOriginRows=0,boardRowsMissingMode=0,boardOriginRealtimeTrue=0,boardOriginRealtimeFalse=0,boardOriginRealtimeMissing=0;
  for(const row of board.departures){
   if(!originStopIds.has(row?.stop?.id))continue;
   boardOriginRows++;
   if(row.is_realtime===true)boardOriginRealtimeTrue++;
   else if(row.is_realtime===false)boardOriginRealtimeFalse++;
   else boardOriginRealtimeMissing++;
   const mode=String(row?.route?.transport_mode||'').toUpperCase();
   const modeKey=mode||'UNKNOWN';
   if(!boardRealtimeByMode[modeKey])boardRealtimeByMode[modeKey]={true:0,false:0,missing:0};
   boardRealtimeByMode[modeKey][row.is_realtime===true?'true':row.is_realtime===false?'false':'missing']++;
   if(mode)boardModeCounts[mode]=(boardModeCounts[mode]||0)+1;else boardRowsMissingMode++;
   const code=String(row?.route?.transport_mode_code??'');
   if(code)boardCodeCounts[code]=(boardCodeCounts[code]||0)+1;
  }
  const boardStopModeCounts={};let boardStops=0,boardStopsMissingMode=0;
  for(const stop of Array.isArray(board.stops)?board.stops:[]){
   boardStops++;
   if(!Array.isArray(stop?.transport_modes)){boardStopsMissingMode++;continue;}
   for(const mode of stop.transport_modes){const key=String(mode).toUpperCase();boardStopModeCounts[key]=(boardStopModeCounts[key]||0)+1;}
  }
  const boardStopModesById=new Map((Array.isArray(board.stops)?board.stops:[]).filter(stop=>typeof stop?.id==='string').map(stop=>[stop.id,Array.isArray(stop.transport_modes)?stop.transport_modes.map(mode=>String(mode).toUpperCase()):[]]));
  const departureRowsByStopMode={};let departureRowsWithoutBoardStop=0;
  for(const row of board.departures){
   if(!originStopIds.has(row?.stop?.id))continue;
   const modes=boardStopModesById.get(row.stop.id);
   if(!modes){departureRowsWithoutBoardStop++;continue;}
   const key=modes.length?modes.join('+'):'NO_MODE';
   departureRowsByStopMode[key]=(departureRowsByStopMode[key]||0)+1;
  }
  console.info('commutvue_origin_board_modes',JSON.stringify({board_rows:Array.isArray(board.departures)?board.departures.length:0,origin_rows:boardOriginRows,origin_realtime_true:boardOriginRealtimeTrue,origin_realtime_false:boardOriginRealtimeFalse,origin_realtime_missing:boardOriginRealtimeMissing,origin_realtime_by_mode:boardRealtimeByMode,origin_mode_counts:boardModeCounts,origin_mode_code_counts:boardCodeCounts,origin_rows_missing_mode:boardRowsMissingMode,origin_platform_count:originStops.length,board_stops:boardStops,board_stop_mode_counts:boardStopModeCounts,board_stops_missing_mode_metadata:boardStopsMissingMode,departure_rows_by_board_stop_mode:departureRowsByStopMode,departure_rows_without_board_stop:departureRowsWithoutBoardStop,requested_transport_mode:requestedMode}));
  const boardTimestamp=swedishTime(board.timestamp);
  let liveTimestamp=boardTimestamp;
  const departures=[];const scheduledDepartures=[];const ids=[];const seen=new Set();const alerts=[];const alertKeys=new Set();let tripRequests=0;let scheduledOnlyAtOrigin=false;let realtimeAtOrigin=false;let timeConflicts=0;let realtimeOriginMissing=0;let realtimeDestinationMissing=0;let realtimeDestinationAbsent=0;let realtimeDestinationBeforeOrigin=0;let realtimeDestinationIdMismatch=0;let destinationAreaSeen=0;let destinationNamedStopSeen=0;let cityNamedStopSeen=0;let originPresentWithoutDestination=0;let tripsWithEmptyCalls=0;let tripsWithMultipleCalls=0;let destinationNameInDirection=0;let cityNameInDirection=0;let verifiedDestinationCalls=0;let destinationBeforeOrigin=0;let tripOriginMissing=0;let invalidTripEvidence=0;let checkedRealtimeTrips=0;let checkedScheduledTrips=0;let realtimeTripsWithLaterCalls=0;let realtimeTripsWithoutLaterCalls=0;let realtimeTripsWithStopAreas=0;let realtimeTripsWithoutStopAreas=0;let realtimeTripsWithNorthboundHint=0;let realtimeTripsWithSouthboundHint=0;let realtimeTripsWithOtherDirectionHint=0;let northboundTerminalLooksRailEnd=0;let northboundTerminalLooksUnrelated=0;let northboundTerminalLooksMetro=0;let northboundTerminalHasName=0;let northboundTerminalHasArea=0;let northboundTerminalHasId=0;let northboundTerminalIsStockholmRail=0;let northboundTerminalCallsCountGtTen=0;let northboundTripsWithTerminalNorth=0;let northboundTripsWithTerminalSouth=0;let northboundTripsWithTerminalUnknown=0;let northboundTripsWithShortLaterSequence=0;let northboundTripsWithNorthOfJordbro=0;let northboundTripsWithSouthOfJordbro=0;let northboundTripsWithUnrecognizedStops=0;let northboundTripsWithStockholmArea=0;let northboundTripsWithCityChild=0;let northboundTripsWithLaterCalls=0;let northboundTripsWithNamedStockholm=0;let realtimeCallFlagMissing=0;let realtimeTimestampMissing=0;const routeModeCounts={};const northboundHintModeCounts={};let tripsWithRouteDestination=0;let routeDestinationIdMatches=0;let routeDestinationNameMatches=0;let routeDestinationMetaAreaMatches=0;let routeDestinationOtherName=0;const realtimeStopSequenceModes={};let realtimeLaterStopsWithNames=0;let realtimeLaterStopsWithoutNames=0;let realtimeLaterStopsWithAreas=0;
  // A board can contain many timetable-only rows. Check realtime candidates first
  // so the bounded Trips lookup budget cannot be exhausted by scheduled rows.
  // Within each evidence tier, check the nearest upcoming departures first. Trafiklab
  // does not guarantee board order; the Trips request budget must not be spent
  // on later trains while an earlier relevant departure is waiting.
  // Direction hints prioritize lookup budget only; a verified Trips stop sequence is still mandatory.
  // Never prioritize a southbound hint for a journey to Stockholm City over a northbound hint.
  const towardStockholm=destinationStops.includes('1617');
  const directionTier=row=>{
   if(!towardStockholm)return 0;
   const hint=String(row?.route?.direction||row?.route?.destination?.name||'').toLocaleLowerCase('sv');
   if(/stockholm|bålsta|märsta|uppsala|kungsängen/.test(hint))return 0;
   if(/nynäshamn|västerhaninge|krigslida|tungelsta|södertälje/.test(hint))return 2;
   return 1;
  };
  // Keep every transport type documented by Trafiklab. Do not hard-code
  // commuter rail: COMMUTEVUE also serves bus, metro, tram, taxi and boat.
  // Unknown/missing modes fail closed because their service type is unverified.
  const supportedModes=new Set(['BUS','METRO','TRAIN','TRAM','TAXI','BOAT']);
  const candidates=board.departures.filter(row=>{
   const mode=String(row?.route?.transport_mode||'').toUpperCase();
   return supportedModes.has(mode)&&(!requestedMode||mode===requestedMode)&&originStopIds.has(row?.stop?.id);
  }).sort((a,b)=>{
   // For a trip toward Stockholm City, avoid exhausting the bounded Trips budget
   // on realtime departures explicitly marked southbound while scheduled
   // northbound candidates remain unchecked. Direction is never proof of arrival.
   // Explicitly southbound candidates remain last for a northbound journey.
   // Among other candidates, spend the bounded Trips budget on live evidence
   // before timetable-only rows, even when direction metadata is missing.
   const southboundA=directionTier(a)===2;
   const southboundB=directionTier(b)===2;
   if(southboundA!==southboundB)return Number(southboundA)-Number(southboundB);
   const tier=Number(b?.is_realtime===true||b?.canceled===true||b?.departureCanceled===true)-Number(a?.is_realtime===true||a?.canceled===true||a?.departureCanceled===true);
   if(tier)return tier;
   const directionPriority=directionTier(a)-directionTier(b);
   if(directionPriority)return directionPriority;
   const time=row=>swedishTime(row?.is_realtime===true&&row?.canceled!==true&&row?.departureCanceled!==true?row?.realtime:row?.scheduled);
   const ta=time(a),tb=time(b);
   return (Number.isFinite(ta)?ta:Infinity)-(Number.isFinite(tb)?tb:Infinity);
  });
  for(const d of candidates){
   if(departures.length>=maxTrips)break;
   const tripId=d?.trip?.trip_id,startDate=d?.trip?.start_date;
   if(originStopIds.has(d?.stop?.id)&&d?.is_realtime===true&&d?.canceled!==true&&d?.departureCanceled!==true)realtimeAtOrigin=true;
   if(originStopIds.has(d?.stop?.id)&&d?.is_realtime===false&&d?.canceled!==true&&d?.departureCanceled!==true)scheduledOnlyAtOrigin=true;
   if(typeof tripId!=='string'||!tripId||!date(startDate)||!originStopIds.has(d.stop?.id))continue;
   const boardCancelled=d.canceled===true||d.departureCanceled===true;
   const realtime=d.is_realtime===true;
   // Reject stale/far-future departures before spending a Trips API request.
   const scheduled=swedishTime(d.scheduled),expected=realtime?swedishTime(d.realtime):NaN;
   if(realtime&&!boardCancelled&&Number.isFinite(scheduled)&&!Number.isFinite(expected))realtimeTimestampMissing++;
   const departureTime=realtime&&!boardCancelled?expected:scheduled;
   if(!Number.isFinite(scheduled)||!Number.isFinite(departureTime)||departureTime<now()-120000||departureTime>now()+4*60*60*1000)continue;
   const line=String(d.route?.designation||d.route?.name||'').trim();
   const direction=String(d.route?.direction||d.route?.destination?.name||'').trim();
   if(!line)continue; // Direction text is optional: the trip's verified destination stop is authoritative.
   const id=tripId+'|'+startDate+'|'+d.stop.id;
   if(seen.has(id))continue;seen.add(id);
   if(tripRequests>=maxTrips)break;
   tripRequests++;
   const details=await get('trips/'+encodeURIComponent(tripId)+'/'+startDate);
   if(!fresh(details?.timestamp,now())||!Array.isArray(details?.calls)||details.trip?.trip_id!==tripId||details.trip?.start_date!==startDate){invalidTripEvidence++;continue;}
   if(realtime)checkedRealtimeTrips++;else checkedScheduledTrips++;
   const routeMode=details.route?.transport_mode_code;
   if(Number.isInteger(routeMode)){const key=String(routeMode);routeModeCounts[key]=(routeModeCounts[key]||0)+1;}
   const routeDestination=details.route?.destination;
   if(routeDestination&&typeof routeDestination==='object'){
    tripsWithRouteDestination++;
    if(destinationStopIds.has(String(routeDestination.id||'')))routeDestinationIdMatches++;
    if(typeof routeDestination.name==='string'&&routeDestination.name.trim().toLocaleLowerCase('sv')===destinationCallName)routeDestinationNameMatches++;
    if(String(routeDestination.id||'')===String(destination))routeDestinationMetaAreaMatches++;
    if(typeof routeDestination.name==='string'&&routeDestination.name.trim()&&routeDestination.name.trim().toLocaleLowerCase('sv')!==destinationCallName)routeDestinationOtherName++;
   }
   const calls=details.calls;
   if(calls.length===0)tripsWithEmptyCalls++;
   if(calls.length>1)tripsWithMultipleCalls++;
   const originCalls=calls.flatMap((c,k)=>c?.stop?.id===d.stop.id?[k]:[]);
   const i=originCalls.length===1?originCalls[0]:-1;
   // Aggregate-only evidence about Trips coverage; no raw IDs, names or extra requests.
   if(realtime&&i>=0){
    const modeKey=String(details.route?.transport_mode_code??'unknown');
    const summary=realtimeStopSequenceModes[modeKey]||(realtimeStopSequenceModes[modeKey]={trips:0,destination_matched:0,later_calls:0});
    summary.trips++;
    for(const call of calls.slice(i+1)){
     summary.later_calls++;
     if(typeof call?.stop?.name==='string'&&call.stop.name.trim())realtimeLaterStopsWithNames++;else realtimeLaterStopsWithoutNames++;
     if(area(call?.stop?.area_id))realtimeLaterStopsWithAreas++;
    }
    // Direction is diagnostic only: never treat a direction label as verified route evidence.
    const hint=direction.toLocaleLowerCase('sv');
    if(/stockholm|bålsta|märsta|uppsala|kungsängen/.test(hint)){realtimeTripsWithNorthboundHint++;if(Number.isInteger(routeMode)){const key=String(routeMode);northboundHintModeCounts[key]=(northboundHintModeCounts[key]||0)+1;}}
    else if(/nynäshamn|västerhaninge|krigslida|tungelsta/.test(hint))realtimeTripsWithSouthboundHint++;
    else realtimeTripsWithOtherDirectionHint++;
    if(/stockholm|bålsta|märsta|uppsala|kungsängen/.test(hint)){
     const later=calls.slice(i+1);
     if(later.length)northboundTripsWithLaterCalls++;
     const laterNames=later.map(c=>String(c?.stop?.name||'').toLocaleLowerCase('sv'));
     if(later.length&&later.length<=2)northboundTripsWithShortLaterSequence++;
     if(later.length){const lastStop=later.at(-1)?.stop;const terminal=laterNames.at(-1);if(/bålsta|märsta|uppsala|kungsängen|sundbyberg|solna|ulriksdal|helenelund|sollentuna|jakobsberg|barkarby|spånga|rotebro|häggvik|norrviken/.test(terminal))northboundTerminalLooksRailEnd++;else if(/t-centralen|tunnelbana|metro/.test(terminal))northboundTerminalLooksMetro++;else if(!/handen|skogås|trångsund|farsta|älvsjö|årstaberg|stockholm/.test(terminal))northboundTerminalLooksUnrelated++;if(typeof lastStop?.name==='string'&&lastStop.name.trim())northboundTerminalHasName++;if(area(lastStop?.area_id))northboundTerminalHasArea++;if(typeof lastStop?.id==='string'&&lastStop.id.trim())northboundTerminalHasId++;if(/stockholm city|stockholm centralstation/i.test(String(lastStop?.name||'')))northboundTerminalIsStockholmRail++;if(later.length>10)northboundTerminalCallsCountGtTen++;if(/handen|skogås|trångsund|farsta|älvsjö|årstaberg|stockholm/.test(terminal))northboundTripsWithTerminalNorth++;else if(/västerhaninge|krigslida|tungelsta|nynäshamn/.test(terminal))northboundTripsWithTerminalSouth++;else northboundTripsWithTerminalUnknown++;}
     if(laterNames.some(n=>/handen|skogås|trångsund|farsta|älvsjö|årstaberg|stockholm/.test(n)))northboundTripsWithNorthOfJordbro++;
     if(laterNames.some(n=>/västerhaninge|krigslida|tungelsta|nynäshamn/.test(n)))northboundTripsWithSouthOfJordbro++;
     if(later.length&&!laterNames.some(n=>/handen|skogås|trångsund|farsta|älvsjö|årstaberg|stockholm|västerhaninge|krigslida|tungelsta|nynäshamn/.test(n)))northboundTripsWithUnrecognizedStops++;
     if(later.some(c=>c?.stop?.area_id==='740098000'))northboundTripsWithStockholmArea++;
     if(later.some(c=>c?.stop?.id==='1617'))northboundTripsWithCityChild++;
     if(later.some(c=>/stockholm city/i.test(String(c?.stop?.name||''))))northboundTripsWithNamedStockholm++;
    }
    if(calls.length>i+1)realtimeTripsWithLaterCalls++;else realtimeTripsWithoutLaterCalls++;
    if(calls.some(c=>area(c?.stop?.area_id)))realtimeTripsWithStopAreas++;else realtimeTripsWithoutStopAreas++;
   }
   // Prefer an exact platform ID. Fall back to a unique call with both the
   // verified area ID and station name when the trip uses a different platform.
   const sameNamedArea=c=>c?.stop?.area_id===destination&&typeof c.stop.name==='string'&&c.stop.name.trim().toLocaleLowerCase('sv')===destinationCallName;
   const downstream=i<0?[]:calls.slice(i+1);
   const exactMatches=downstream.flatMap((c,k)=>destinationStopIds.has(c?.stop?.id)?[i+k+1]:[]);
   const areaMatches=exactMatches.length?[]:downstream.flatMap((c,k)=>sameNamedArea(c)?[i+k+1]:[]);
   const matches=exactMatches.length?exactMatches:areaMatches;
   const j=matches.length===1?matches[0]:-1;
   if(i<0)tripOriginMissing++;
   if(j>i&&i>=0){verifiedDestinationCalls++;if(realtime&&realtimeStopSequenceModes[String(details.route?.transport_mode_code??'unknown')])realtimeStopSequenceModes[String(details.route?.transport_mode_code??'unknown')].destination_matched++;}
   if(realtime&&i<0)realtimeOriginMissing++;
   else if(realtime&&j<=i){
    realtimeDestinationMissing++;
    if(matches.length>1)continue;
    const destinationCalls=calls.map((call,k)=>({call,k})).filter(({call})=>destinationStopIds.has(call?.stop?.id)||(call?.stop?.area_id===destination&&area(destination)&&typeof call?.stop?.name==='string'&&call.stop.name.trim().toLocaleLowerCase('sv')===destinationCallName));
    if(destinationCalls.length){realtimeDestinationBeforeOrigin++;destinationBeforeOrigin++;}
    else if(calls.some(call=>call?.stop?.area_id===destination&&area(destination))){realtimeDestinationIdMismatch++;destinationAreaSeen++;}
    else if(calls.some(call=>typeof call?.stop?.name==='string'&&call.stop.name.trim().toLocaleLowerCase('sv')===destinationCallName))destinationNamedStopSeen++;
    else {realtimeDestinationAbsent++;if(i>=0)originPresentWithoutDestination++;if(calls.some(call=>call?.stop?.name?.trim().toLocaleLowerCase('sv')==='stockholm city'))cityNamedStopSeen++;if(direction.toLocaleLowerCase('sv').includes(String(to).toLocaleLowerCase('sv')))destinationNameInDirection++;if(direction.toLocaleLowerCase('sv').includes('stockholm city'))cityNameInDirection++;}
   }
   else if(realtime&&calls[i].is_realtime!==true)realtimeCallFlagMissing++;
   if(i<0||j<=i)continue;
   const cancelled=boardCancelled||calls[i].canceled===true||calls[i].departureCanceled===true||calls[j].canceled===true||calls[j].arrivalCanceled===true;
   if(realtime&&!cancelled&&calls[i].is_realtime!==true)continue;
   // When Trips supplies origin timestamps, they must agree with the departure board.
   // Otherwise the two provider responses do not verify the same timing evidence.
   const originCall=calls[i];
   const tripScheduled=originCall.scheduledDeparture;
   const tripRealtime=originCall.realtimeDeparture;
   if(typeof tripScheduled==='string'&&swedishTime(tripScheduled)!==scheduled){timeConflicts++;continue;}
   if(realtime&&!cancelled&&typeof tripRealtime==='string'&&swedishTime(tripRealtime)!==expected){timeConflicts++;continue;}
   // Only attach messages to a trip whose route to the requested destination was verified.
   // Trafiklab's alerts are {type,title,text}; do not invent missing identifiers.
   for(const [index,alert] of (realtime&&Array.isArray(d.alerts)?d.alerts:[]).slice(0,20).entries()){
    if(typeof alert?.title!=='string'||!alert.title.trim())continue;
    const title=alert.title.trim().slice(0,240),description=typeof alert.text==='string'?alert.text.slice(0,1200):'';
    const key=title+'|'+description;
    if(alertKeys.has(key))continue;
    alertKeys.add(key);
    alerts.push({id:'trafiklab-'+id+'-'+index,title,description,type:'disruption',status:'active',affectedLines:[line]});
   }
   const departure={id,line,destination:direction||to,scheduled:new Date(scheduled).toISOString(),expected:realtime&&!cancelled?new Date(expected).toISOString():null,cancelled};
   if(realtime||cancelled){
    departures.push(departure);ids.push(id);
    liveTimestamp=Math.min(liveTimestamp,swedishTime(details.timestamp));
   }else{scheduledDepartures.push(departure);}
  }
  // Safe aggregate diagnostic: no station IDs, API keys, trip IDs or raw provider payloads.
  if(realtimeDestinationAbsent>0||realtimeDestinationIdMismatch>0)console.info('commutvue_destination_match_diagnostic',JSON.stringify({checked_trips:tripRequests,route_mode_counts:routeModeCounts,northbound_hint_mode_counts:northboundHintModeCounts,route_destination_present:tripsWithRouteDestination,route_destination_id_matches:routeDestinationIdMatches,route_destination_name_matches:routeDestinationNameMatches,route_destination_meta_area_matches:routeDestinationMetaAreaMatches,route_destination_alt_label:routeDestinationOtherName,missing_destination:realtimeDestinationAbsent,area_mismatch:realtimeDestinationIdMismatch,area_seen:destinationAreaSeen,named_stop_seen:destinationNamedStopSeen,city_named_stop_seen:cityNamedStopSeen,origin_without_destination:originPresentWithoutDestination,empty_trip_calls:tripsWithEmptyCalls,multiple_call_trips:tripsWithMultipleCalls,destination_in_direction:destinationNameInDirection,city_in_direction:cityNameInDirection,verified_destination_calls:verifiedDestinationCalls,destination_before_origin:destinationBeforeOrigin,trip_origin_missing:tripOriginMissing,invalid_trip_evidence:invalidTripEvidence,checked_realtime_trips:checkedRealtimeTrips,realtime_stop_sequence_modes:realtimeStopSequenceModes,realtime_later_stops_with_names:realtimeLaterStopsWithNames,realtime_later_stops_without_names:realtimeLaterStopsWithoutNames,realtime_later_stops_with_areas:realtimeLaterStopsWithAreas,checked_scheduled_trips:checkedScheduledTrips,realtime_trips_with_later_calls:realtimeTripsWithLaterCalls,realtime_trips_without_later_calls:realtimeTripsWithoutLaterCalls,realtime_trips_with_stop_areas:realtimeTripsWithStopAreas,realtime_trips_without_stop_areas:realtimeTripsWithoutStopAreas,realtime_northbound_direction_hints:realtimeTripsWithNorthboundHint,realtime_southbound_direction_hints:realtimeTripsWithSouthboundHint,northbound_later_calls:northboundTripsWithLaterCalls,northbound_terminal_north:northboundTripsWithTerminalNorth,northbound_terminal_south:northboundTripsWithTerminalSouth,northbound_terminal_unknown:northboundTripsWithTerminalUnknown,northbound_terminal_has_name:northboundTerminalHasName,northbound_terminal_rail_end:northboundTerminalLooksRailEnd,northbound_terminal_metro:northboundTerminalLooksMetro,northbound_terminal_unrecognized_category:northboundTerminalLooksUnrelated,northbound_terminal_has_area:northboundTerminalHasArea,northbound_terminal_has_id:northboundTerminalHasId,northbound_terminal_is_stockholm_rail:northboundTerminalIsStockholmRail,northbound_later_calls_gt_ten:northboundTerminalCallsCountGtTen,northbound_short_later_sequence:northboundTripsWithShortLaterSequence,northbound_north_station_names:northboundTripsWithNorthOfJordbro,northbound_south_station_names:northboundTripsWithSouthOfJordbro,northbound_unrecognized_station_names:northboundTripsWithUnrecognizedStops,northbound_stockholm_area:northboundTripsWithStockholmArea,northbound_city_child:northboundTripsWithCityChild,northbound_named_city:northboundTripsWithNamedStockholm,realtime_unclassified_direction_hints:realtimeTripsWithOtherDirectionHint}));
  if(!departures.length&&scheduledDepartures.length){
   scheduledDepartures.sort((a,b)=>Date.parse(a.scheduled)-Date.parse(b.scheduled));
   return {provider,status:'scheduled',reason:realtimeAtOrigin?(timeConflicts>0?'realtime_time_conflict':realtimeDestinationMissing>0?(realtimeDestinationBeforeOrigin>0?'realtime_destination_wrong_order':realtimeDestinationIdMismatch>0?'realtime_destination_id_mismatch':realtimeDestinationAbsent>0?'realtime_destination_absent':'realtime_destination_unverified'):realtimeOriginMissing>0?'realtime_origin_unverified':realtimeCallFlagMissing>0?'realtime_trip_flag_missing':realtimeTimestampMissing>0?'realtime_timestamp_missing':'realtime_unverified'):'no_realtime_at_origin',sourceUrl:ROOT+'departures/'+origin,updatedAt:new Date(swedishTime(board.timestamp)).toISOString(),departures:scheduledDepartures.slice(0,maxTrips)};
  }
  if(!departures.length)return {provider,status:'unavailable',reason:tripRequests===0?(realtimeTimestampMissing>0?'realtime_timestamp_missing':scheduledOnlyAtOrigin?'scheduled_only':'no_eligible_departures'):timeConflicts>0?'provider_time_conflict':realtimeDestinationMissing>0?(realtimeDestinationBeforeOrigin>0?'realtime_destination_wrong_order':realtimeDestinationIdMismatch>0?'realtime_destination_id_mismatch':realtimeDestinationAbsent>0?'realtime_destination_absent':'realtime_destination_unverified'):realtimeOriginMissing>0?'realtime_origin_unverified':realtimeCallFlagMissing>0?'realtime_trip_flag_missing':realtimeTimestampMissing>0?'realtime_timestamp_missing':'route_not_verified',departures:[]};
  departures.sort((a,b)=>Date.parse(a.expected||a.scheduled)-Date.parse(b.expected||b.scheduled));
  // Evidence IDs must follow the same order as the departures presented to callers.
  ids.splice(0,ids.length,...departures.map(d=>d.id));
  return {provider,status:'ok',sourceUrl:ROOT+'departures/'+origin,updatedAt:new Date(liveTimestamp).toISOString(),journeyEvidence:{verified:true,originId:origin+'|'+originStops.join(','),destinationId:destination+'|'+destinationStops.join(','),departureIds:ids},departures,alerts:alerts.slice(0,100)};
 };
}

/** Official stop lookup. Ambiguous names fail closed instead of picking a random stop. */
export function createTrafiklabStopResolver({apiKey,fetcher=fetch}={}){
 if(!apiKey||typeof fetcher!=='function')throw new TypeError('Trafiklab key and fetcher required');
 return async (name,transportMode)=>{
  if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Invalid stop name');
  name=name.trim().replace(/\s+(?:station|stn)$/iu,'').trim();
  // T-Centralen is the metro interchange; commuter trains use the adjacent Stockholm City platforms.
  // Resolve the commuter-rail platform explicitly, never a similarly named metro stop.
  if(name.trim().toLocaleLowerCase('sv')==='t-centralen'&&(!transportMode||String(transportMode).toUpperCase()==='TRAIN'))return await createTrafiklabStopResolver({apiKey,fetcher})('Stockholm City',transportMode);
  const stockholmMetro=name.toLocaleLowerCase('sv')==='t-centralen'&&String(transportMode).toUpperCase()==='METRO';
  // Stop Lookup uses one URL path segment. Search the first name component
  // for slash-separated labels, then match the full provider label below.
  const searchName=name.split('/')[0].trim();
  if(!searchName)throw new TrafiklabRequestError('stop_lookup','invalid_stop_data');
  const url=new URL('stops/name/'+encodeURIComponent(stockholmMetro?'Stockholm':searchName),ROOT);
  url.searchParams.set('key',apiKey);
  let response;try{response=await fetcher(url.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
  if(!response.ok)throw new TrafiklabRequestError('stop_lookup',response.status===401||response.status===403?'authorization':response.status===429?'rate_limited':'http_error');
  if(Number(response.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
  const body=await response.text();
  if(Buffer.byteLength(body,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
  const payload=JSON.parse(body);
  let groups=Array.isArray(payload?.stop_groups)?payload.stop_groups.filter(group=>group&&typeof group==='object'&&Array.isArray(group.stops)?true:group&&typeof group==='object'):[];
  groups=groups.map(group=>({...group,stops:Array.isArray(group.stops)?group.stops.filter(stop=>stop&&typeof stop==='object'):[]}));
  // Trafiklab publishes Stockholm City as a child of the Stockholm meta-stop.
  // If the direct child-name lookup omits that parent, request the documented parent
  // and still require an exact child-name match. Never accept a fuzzy station match.
  if(!stockholmMetro&&!groups.some(g=>g.name?.trim().toLocaleLowerCase('sv')===name.trim().toLocaleLowerCase('sv')||(g.stops||[]).some(s=>s.name?.trim().toLocaleLowerCase('sv')===name.trim().toLocaleLowerCase('sv')))&&['stockholm city','t-centralen'].includes(name.trim().toLocaleLowerCase('sv'))){
   const parentUrl=new URL('stops/name/Stockholm',ROOT);parentUrl.searchParams.set('key',apiKey);
   let parentResponse;try{parentResponse=await fetcher(parentUrl.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
   if(!parentResponse.ok)throw new TrafiklabRequestError('stop_lookup',parentResponse.status===401||parentResponse.status===403?'authorization':parentResponse.status===429?'rate_limited':'http_error');
   if(Number(parentResponse.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const parentBody=await parentResponse.text();
   if(Buffer.byteLength(parentBody,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const parentPayload=JSON.parse(parentBody);
   groups=Array.isArray(parentPayload?.stop_groups)?parentPayload.stop_groups.filter(group=>group&&typeof group==='object'&&Array.isArray(group.stops)?true:group&&typeof group==='object'):[];
   groups=groups.map(group=>({...group,stops:Array.isArray(group.stops)?group.stops.filter(stop=>stop&&typeof stop==='object'):[]}));
  }
  const stationLabel=value=>String(value||'').trim().toLocaleLowerCase('sv').replace(/\s+(?:station|stn)$/u,'').trim();
  // A full-name lookup can return zero groups even when a shorter indexed search
  // finds the station. Retry with a prefix, but still require an exact name below.
  if(!groups.some(group=>area(group.id)&&(stationLabel(group.name)===stationLabel(name)||(group.stops||[]).some(stop=>stationLabel(stop.name)===stationLabel(name))))&&name.trim().length>=4&&!['stockholm city','t-centralen'].includes(name.trim().toLocaleLowerCase('sv'))){
   const prefix=name.trim().slice(0,Math.max(3,Math.min(5,name.trim().length-1)));
   const prefixUrl=new URL('stops/name/'+encodeURIComponent(prefix),ROOT);
   prefixUrl.searchParams.set('key',apiKey);
   let prefixResponse;try{prefixResponse=await fetcher(prefixUrl.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});}catch{throw new TrafiklabRequestError('stop_lookup','network_or_timeout');}
   if(!prefixResponse.ok)throw new TrafiklabRequestError('stop_lookup',prefixResponse.status===401||prefixResponse.status===403?'authorization':prefixResponse.status===429?'rate_limited':'http_error');
   if(Number(prefixResponse.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const prefixBody=await prefixResponse.text();
   if(Buffer.byteLength(prefixBody,'utf8')>MAX_RESPONSE_BYTES)throw Error('Stop lookup payload too large');
   const prefixPayload=JSON.parse(prefixBody);
   groups=Array.isArray(prefixPayload?.stop_groups)?prefixPayload.stop_groups.filter(group=>group&&typeof group==='object'&&Array.isArray(group.stops)?true:group&&typeof group==='object'):[];
   groups=groups.map(group=>({...group,stops:Array.isArray(group.stops)?group.stops.filter(stop=>stop&&typeof stop==='object'):[]}));
  }
  const same=(a,b)=>typeof a==='string'&&stationLabel(a)===stationLabel(b);
  if(stockholmMetro)groups=groups.filter(group=>group.id==='740098000');
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
   const requested=String(transportMode||'').toUpperCase();
   const matchingModes=requested&&requested!=='TRAIN'?[requested]:['TRAIN','RAIL','COMMUTER_RAIL','SUBURBAN_RAIL'];
   const matchesMode=entry=>Array.isArray(entry?.transport_modes)&&entry.transport_modes.some(mode=>matchingModes.includes(String(mode).toUpperCase()));
   const railAreas=new Set(exact.filter(matchesMode).map(group=>group.id));
   const areaType=group=>String(group.area_type).toUpperCase().replace('_','');
   if(railAreas.size>1&&requested){
    // A meta-stop can repeat a national stop's exact name and platforms.
    // Prefer the national stop only when all other candidates are proven containers.
    const candidateGroups=exact.filter(group=>railAreas.has(group.id));
    const nationalGroups=candidateGroups.filter(group=>areaType(group)==='RIKSHALLPLATS');
    const nationalIds=new Set(nationalGroups.map(group=>group.id));
    if(nationalIds.size===1){
     const nationalId=nationalGroups[0].id;
     const platformIds=new Set(nationalGroups.flatMap(group=>group.stops.map(stop=>stop.id)).filter(id=>typeof id==='string'&&id.length));
     const containers=candidateGroups.filter(group=>group.id!==nationalId);
     if(platformIds.size&&containers.every(group=>areaType(group)==='METASTOP'&&
      [...platformIds].every(id=>group.stops.some(stop=>stop.id===id)))){
      railAreas.clear();
      railAreas.add(nationalId);
     }
    }
   }
   // If metadata cannot distinguish candidates, verify actual platform departures.
   // Bound extra requests and fail closed if any candidate cannot be inspected.
   if(requested&&railAreas.size!==1&&exactAreaIds.size<=4){
    const verified=await Promise.all([...exactAreaIds].map(async id=>{
     const platforms=new Set(exact.filter(g=>g.id===id).flatMap(g=>g.stops.map(p=>p.id)));
     const boardUrl=new URL('departures/'+id,ROOT);boardUrl.searchParams.set('key',apiKey);
     try{
      const response=await fetcher(boardUrl.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(MAX_FETCH_MS)});
      if(!response.ok||Number(response.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)return null;
      const body=await response.text();if(Buffer.byteLength(body,'utf8')>MAX_RESPONSE_BYTES)return null;
      const board=JSON.parse(body);if(!Array.isArray(board?.departures))return null;
      const hasMatchingDeparture=board.departures.some(row=>platforms.has(row?.stop?.id)&&matchingModes.includes(String(row?.route?.transport_mode||'').toUpperCase()));
      const hasMatchingPlatform=Array.isArray(board.stops)&&board.stops.some(stop=>platforms.has(stop?.id)&&matchesMode(stop));
      return {id,match:hasMatchingDeparture||hasMatchingPlatform};
     }catch{return null;}
    }));
    if(verified.every(Boolean)&&verified.filter(v=>v.match).length===1){railAreas.clear();railAreas.add(verified.find(v=>v.match).id);}
   }
   if(railAreas.size===1){
    const selected=[...railAreas][0];
    const selectedGroups=exact.filter(group=>group.id===selected);
    const stopIds=[...new Set(selectedGroups.flatMap(group=>(group.stops||[]).map(stop=>stop.id).filter(id=>typeof id==='string'&&id.length>0)))];
    const selectedModes=[...new Set(selectedGroups.flatMap(group=>Array.isArray(group.transport_modes)?group.transport_modes.map(mode=>String(mode).toUpperCase()):[]))].sort();
    const platformModeCounts={};let platformModeMetadataMissing=0;
    for(const platform of selectedGroups.flatMap(group=>Array.isArray(group.stops)?group.stops:[])){
     if(!Array.isArray(platform.transport_modes)){platformModeMetadataMissing++;continue;}
     for(const mode of platform.transport_modes){const key=String(mode).toUpperCase();platformModeCounts[key]=(platformModeCounts[key]||0)+1;}
    }
    console.info('commutvue_stop_group_modes',JSON.stringify({query:name,matching_groups:exact.length,rail_areas:railAreas.size,platform_count:stopIds.length,transport_modes:selectedModes,mode_metadata_present:selectedGroups.some(group=>Array.isArray(group.transport_modes)),platform_mode_counts:platformModeCounts,platforms_missing_mode_metadata:platformModeMetadataMissing}));
    if(stopIds.length)return {id:selected,stopIds};
   }
   console.info('commutvue_ambiguous_stop_shape',JSON.stringify({
    areas:exactAreaIds.size,
    matching_mode_areas:railAreas.size,
    requested_mode:['BUS','METRO','TRAIN','TRAM','TAXI','BOAT'].includes(requested)?requested:null,
    groups:exact.slice(0,8).map(group=>({
     type:['METASTOP','RIKSHALLPLATS'].includes(areaType(group))?areaType(group):null,
     matching_mode:matchesMode(group),
     platforms:group.stops.length,
     shared_platforms:group.stops.filter(stop=>typeof stop.id==='string'&&exact.some(other=>other.id!==group.id&&other.stops.some(candidate=>candidate.id===stop.id))).length
    }))
   }));
   throw new TrafiklabRequestError('stop_lookup','ambiguous_station');
  }
  if(exactAreaIds.size===1){
   const stopIds=[...new Set(exact.flatMap(group=>(group.stops||[]).map(stop=>stop.id).filter(id=>typeof id==='string'&&id.length>0)))];
   if(!stopIds.length)throw new TrafiklabRequestError('stop_lookup','missing_platform_ids');
   const groupModes=[...new Set(exact.flatMap(group=>Array.isArray(group.transport_modes)?group.transport_modes.map(mode=>String(mode).toUpperCase()):[]))].sort();
   console.info('commutvue_stop_group_modes',JSON.stringify({query:name,matching_groups:exact.length,platform_count:stopIds.length,transport_modes:groupModes,mode_metadata_present:exact.some(group=>Array.isArray(group.transport_modes))}));
   return {id:exact[0].id,stopIds};
  }
  // Stockholm City can be a named child of the Stockholm meta-stop in Trafiklab.
  // Match exactly one child across all groups; never guess from partial names.
  let children=groups.filter(s=>area(s.id)).flatMap(group=>(group.stops||[]).filter(stop=>same(stop.name,name)&&typeof stop.id==='string'&&stop.id.length>0).map(stop=>({id:group.id,stopIds:[stop.id]})));
  // Several platforms with the same exact name are valid only within one meta-stop.
  let parents=new Set(children.map(child=>child.id));
  if(parents.size>1&&transportMode){
   const mode=String(transportMode).toUpperCase();
   const matchingParents=new Set(groups.filter(group=>parents.has(group.id)&&Array.isArray(group.transport_modes)&&
    group.transport_modes.some(value=>String(value).toUpperCase()===mode)).map(group=>group.id));
   if(matchingParents.size===1){
    parents=matchingParents;
    children=children.filter(child=>parents.has(child.id));
   }
  }
  if(!children.length){
   // Safe shape-only diagnostics: distinguish a missing parent from a parent whose
   // child platforms are absent or named differently. Never log names or IDs.
   if(name.trim().toLocaleLowerCase('sv')==='stockholm city')console.info('commutvue_stockholm_city_lookup_shape',JSON.stringify({group_count:groups.length,area_group_count:groups.filter(g=>area(g.id)).length,child_count:groups.reduce((n,g)=>n+(g.stops||[]).length,0),stockholm_parent_present:groups.some(g=>g.id==='740098000'),stockholm_parent_child_count:groups.filter(g=>g.id==='740098000').reduce((n,g)=>n+(g.stops||[]).length,0),exact_child_matches:children.length}));
   throw new TrafiklabRequestError('stop_lookup',groups.length?'station_not_found':'empty_station_results');
  }
  if(parents.size!==1)throw new TrafiklabRequestError('stop_lookup','ambiguous_station');
  const selectedGroup=groups.find(group=>group.id===children[0].id);
  const groupModes=[...new Set(Array.isArray(selectedGroup?.transport_modes)?selectedGroup.transport_modes.map(mode=>String(mode).toUpperCase()):[])].sort();
  const stopIds=[...new Set(children.flatMap(child=>child.stopIds))];
  console.info('commutvue_stop_group_modes',JSON.stringify({query:name,matching_groups:1,platform_count:stopIds.length,transport_modes:groupModes,mode_metadata_present:Array.isArray(selectedGroup?.transport_modes)}));
  return {id:children[0].id,stopIds};
 };
}
/** Fully configured Sweden adapter using one server-only Trafiklab key. */
export function createTrafiklabSwedenLive({apiKey,fetcher=fetch,now,maxTrips}={}){
 return createVerifiedSwedenAdapter({apiKey,fetcher,now,maxTrips,resolveStop:createTrafiklabStopResolver({apiKey,fetcher})});
}
