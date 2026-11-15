import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderRegistry} from './provider-registry.js';
test('CORE provider registry is reusable by unrelated specialists',async()=>{
 const registry=createProviderRegistry({providers:{regionA:{},regionB:{}},normalize:raw=>raw});
 assert.deepEqual(registry.supported,['regionA','regionB']);
 assert.equal((await registry.query({region:'regionA',from:'A',to:'B'})).status,'unavailable');
 registry.register('regionA',async args=>({provider:args.provider,status:'ok',from:args.from,to:args.to}));
 assert.deepEqual(await registry.query({region:'regionA',from:' A ',to:' B '}),{provider:'regionA',status:'ok',from:'A',to:'B'});
});
test('CORE never leaks failures or accepts unregistered provider output',async()=>{
 const registry=createProviderRegistry({providers:{regionA:{}},normalize:raw=>raw});
 assert.equal((await registry.query({region:'regionA',from:'',to:'B'})).status,'needs_stations');
 assert.throws(()=>registry.register('unknown',async()=>{}));
 registry.register('regionA',async()=>({provider:'regionB',status:'ok'}));
 assert.equal((await registry.query({region:'regionA',from:'A',to:'B'})).status,'unavailable');
 registry.register('regionA',async()=>{throw Error('private upstream error')});
 const result=await registry.query({region:'regionA',from:'A',to:'B'});
 assert.equal(result.status,'unavailable');
 assert.equal(JSON.stringify(result).includes('private upstream error'),false);
});

test('CORE rejects unknown and incomplete upstream statuses',async()=>{
 const registry=createProviderRegistry({providers:{regionA:{}},normalize:x=>x});
 for(const status of ['partial','pending','stale','error',undefined]){
  registry.register('regionA',async()=>({provider:'regionA',status}));
  assert.equal((await registry.query({region:'regionA',from:'A',to:'B'})).status,'unavailable');
 }
});
