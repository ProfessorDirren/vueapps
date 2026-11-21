/** Download SL Regional GTFS only in an explicit offline job, never per user request. */
import {writeFile,rename,unlink} from 'node:fs/promises';
import {inspectRegionalGTFSZip} from '../core/commutevue-regional-gtfs-zip.js';
const MAX_BYTES=80*1024*1024;
export async function downloadRegionalGTFS({key,outputPath,fetchImpl=fetch}={}){
 if(typeof key!=='string'||!key.trim()||typeof outputPath!=='string'||!outputPath.trim())throw new TypeError('GTFS key and output path required');
 const url=new URL('https://opendata.samtrafiken.se/gtfs/sl/sl.zip');
 url.searchParams.set('key',key);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 let tempPath;
 try{
  const response=await fetchImpl(url,{signal:controller.signal,redirect:'error',headers:{Accept:'application/zip'}});
  if(!response.ok)throw new Error('GTFS archive HTTP '+response.status);
  const length=Number(response.headers.get('content-length'));
  if(Number.isFinite(length)&&length>MAX_BYTES)throw new Error('GTFS archive exceeds 80 MiB');
  const chunks=[];let total=0;
  if(!response.body)throw new Error('GTFS archive has no body');
  for await(const chunk of response.body){
   total+=chunk.byteLength;
   if(total>MAX_BYTES)throw new Error('GTFS archive exceeds 80 MiB');
   chunks.push(chunk);
  }
  const archive=Buffer.concat(chunks,total);
  const metadata=inspectRegionalGTFSZip(archive,{maxArchiveBytes:MAX_BYTES});
  tempPath=outputPath+'.partial';
  await writeFile(tempPath,archive,{flag:'wx',mode:0o600});
  await rename(tempPath,outputPath);tempPath=undefined;
  return {archiveBytes:archive.length,stopTimesCompressedBytes:metadata.compressedBytes,stopTimesUncompressedBytes:metadata.uncompressedBytes,stopTimesWithinParserLimit:metadata.uncompressedBytes<=60*1024*1024};
 }finally{
  clearTimeout(timeout);
  if(tempPath)await unlink(tempPath).catch(()=>{});
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const outputPath=process.argv[2];
 downloadRegionalGTFS({key:process.env.TRAFIKLAB_REGIONAL_STATIC_KEY,outputPath}).then(result=>console.info(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
