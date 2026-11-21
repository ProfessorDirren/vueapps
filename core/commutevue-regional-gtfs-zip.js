/**
 * Extract bounded stop_times.txt from SL Regional GTFS ZIP.
 * Uses Node built-ins only. Does not download or cache GTFS itself.
 */
import {inflateRawSync} from 'node:zlib';
import {parseRegionalStopTimes} from './commutevue-regional-static-gtfs.js';
const MAX_ARCHIVE=45*1024*1024,MAX_UNCOMPRESSED=60*1024*1024;
export function parseRegionalGTFSZip(input){
 const bytes=input instanceof Uint8Array?input:null;
 if(!bytes||bytes.length<22||bytes.length>MAX_ARCHIVE)throw new Error('Invalid regional GTFS archive');
 const buffer=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 // End-of-central-directory signature may be followed by a ZIP comment.
 let end=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){
  if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}
 }
 if(end<0)throw new Error('Missing ZIP directory');
 const count=buffer.readUInt16LE(end+10),directorySize=buffer.readUInt32LE(end+12),directoryOffset=buffer.readUInt32LE(end+16);
 if(!count||count>200||directoryOffset+directorySize>end)throw new Error('Invalid ZIP directory');
 let pos=directoryOffset;
 for(let n=0;n<count;n++){
  if(pos+46>end||buffer.readUInt32LE(pos)!==0x02014b50)throw new Error('Invalid ZIP entry');
  const flags=buffer.readUInt16LE(pos+8),method=buffer.readUInt16LE(pos+10),compressed=buffer.readUInt32LE(pos+20),uncompressed=buffer.readUInt32LE(pos+24),nameLen=buffer.readUInt16LE(pos+28),extraLen=buffer.readUInt16LE(pos+30),commentLen=buffer.readUInt16LE(pos+32),offset=buffer.readUInt32LE(pos+42);
  const next=pos+46+nameLen+extraLen+commentLen;
  if(next>end)throw new Error('Invalid ZIP metadata');
  const name=buffer.toString('utf8',pos+46,pos+46+nameLen);
  pos=next;
  if(name!=='stop_times.txt')continue;
  if(flags&1||![0,8].includes(method)||uncompressed>MAX_UNCOMPRESSED||compressed>MAX_ARCHIVE||offset+30>directoryOffset||buffer.readUInt32LE(offset)!==0x04034b50)throw new Error('Unsafe GTFS stop_times ZIP entry');
  const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
  if(start+compressed>directoryOffset)throw new Error('Invalid GTFS ZIP payload');
  const zipped=buffer.subarray(start,start+compressed);
  const decoded=method===0?zipped:inflateRawSync(zipped,{maxOutputLength:MAX_UNCOMPRESSED});
  if(decoded.length!==uncompressed)throw new Error('GTFS ZIP size mismatch');
  return parseRegionalStopTimes(decoded.toString('utf8'));
 }
 throw new Error('Regional GTFS stop_times.txt missing');
}
