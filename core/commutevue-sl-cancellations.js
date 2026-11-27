import {stockholmWallClockToInstant} from './commutevue-stockholm-clock.js';

const blockhusuddenSite='https://transport.integration.sl.se/v1/sites/1420/departures?forecast=60';
const normalize=value=>typeof value==='string'?value.normalize('NFC').trim().toLocaleLowerCase('sv-SE'):'';

export async function addSlBusCancellations(departures,{from,mode,fetcher=fetch}={}){
 // SL site 1420 contains both the bus stop and the ferry berth.
 if(normalize(from)!=='blockhusudden'||mode!=='BUS'||!departures.some(row=>row.line==='67'))return departures;
 let rows;
 try{
  const response=await fetcher(blockhusuddenSite,{headers:{accept:'application/json'},signal:AbortSignal.timeout(2500)});
  if(!response.ok)return departures;
  const payload=await response.json();
  if(!Array.isArray(payload.departures)||payload.departures.length>250)return departures;
  rows=payload.departures;
 }catch{return departures;}
 return departures.map(departure=>{
  if(departure.line!=='67'||!normalize(departure.destination))return departure;
  const matches=rows.filter(row=>{
   if(row?.stop_area?.id!==11054||row.line?.transport_mode!=='BUS'||row.line.designation!==departure.line||
      stockholmWallClockToInstant(row.scheduled)!==departure.scheduled)return false;
   const destination=normalize(row.destination);
   const via=normalize(row.direction);
   return destination&&(normalize(departure.destination)===destination||
    (via&&normalize(departure.destination)===destination+' via '+via));
  });
  return matches.length===1&&matches[0].state==='CANCELLED'
   ?{...departure,cancelled:true,expected:null,cancellationSource:'SL Transport'}:departure;
 });
}
