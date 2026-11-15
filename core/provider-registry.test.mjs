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

test('CORE never invokes a provider adapter for missing station input',async()=>{
 let calls=0;
 const registry=createProviderRegistry({providers:{regionA:{}},normalize:x=>x});
 registry.register('regionA',async()=>{calls++;return {provider:'regionA',status:'ok'};});
 for(const [from,to] of [['   ','Stockholm City'],['Jordbro','   '],[null,'Stockholm City'],['Jordbro',undefined]]){
  const result=await registry.query({region:'regionA',from,to});
  assert.equal(result.status,'needs_stations');
  assert.deepEqual(result.departures,[]);
 }
 assert.equal(calls,0,'no paid or live provider calls should be made for invalid station input');
});

test('CORE fails closed when provider normalization rejects unverified evidence',async()=>{
 const registry=createProviderRegistry({providers:{regionA:{}},normalize:()=>{throw new TypeError('unverified journey evidence');}});
 registry.register('regionA',async()=>({provider:'regionA',status:'ok',departures:[{id:'unverified'}]}));
 const result=await registry.query({region:'regionA',from:'Jordbro',to:'Stockholm City'});
 assert.deepEqual(result,{status:'unavailable',provider:'regionA',departures:[]});
 assert.equal(JSON.stringify(result).includes('unverified journey evidence'),false);
});
