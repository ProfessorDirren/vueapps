/**
 * Decode GTFS-RT TripUpdate stop events, without treating them as route proof.
 * Caller must join trip_id and stop_id against the SAME regional static GTFS.
 */
import {inspectGTFSRealtimeFeed,GTFSRealtimeDecodeError} from './commutevue-gtfsrt-inspect.js';
const decoder=new TextDecoder('utf-8',{fatal:true});
function readFields(bytes,start=0,end=bytes.length){
 const fields=[];let pos=start;
 function varint(){let n=0;for(let i=0;i<9;i++){if(pos>=end)throw new GTFSRealtimeDecodeError();const b=bytes[pos++];n+=(b&127)*2**(7*i);if(!(b&128)){if(!Number.isSafeInteger(n))throw new GTFSRealtimeDecodeError();return n;}}throw new GTFSRealtimeDecodeError();}
 while(pos<end){const tag=varint(),number=Math.floor(tag/8),wire=tag%8;if(!number||fields.length>100000)throw new GTFSRealtimeDecodeError();if(wire===0){fields.push({number,wire,value:varint()});continue;}if(wire===1||wire===5){pos+=wire===1?8:4;if(pos>end)throw new GTFSRealtimeDecodeError();continue;}if(wire!==2)throw new GTFSRealtimeDecodeError();const length=varint();if(length>end-pos)throw new GTFSRealtimeDecodeError();fields.push({number,wire,start:pos,end:pos+length});pos+=length;}
 return fields;
}
const children=(b,f)=>readFields(b,f.start,f.end);
const find=(f,n,w)=>f.find(x=>x.number===n&&x.wire===w);
const str=(b,f)=>f?decoder.decode(b.subarray(f.start,f.end)):null;
export function extractGTFSRealtimeTripEvidence(bytes,{maxTrips=20000,maxStops=100000}={}){
 inspectGTFSRealtimeFeed(bytes);
 if(!Number.isInteger(maxTrips)||maxTrips<1||maxTrips>20000||!Number.isInteger(maxStops)||maxStops<1||maxStops>100000)throw new GTFSRealtimeDecodeError();
 try{
  const trips=[];let stopCount=0;
  for(const entity of readFields(bytes).filter(f=>f.number===2&&f.wire===2)){
   const update=find(children(bytes,entity),3,2);if(!update)continue;
   const fields=children(bytes,update),descriptor=find(fields,1,2);
   if(!descriptor)continue;
   const trip=str(bytes,find(children(bytes,descriptor),1,2));
   if(!trip||trip.length>200)continue;
   const stops=[];
   for(const entry of fields.filter(f=>f.number===2&&f.wire===2)){
    if(++stopCount>maxStops)throw new GTFSRealtimeDecodeError();
    const stopFields=children(bytes,entry),stopId=str(bytes,find(stopFields,4,2));
    if(!stopId||stopId.length>200)continue;
    const event=kind=>{const f=find(stopFields,kind,2);if(!f)return null;const parts=children(bytes,f);const delay=find(parts,1,0),time=find(parts,2,0);return {delaySeconds:delay?delay.value:null,unixTime:time?time.value:null};};
    stops.push({stopId,arrival:event(2),departure:event(3)});
   }
   if(trips.length>=maxTrips)throw new GTFSRealtimeDecodeError();
   trips.push({tripId:trip,stops});
  }
  return {status:'trip_evidence_unverified',trips};
 }catch(error){if(error instanceof GTFSRealtimeDecodeError)throw error;throw new GTFSRealtimeDecodeError();}
}
