/**
 * Build regional GTFS trip -> ordered stop IDs from stop_times.txt.
 * Caller must obtain this file from the SAME SL Regional GTFS dataset
 * as the realtime feed; no inferred stop IDs or cross-provider joins.
 */
function parseCSV(line){
 const result=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){result.push(value);value='';}
  else value+=ch;
 }
 if(quoted)throw new Error('Invalid GTFS CSV');
 result.push(value);return result;
}
export function parseRegionalStopTimes(csv,{maxRows=5000000,maxTrips=250000,includeTimes=false}={}){
 if(typeof csv!=='string'||csv.length>256*1024*1024||!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>5000000||!Number.isSafeInteger(maxTrips)||maxTrips<1||maxTrips>250000)throw new Error('Invalid regional GTFS stop_times');
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/);
 const header=parseCSV(lines.shift()||'');
 const indexes=['trip_id','stop_id','stop_sequence'].map(name=>header.indexOf(name));
 const arrivalIndex=header.indexOf('arrival_time'),departureIndex=header.indexOf('departure_time');
 if(includeTimes&&(arrivalIndex<0||departureIndex<0))throw new Error('Missing GTFS arrival/departure fields');
 if(indexes.some(i=>i<0)||new Set(indexes).size!==3)throw new Error('Missing GTFS stop_times fields');
 const records=new Map();let rows=0;
 for(const line of lines){
  if(!line.trim())continue;
  if(++rows>maxRows)throw new Error('GTFS stop_times row limit');
  const cells=parseCSV(line.replaceAll(String.fromCharCode(13),''));
  const [trip,stop,sequence]=indexes.map(i=>cells[i]);
  const order=Number(sequence);
  if(!trip||!stop||!Number.isSafeInteger(order)||order<0)throw new Error('Invalid GTFS stop_times record');
  if(!records.has(trip)){if(records.size>=maxTrips)throw new Error('GTFS trip limit');records.set(trip,[]);}
  records.get(trip).push({stop,order,arrivalTime:includeTimes?cells[arrivalIndex]:'',departureTime:includeTimes?cells[departureIndex]:''});
 }
 const trips=new Map();
 for(const [trip,stops] of records){
  stops.sort((a,b)=>a.order-b.order);
  if(stops.length>300||stops.some((s,i)=>i>0&&s.order===stops[i-1].order))throw new Error('Invalid GTFS stop sequence');
  trips.set(trip,includeTimes?stops.map(s=>({stop:s.stop,arrivalTime:s.arrivalTime,departureTime:s.departureTime,sequence:s.order})):stops.map(s=>s.stop));
 }
 return trips;
}


/** Return only matching stop-name records; never emit the full regional stops table. */
export function parseRegionalStopNames(csv,{matchTerms=['jordbro','stockholm city'],maxRows=200000}={}){
 if(typeof csv!=='string'||csv.length>32*1024*1024||!Array.isArray(matchTerms)||!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>200000)throw new Error('Invalid regional GTFS stops');
 const terms=matchTerms.map(x=>String(x).trim().toLocaleLowerCase('en')).filter(Boolean);
 if(!terms.length)throw new Error('Missing GTFS stop-name match terms');
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/);
 const header=parseCSV(lines.shift()||'');
 const indexes={id:header.indexOf('stop_id'),name:header.indexOf('stop_name'),parent:header.indexOf('parent_station'),type:header.indexOf('location_type')};
 if(indexes.id<0||indexes.name<0)throw new Error('Missing GTFS stops fields');
 const matches=[];let rows=0;
 for(const line of lines){
  if(!line.trim())continue;
  if(++rows>maxRows)throw new Error('GTFS stops row limit');
  const cells=parseCSV(line.replaceAll(String.fromCharCode(13),''));const stopId=cells[indexes.id],stopName=cells[indexes.name]||'';
  if(!stopId||!stopName)throw new Error('Invalid GTFS stops record');
  if(terms.some(term=>stopName.toLocaleLowerCase('en').includes(term)))matches.push({stopId,stopName,parentStation:indexes.parent<0?'':cells[indexes.parent]||'',locationType:indexes.type<0?'':cells[indexes.type]||''});
 }
 return matches;
}


