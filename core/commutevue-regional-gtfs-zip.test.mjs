import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRegionalGTFSZip,inspectRegionalGTFSZip,parseRegionalGTFSStopsZip} from './commutevue-regional-gtfs-zip.js';
function storedZip(name,text){
 const filename=Buffer.from(name),data=Buffer.from(text);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);
 const offset=local.length+filename.length+data.length;
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([local,filename,data,central,filename,end]);
}
test('reads ordered stops from stored regional GTFS ZIP',()=>{
 const zip=storedZip('stop_times.txt','trip_id,stop_id,stop_sequence\nt1,StockholmCity,2\nt1,Jordbro,1\n');
 assert.deepEqual(parseRegionalGTFSZip(zip).get('t1'),['Jordbro','StockholmCity']);
});
test('rejects archive without stop_times',()=>assert.throws(()=>parseRegionalGTFSZip(storedZip('trips.txt','abc'))));
test('rejects truncated archive',()=>assert.throws(()=>parseRegionalGTFSZip(Buffer.from([1,2,3]))));
test('rejects oversized archive',()=>assert.throws(()=>parseRegionalGTFSZip(new Uint8Array(45*1024*1024+1))));

test('offline explicit archive limit is bounded and runtime default unchanged',()=>{
 const zip=storedZip('stop_times.txt','trip_id,stop_id,stop_sequence\nt1,Jordbro,1\n');
 assert.deepEqual(parseRegionalGTFSZip(zip,{maxArchiveBytes:80*1024*1024}).get('t1'),['Jordbro']);
 assert.throws(()=>parseRegionalGTFSZip(zip,{maxArchiveBytes:81*1024*1024}));
 assert.throws(()=>parseRegionalGTFSZip(zip,{maxArchiveBytes:1}));
});

test('preflight reports compressed and uncompressed stop_times sizes',()=>{
 const zip=storedZip('stop_times.txt','trip_id,stop_id,stop_sequence\nt1,Jordbro,1\n');
 const metadata=inspectRegionalGTFSZip(zip);
 assert.equal(metadata.archiveBytes,zip.length);
 assert.equal(metadata.compressedBytes,metadata.uncompressedBytes);
 assert.equal(metadata.name,'stop_times.txt');
});

test('preflight reports oversized uncompressed entry but extraction refuses it',()=>{
 const zip=storedZip('stop_times.txt','trip_id,stop_id,stop_sequence\nt1,Jordbro,1\n');
 const central=zip.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 zip.writeUInt32LE(257*1024*1024,central+24);
 const metadata=inspectRegionalGTFSZip(zip);
 assert.equal(metadata.uncompressedBytes,257*1024*1024);
 assert.throws(()=>parseRegionalGTFSZip(zip),/safe decompression limit/);
});

test('extracts only matching station names from regional stops.txt',()=>{
 const zip=storedZip('stops.txt','stop_id,stop_name\n100,Jordbro\n200,Stockholm City\n300,Handen\n');
 assert.deepEqual(parseRegionalGTFSStopsZip(zip),[
  {stopId:'100',stopName:'Jordbro',parentStation:'',locationType:''},
  {stopId:'200',stopName:'Stockholm City',parentStation:'',locationType:''}
 ]);
});

test('extracts scheduled arrival and departure times from GTFS ZIP',()=>{
 const zip=storedZip('stop_times.txt','trip_id,arrival_time,departure_time,stop_id,stop_sequence\\nt1,08:01:00,08:02:00,J1,1\\nt1,08:25:00,08:25:00,C1,9\\n');
 assert.deepEqual(parseRegionalGTFSZip(zip,{includeTimes:true}).get('t1'),[
  {stop:'J1',arrivalTime:'08:01:00',departureTime:'08:02:00',sequence:1},
  {stop:'C1',arrivalTime:'08:25:00',departureTime:'08:25:00',sequence:9}
 ]);
});
