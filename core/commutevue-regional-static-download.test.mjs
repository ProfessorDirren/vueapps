import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalStaticGTFSDownloader,RegionalStaticDownloadError} from './commutevue-regional-static-download.js';
const url='https://opendata.samtrafiken.se/gtfs/sl/sl.zip?key=example';
test('rejects untrusted download origins and plain HTTP',()=>{
 assert.throws(()=>createRegionalStaticGTFSDownloader({url:'https://example.com/sl.zip'}),TypeError);
 assert.throws(()=>createRegionalStaticGTFSDownloader({url:'http://opendata.samtrafiken.se/sl.zip'}),TypeError);
});
test('rejects unauthorized GTFS static download',async()=>{
 const download=createRegionalStaticGTFSDownloader({url,fetcher:async()=>({ok:false,status:403})});
 await assert.rejects(download(),e=>e instanceof RegionalStaticDownloadError&&e.reason==='authorization');
});
test('rejects oversized archive before body download',async()=>{
 const download=createRegionalStaticGTFSDownloader({url,fetcher:async()=>({ok:true,headers:{get:()=>String(50*1024*1024)}})});
 await assert.rejects(download(),e=>e instanceof RegionalStaticDownloadError&&e.reason==='oversized_archive');
});
test('does not trust a non-ZIP response',async()=>{
 const download=createRegionalStaticGTFSDownloader({url,fetcher:async()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer})});
 await assert.rejects(download(),e=>e instanceof RegionalStaticDownloadError&&e.reason==='non_zip_response');
});