/** Find same-trip, ordered origin-to-destination matches using exact station names and child platform IDs. */
export function findRegionalDirectJourneys(trips, stops, {originName='Jordbro', destinationName='Stockholm City', maxExamples=10}={}) {
 if (!(trips instanceof Map) || !Array.isArray(stops) || !Number.isSafeInteger(maxExamples) || maxExamples<1 || maxExamples>20) throw new Error('Invalid regional journey inputs');
 const normalize=value=>String(value||'').trim().toLocaleLowerCase('en');
 const collect=name=>{
  const parents=new Set(stops.filter(s=>normalize(s.stopName)===normalize(name)&&String(s.locationType)==='1').map(s=>s.stopId));
  const ids=new Set(parents);
  for(const stop of stops) if(String(stop.locationType)==='0'&&parents.has(stop.parentStation)) ids.add(stop.stopId);
  return ids;
 };
 const origins=collect(originName),destinations=collect(destinationName);
 if(!origins.size||!destinations.size) throw new Error('Requested GTFS station not found');
 let matchingTripCount=0;const examples=[];
 for(const [tripId,sequence] of trips){
  let originIndex=-1,destinationIndex=-1;
  for(let i=0;i<sequence.length;i++){
   const stopId=typeof sequence[i]==='string'?sequence[i]:sequence[i]?.stop;
   if(originIndex<0&&origins.has(stopId)) originIndex=i;
   if(originIndex>=0&&destinations.has(stopId)) {destinationIndex=i;break;}
  }
  if(originIndex>=0&&destinationIndex>originIndex){
   matchingTripCount++;
   if(examples.length<maxExamples) examples.push({tripId,originStopId:typeof sequence[originIndex]==='string'?sequence[originIndex]:sequence[originIndex].stop,destinationStopId:typeof sequence[destinationIndex]==='string'?sequence[destinationIndex]:sequence[destinationIndex].stop,originSequence:originIndex+1,destinationSequence:destinationIndex+1,departureTime:sequence[originIndex]?.departureTime||null,arrivalTime:sequence[destinationIndex]?.arrivalTime||null});
  }
 }
 return {originName,destinationName,originStopIdCount:origins.size,destinationStopIdCount:destinations.size,matchingTripCount,examples};
}


