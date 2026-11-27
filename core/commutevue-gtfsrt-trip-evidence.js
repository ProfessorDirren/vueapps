/**
 * Decode GTFS-RT TripUpdate stop events, without treating them as route proof.
 * Caller must join trip_id and stop_id against the SAME regional static GTFS.
 */
import {inspectGTFSRealtimeFeed,GTFSRealtimeDecodeError} from './commutevue-gtfsrt-inspect.js';
const decoder=new TextDecoder('utf-8',{fatal:true});
function readFields(bytes,start=0,end=bytes.length){
 const fields=[];let pos=start;
 function varint(){let n=0n;for(let i=0;i<10;i++){if(pos>=end)throw new GTFSRealtimeDecodeError();const b=bytes[pos++];if(i===9&&b>1)throw new GTFSRealtimeDecodeError();n|=BigInt(b&127)<<BigInt(7*i);if(!(b&128))return n;}throw new GTFSRealtimeDecodeError();}
 while(pos<end){const tag=Number(varint()),number=Math.floor(tag/8),wire=tag%8;if(!number||fields.length>100000)throw new GTFSRealtimeDecodeError();if(wire===0){fields.push({number,wire,value:varint()});continue;}if(wire===1||wire===5){pos+=wire===1?8:4;if(pos>end)throw new GTFSRealtimeDecodeError();continue;}if(wire!==2)throw new GTFSRealtimeDecodeError();const length=Number(varint());if(!Number.isSafeInteger(length)||length>end-pos)throw new GTFSRealtimeDecodeError();fields.push({number,wire,start:pos,end:pos+length});pos+=length;}
 return fields;
}
const children=(b,f)=>readFields(b,f.start,f.end);
const find=(f,n,w)=>f.find(x=>x.number===n&&x.wire===w);
const str=(b,f)=>f?decoder.decode(b.subarray(f.start,f.end)):null;
export function extractGTFSRealtimeTripEvidence(bytes,{maxTrips=20000,maxStops=100000}={}){
 inspectGTFSRealtimeFeed(bytes);
 if(!Number.isInteger(maxTrips)||maxTrips<1||maxTrips>20000||!Number.isInteger(maxStops)||maxStops<1||maxStops>100000)throw new GTFSRealtimeDecodeError();
 try{
  const header=find(readFields(bytes),1,2);const headerFields=header?children(bytes,header):[];const timestamp=find(headerFields,3,0);const timestampSeconds=timestamp?Number(timestamp.value):NaN;const feedTimestampMs=Number.isSafeInteger(timestampSeconds)&&timestampSeconds>0?timestampSeconds*1000:null;
  const trips=[];let stopCount=0;
  for(const entity of readFields(bytes).filter(f=>f.number===2&&f.wire===2)){
   const entityFields=children(bytes,entity);
   // GTFS-RT FeedEntity.is_deleted indicates a removed entity, even when
   // a stale TripUpdate payload is still present. Never surface it as live.
   const deleted=find(entityFields,2,0);
   if(deleted&&deleted.value!==0n)continue;
   const update=find(entityFields,3,2);if(!update)continue;
   const fields=children(bytes,update),descriptor=find(fields,1,2);
   if(!descriptor)continue;
   const descriptorFields=children(bytes,descriptor);
   const trip=str(bytes,find(descriptorFields,1,2));
   // GTFS-RT TripDescriptor.schedule_relationship: CANCELED=3, DELETED=7.
   // Never present cancelled/deleted services as live departures.
   const relationship=find(descriptorFields,4,0);
   if(relationship&&(relationship.value===3n||relationship.value===7n))continue;
   if(!trip||trip.length>200)continue;
   const stops=[];
   for(const entry of fields.filter(f=>f.number===2&&f.wire===2)){
    if(++stopCount>maxStops)throw new GTFSRealtimeDecodeError();
    const stopFields=children(bytes,entry),stopId=str(bytes,find(stopFields,4,2));
    // GTFS-RT StopTimeUpdate.schedule_relationship: SKIPPED=1, NO_DATA=2.
    const stopRelationship=find(stopFields,5,0);
    if(stopRelationship&&(stopRelationship.value===1n||stopRelationship.value===2n))continue;
    const sequence=find(stopFields,1,0);
    if(sequence&&sequence.value>4294967295n)continue;
    const stopSequence=sequence?Number(sequence.value):null;
    if((!stopId&&stopSequence===null)||stopId?.length>200)continue;
    const event=kind=>{const f=find(stopFields,kind,2);if(!f)return null;const parts=children(bytes,f);const delay=find(parts,1,0),time=find(parts,2,0);return {delaySeconds:delay?Number(BigInt.asIntN(32,delay.value)):null,unixTime:time&&time.value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(time.value):null};};
    stops.push({stopId,...(stopSequence===null?{}:{stopSequence}),arrival:event(2),departure:event(3)});
   }
   if(trips.length>=maxTrips)throw new GTFSRealtimeDecodeError();
   trips.push({tripId:trip,stops});
  }
  return {status:'trip_evidence_unverified',feedTimestampMs,trips};
 }catch(error){if(error instanceof GTFSRealtimeDecodeError)throw error;throw new GTFSRealtimeDecodeError();}
}
