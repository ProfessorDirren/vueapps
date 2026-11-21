/**
 * Extract bounded stop_times.txt from SL Regional GTFS ZIP.
 * Uses Node built-ins only. Does not download or cache GTFS itself.
 */
import {inflateRawSync} from 'node:zlib';
import {parseRegionalStopTimes,parseRegionalStopNames} from './commutevue-regional-static-gtfs.js';
const MAX_ARCHIVE=80*1024*1024,MAX_UNCOMPRESSED=256*1024*1024;
export function inspectRegionalGTFSZip(input,{maxArchiveBytes=MAX_ARCHIVE}={}){
 if(!Number.isSafeInteger(maxArchiveBytes)||maxArchiveBytes<22||maxArchiveBytes>80*1024*1024)throw new Error('Invalid GTFS archive limit');
 const bytes=input instanceof Uint8Array?input:null;
 if(!bytes||bytes.length<22||bytes.length>maxArchiveBytes)throw new Error('Invalid regional GTFS archive');
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
  if(flags&1||![0,8].includes(method)||compressed>maxArchiveBytes||offset+30>directoryOffset||buffer.readUInt32LE(offset)!==0x04034b50)throw new Error('Unsafe GTFS stop_times ZIP entry');
  const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
  if(start+compressed>directoryOffset)throw new Error('Invalid GTFS ZIP payload');
  return {name,compressedBytes:compressed,uncompressedBytes:uncompressed,method,archiveBytes:bytes.length};
 }
 throw new Error('Regional GTFS stop_times.txt missing');
}
export function parseRegionalGTFSZip(input,{maxArchiveBytes=MAX_ARCHIVE}={}){
 const metadata=inspectRegionalGTFSZip(input,{maxArchiveBytes});
 if(metadata.uncompressedBytes>MAX_UNCOMPRESSED)throw new Error('GTFS stop_times exceeds safe decompression limit');
 const buffer=Buffer.from(input.buffer,input.byteOffset,input.byteLength);
 let end=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}}
 if(end<0)throw new Error('Missing ZIP directory');
 const directoryOffset=buffer.readUInt32LE(end+16),count=buffer.readUInt16LE(end+10);
 let pos=directoryOffset;
 for(let n=0;n<count;n++){
  const compressed=buffer.readUInt32LE(pos+20),nameLen=buffer.readUInt16LE(pos+28),extraLen=buffer.readUInt16LE(pos+30),commentLen=buffer.readUInt16LE(pos+32),offset=buffer.readUInt32LE(pos+42);
  const name=buffer.toString('utf8',pos+46,pos+46+nameLen);
  pos+=46+nameLen+extraLen+commentLen;
  if(name!=='stop_times.txt')continue;
  const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
  const zipped=buffer.subarray(start,start+compressed);
  const decoded=metadata.method===0?zipped:inflateRawSync(zipped,{maxOutputLength:MAX_UNCOMPRESSED});
  if(decoded.length!==metadata.uncompressedBytes)throw new Error('GTFS ZIP size mismatch');
  return parseRegionalStopTimes(decoded.toString('utf8'));
 }
 throw new Error('Regional GTFS stop_times.txt missing');
}


/** Extract only bounded stops.txt and return requested station-name matches. */
export function parseRegionalGTFSStopsZip(input,{maxArchiveBytes=MAX_ARCHIVE}={}){
 const bytes=input instanceof Uint8Array?input:null;
 if(!bytes||bytes.length<22||bytes.length>maxArchiveBytes)throw new Error('Invalid regional GTFS archive');
 const buffer=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}}
 if(end<0)throw new Error('Missing ZIP directory');
 const count=buffer.readUInt16LE(end+10),directoryOffset=buffer.readUInt32LE(end+16),directorySize=buffer.readUInt32LE(end+12);
 if(!count||count>200||directoryOffset+directorySize>end)throw new Error('Invalid ZIP directory');
 let pos=directoryOffset;
 for(let n=0;n<count;n++){
  if(pos+46>end||buffer.readUInt32LE(pos)!==0x02014b50)throw new Error('Invalid ZIP entry');
  const flags=buffer.readUInt16LE(pos+8),method=buffer.readUInt16LE(pos+10),compressed=buffer.readUInt32LE(pos+20),uncompressed=buffer.readUInt32LE(pos+24),nameLen=buffer.readUInt16LE(pos+28),extraLen=buffer.readUInt16LE(pos+30),commentLen=buffer.readUInt16LE(pos+32),offset=buffer.readUInt32LE(pos+42);
  const next=pos+46+nameLen+extraLen+commentLen;if(next>end)throw new Error('Invalid ZIP metadata');
  const name=buffer.toString('utf8',pos+46,pos+46+nameLen);pos=next;if(name!=='stops.txt')continue;
  if(flags&1||![0,8].includes(method)||compressed>maxArchiveBytes||uncompressed>32*1024*1024||offset+30>directoryOffset||buffer.readUInt32LE(offset)!==0x04034b50)throw new Error('Unsafe GTFS stops ZIP entry');
  const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);if(start+compressed>directoryOffset)throw new Error('Invalid GTFS ZIP payload');
  const zipped=buffer.subarray(start,start+compressed);const decoded=method===0?zipped:inflateRawSync(zipped,{maxOutputLength:32*1024*1024});
  if(decoded.length!==uncompressed)throw new Error('GTFS stops ZIP size mismatch');
  return parseRegionalStopNames(decoded.toString('utf8'));
 }
 throw new Error('Regional GTFS stops.txt missing');
}
