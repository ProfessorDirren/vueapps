import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {downloadRegionalGTFS} from './commutevue-download-regional-gtfs.mjs';
import {inspectRegionalGTFSZip,parseRegionalGTFSZip} from '../core/commutevue-regional-gtfs-zip.js';
function archive(){
 const name=Buffer.from('stop_times.txt'),data=Buffer.from('trip_id,stop_id,stop_sequence\nt1,J,1\n');
 const compressed=deflateRawSync(data);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
 const offset=local.length+name.length+compressed.length;
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([local,name,compressed,central,name,end]);
}
test('offline downloader inspects archive and writes it privately',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'commutevue-'));
 try{
  const bytes=archive(),outputPath=join(dir,'sl.zip');
  const result=await downloadRegionalGTFS({key:'fake-test-key',outputPath,fetchImpl:async url=>{
   assert.equal(url.searchParams.get('key'),'fake-test-key');
   return new Response(bytes,{status:200,headers:{'content-length':String(bytes.length)}});
  }});
  assert.equal(result.archiveBytes,bytes.length);
  assert.equal(result.stopTimesWithinParserLimit,true);
  assert.deepEqual(await readFile(outputPath),bytes);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('offline downloader refuses oversized archive from content-length',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'commutevue-'));
 try{
  await assert.rejects(downloadRegionalGTFS({key:'fake-test-key',outputPath:join(dir,'sl.zip'),fetchImpl:async()=>new Response('x',{status:200,headers:{'content-length':String(81*1024*1024)}})}),/exceeds 80 MiB/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('ZIP inspector and parser accept a 57 MiB archive, above the old 45 MiB cap',()=>{
 const small=archive();
 const centralLength=46+Buffer.byteLength('stop_times.txt');
 const centralStart=small.length-22-centralLength;
 const padding=Buffer.alloc(57*1024*1024-small.length);
 const large=Buffer.concat([small.subarray(0,centralStart),padding,small.subarray(centralStart)]);
 // Central directory moves after padding; local stop_times offset stays unchanged.
 large.writeUInt32LE(centralStart+padding.length,large.length-22+16);
 const metadata=inspectRegionalGTFSZip(large);
 assert.equal(metadata.archiveBytes,57*1024*1024);
 assert.equal(metadata.name,'stop_times.txt');
 assert.deepEqual(parseRegionalGTFSZip(large).get('t1'),['J']);
});

test('GTFS ZIP parser ignores fake end-of-directory signatures inside ZIP comments',()=>{
 const base=archive();
 const fakeEnd=Buffer.alloc(22);
 fakeEnd.writeUInt32LE(0x06054b50);
 const withComment=Buffer.concat([base,fakeEnd]);
 withComment.writeUInt16LE(fakeEnd.length,base.length-2);
 assert.equal(inspectRegionalGTFSZip(withComment).name,'stop_times.txt');
 assert.deepEqual(parseRegionalGTFSZip(withComment).get('t1'),['J']);
});