/** Parse bounded trip, route and service-calendar tables from the same regional feed. */
export function parseRegionalServiceMetadata({tripsCsv,routesCsv,calendarCsv='',calendarDatesCsv=''}) {
 const read=(csv,required,maxRows=300000,optional=[])=>{
  if(typeof csv!=='string'||csv.length>32*1024*1024)throw new Error('Invalid regional GTFS metadata file');
  const normalized=csv.charCodeAt(0)===0xFEFF?csv.slice(1):csv;
  const lines=normalized.split(String.fromCharCode(10));const header=parseCSV((lines.shift()||'').replaceAll(String.fromCharCode(13),''));
  const indexes=Object.fromEntries([...required,...optional].map(k=>[k,header.indexOf(k)]));
  if(required.some(k=>indexes[k]<0)throw new Error('Missing regional GTFS metadata columns: '+required.filter(k=>indexes[k]<0).join(', '));
  const rows=[];for(const line of lines){if(!line.trim())continue;if(rows.length>=maxRows)throw new Error('Regional GTFS metadata row limit');const cells=parseCSV(line.replaceAll(String.fromCharCode(13),''));rows.push(Object.fromEntries(Object.entries(indexes).map(([k,i])=>[k,i<0?'':cells[i]||''])));}
  return rows;
 };
 const trips=read(tripsCsv,['trip_id','route_id','service_id'],300000,['trip_headsign','trip_short_name']);
 const routes=read(routesCsv,['route_id','route_type'],10000,['route_short_name','route_long_name']);
 const calendars=calendarCsv?read(calendarCsv,['service_id','monday','tuesday','wednesday','thursday','friday','saturday','sunday','start_date','end_date'],10000):[];
 const exceptions=calendarDatesCsv?read(calendarDatesCsv,['service_id','date','exception_type'],100000):[];
 const tripById=new Map();for(const row of trips){if(!row.trip_id||!row.route_id||!row.service_id||tripById.has(row.trip_id))throw new Error('Invalid or duplicate GTFS trip metadata');tripById.set(row.trip_id,{routeId:row.route_id,serviceId:row.service_id,tripHeadsign:row.trip_headsign||null,tripShortName:row.trip_short_name||null});}
 const routeTypes=new Map(),routeDetails=new Map();for(const row of routes){if(!row.route_id||routeTypes.has(row.route_id)||!/^[0-9]+$/.test(row.route_type))throw new Error('Invalid or duplicate GTFS route metadata');routeTypes.set(row.route_id,Number(row.route_type));routeDetails.set(row.route_id,{routeShortName:row.route_short_name||null,routeLongName:row.route_long_name||null});}
 const serviceCalendars=new Map();for(const row of calendars){if(!/^[0-9]{8}$/.test(row.start_date)||!/^[0-9]{8}$/.test(row.end_date)||serviceCalendars.has(row.service_id))throw new Error('Invalid GTFS service calendar');serviceCalendars.set(row.service_id,row);}
 const serviceExceptions=new Map();for(const row of exceptions){if(!/^[0-9]{8}$/.test(row.date)||!['1','2'].includes(row.exception_type))throw new Error('Invalid GTFS service exception');if(!serviceExceptions.has(row.service_id))serviceExceptions.set(row.service_id,new Map());serviceExceptions.get(row.service_id).set(row.date,Number(row.exception_type));}
 return {tripById,routeTypes,routeDetails,serviceCalendars,serviceExceptions};
}

/** Filter any GTFS route_type, including extended GTFS types, by service calendar.
 * Without routeTypes every route is eligible. Unknown route types are retained,
 * never silently treated as buses or trains. */
export function filterRegionalActiveTrips(trips,metadata,serviceDate,{routeTypes=null}={}) {
 if(!(trips instanceof Map)||!metadata||!/^[0-9]{8}$/.test(serviceDate))throw new Error('Invalid active regional service filter input');
 if(routeTypes!==null&&(!(routeTypes instanceof Set)||[...routeTypes].some(x=>!Number.isSafeInteger(x)||x<0)))throw new Error('Invalid GTFS route type selection');
 const year=Number(serviceDate.slice(0,4)),month=Number(serviceDate.slice(4,6)),day=Number(serviceDate.slice(6,8));
 const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('Invalid service date');
 const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 const weekday=weekdays[date.getUTCDay()];const filtered=new Map(),tripMetadata=new Map();let inactive=0,excluded=0,missing=0,unknown=0;
 const activeByType={};
 for(const [tripId,sequence] of trips){
  const trip=metadata.tripById.get(tripId);if(!trip){missing++;continue;}
  const type=metadata.routeTypes.get(trip.routeId);
  if(type===undefined){unknown++;if(routeTypes!==null){excluded++;continue;}}
  else if(routeTypes!==null&&!routeTypes.has(type)){excluded++;continue;}
  const exception=metadata.serviceExceptions.get(trip.serviceId)?.get(serviceDate);
  const calendar=metadata.serviceCalendars.get(trip.serviceId);
  const active=exception===1?true:exception===2?false:!!calendar&&serviceDate>=calendar.start_date&&serviceDate<=calendar.end_date&&calendar[weekday]==='1';
  if(active){filtered.set(tripId,sequence);const route=metadata.routeDetails?.get(trip.routeId)||{};tripMetadata.set(tripId,{routeShortName:route.routeShortName||null,routeLongName:route.routeLongName||null,tripHeadsign:trip.tripHeadsign||null,tripShortName:trip.tripShortName||null});const key=type===undefined?'unknown':String(type);activeByType[key]=(activeByType[key]||0)+1;}else inactive++;
 }
 return {trips:filtered,tripMetadata,serviceDate,activeTripCount:filtered.size,inactiveTripCount:inactive,excludedRouteTypeTripCount:excluded,missingMetadataTripCount:missing,unknownRouteTypeTripCount:unknown,activeByType};
}

/** Backwards-compatible rail-only filter; prefer filterRegionalActiveTrips for multimodal use. */
export function filterRegionalActiveRailTrips(trips,metadata,serviceDate) {
 const result=filterRegionalActiveTrips(trips,metadata,serviceDate,{routeTypes:new Set([2])});
 return {...result,railTripCount:result.activeTripCount,nonRailTripCount:result.excludedRouteTypeTripCount};
}
