import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDisruptions,queryDisruptions} from './commutvue-disruptions.js';
test('global disruption adapter accepts verified regional alert evidence',async()=>{
 const result=await queryDisruptions({provider:'paris',from:'A',to:'B',adapter:async()=>({sourceUrl:'https://example.org/alerts',updatedAt:'2026-11-11T18:00:00Z',alerts:[{id:'x',title:'Service interruption',type:'suspension',status:'active',affectedLines:['RER A']}]})});
 assert.equal(result.status,'verified');
 assert.equal(result.alerts[0].type,'suspension');
});
test('no adapter means unknown, never clear traffic',async()=>{
 assert.equal((await queryDisruptions({provider:'stockholm'})).status,'unknown');
});
test('provider errors fail closed without leaking secrets',async()=>{
 const result=await queryDisruptions({provider:'santiago',adapter:async()=>{throw Error('secret token')}});
 assert.deepEqual(result,{status:'unavailable',provider:'santiago',alerts:[]});
});
test('rejects unverified alerts and insecure evidence URLs',()=>{
 assert.throws(()=>normalizeDisruptions({provider:'paris',sourceUrl:'http://example.org',updatedAt:'2026-11-11T18:00:00Z',alerts:[]}));
 assert.throws(()=>normalizeDisruptions({provider:'paris',sourceUrl:'https://example.org',updatedAt:'2026-11-11T18:00:00Z',alerts:[{id:'x',title:'A',type:'invented',status:'active',affectedLines:[]}]}));
});
