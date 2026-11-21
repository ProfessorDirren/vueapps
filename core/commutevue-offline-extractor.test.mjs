import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {extractOfflineRegionalStops} from '../scripts/commutevue-offline-gtfs.mjs';
function storedZip(name,text){
 const filename=Buffer.from(name),data=Buffer.from(text);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);
 const offset=local.length+filename.length+data.length;
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([local,filename,data,central,filename,end]);
}
test('offline extractor writes ordered trip-to-stops JSON from ZIP fixture',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'commutevue-gtfs-'));
 try{
  const input=join(dir,'sample.zip'),output=join(dir,'stops.json');
  await writeFile(input,storedZip('stop_times.txt','trip_id,stop_id,stop_sequence\nt2,StockholmCity,2\nt2,Jordbro,1\n'));
  const result=await extractOfflineRegionalStops(input,output);
  assert.equal(result.tripCount,1);
  const data=JSON.parse(await readFile(output,'utf8'));
  assert.deepEqual(data,{format:'commutevue-regional-trip-stops-v1',tripCount:1,trips:{t2:['Jordbro','StockholmCity']}});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('offline extractor rejects missing file and identical input/output',async()=>{
 await assert.rejects(extractOfflineRegionalStops('/missing-commutevue-gtfs.zip','/tmp/output.json'));
 await assert.rejects(extractOfflineRegionalStops('same.zip','same.zip'),TypeError);
});
