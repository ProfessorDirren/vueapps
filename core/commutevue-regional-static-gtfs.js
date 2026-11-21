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
export function parseRegionalStopTimes(csv,{maxRows=2000000,maxTrips=100000}={}){
 if(typeof csv!=='string'||csv.length>256*1024*1024||!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>2000000||!Number.isSafeInteger(maxTrips)||maxTrips<1||maxTrips>100000)throw new Error('Invalid regional GTFS stop_times');
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/);
 const header=parseCSV(lines.shift()||'');
 const indexes=['trip_id','stop_id','stop_sequence'].map(name=>header.indexOf(name));
 if(indexes.some(i=>i<0)||new Set(indexes).size!==3)throw new Error('Missing GTFS stop_times fields');
 const records=new Map();let rows=0;
 for(const line of lines){
  if(!line.trim())continue;
  if(++rows>maxRows)throw new Error('GTFS stop_times row limit');
  const cells=parseCSV(line);
  const [trip,stop,sequence]=indexes.map(i=>cells[i]);
  const order=Number(sequence);
  if(!trip||!stop||!Number.isSafeInteger(order)||order<0)throw new Error('Invalid GTFS stop_times record');
  if(!records.has(trip)){if(records.size>=maxTrips)throw new Error('GTFS trip limit');records.set(trip,[]);}
  records.get(trip).push({stop,order});
 }
 const trips=new Map();
 for(const [trip,stops] of records){
  stops.sort((a,b)=>a.order-b.order);
  if(stops.length>300||stops.some((s,i)=>i>0&&s.order===stops[i-1].order))throw new Error('Invalid GTFS stop sequence');
  trips.set(trip,stops.map(s=>s.stop));
 }
 return trips;
}
