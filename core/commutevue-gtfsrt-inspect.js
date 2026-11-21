/**
 * Minimal bounded GTFS-Realtime protobuf inspection for SL Regional.
 * Decodes only FeedHeader and TripUpdate identifiers; never proves route,
 * departure or delay without the corresponding regional static GTFS mapping.
 * https://gtfs.org/documentation/realtime/reference/
 */
const MAX_BYTES=8*1024*1024;
const MAX_ENTITIES=20000;
const decoder=new TextDecoder('utf-8',{fatal:true});
export class GTFSRealtimeDecodeError extends Error{
 constructor(){super('Invalid GTFS realtime protobuf');this.name='GTFSRealtimeDecodeError';}
}
function fields(bytes,start=0,end=bytes.length,depth=0){
 if(depth>5||end>bytes.length||start>end)throw new GTFSRealtimeDecodeError();
 const entries=[];let offset=start;
 const varint=()=>{let value=0,shift=0;for(let i=0;i<10;i++){if(offset>=end)throw new GTFSRealtimeDecodeError();const b=bytes[offset++];if(shift<49)value+=(b&127)*2**shift;if(!(b&128)){if(!Number.isSafeInteger(value))throw new GTFSRealtimeDecodeError();return value;}shift+=7;}throw new GTFSRealtimeDecodeError();};
 while(offset<end){
  const tag=varint(),number=Math.floor(tag/8),wire=tag%8;
  if(!number||number>536870911||entries.length>50000)throw new GTFSRealtimeDecodeError();
  if(wire===0){entries.push({number,wire,value:varint()});continue;}
  if(wire===1||wire===5){const length=wire===1?8:4;if(offset+length>end)throw new GTFSRealtimeDecodeError();offset+=length;continue;}
  if(wire!==2)throw new GTFSRealtimeDecodeError();
  const length=varint();if(length>end-offset)throw new GTFSRealtimeDecodeError();
  entries.push({number,wire,start:offset,end:offset+length});offset+=length;
 }
 return entries;
}
const nested=(bytes,entry)=>fields(bytes,entry.start,entry.end,1);
const string=(bytes,entry)=>decoder.decode(bytes.subarray(entry.start,entry.end));
export function inspectGTFSRealtimeFeed(input){
 const bytes=input instanceof Uint8Array?input:null;
 if(!bytes||!bytes.length||bytes.length>MAX_BYTES)throw new GTFSRealtimeDecodeError();
 try{
  const top=fields(bytes),headers=top.filter(f=>f.number===1&&f.wire===2),entities=top.filter(f=>f.number===2&&f.wire===2);
  if(headers.length!==1||entities.length>MAX_ENTITIES)throw new GTFSRealtimeDecodeError();
  const header=nested(bytes,headers[0]);
  const versions=header.filter(f=>f.number===1&&f.wire===2);
  if(versions.length!==1||!/^2\.\d+$/.test(string(bytes,versions[0])))throw new GTFSRealtimeDecodeError();
  let tripUpdateCount=0,vehicleCount=0,alertCount=0;
  for(const entity of entities){
   const e=nested(bytes,entity);
   if(e.filter(f=>f.number===1&&f.wire===2).length!==1)throw new GTFSRealtimeDecodeError();
   if(e.some(f=>f.number===3&&f.wire===2))tripUpdateCount++;
   if(e.some(f=>f.number===4&&f.wire===2))vehicleCount++;
   if(e.some(f=>f.number===5&&f.wire===2))alertCount++;
  }
  return Object.freeze({status:'decoded_unverified',entityCount:entities.length,tripUpdateCount,vehicleCount,alertCount});
 }catch(error){if(error instanceof GTFSRealtimeDecodeError)throw error;throw new GTFSRealtimeDecodeError();}
}
