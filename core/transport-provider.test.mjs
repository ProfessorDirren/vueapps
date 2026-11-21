import test from 'node:test';
import assert from 'node:assert/strict';
import {TransportProvider,AdapterTransportProvider} from './transport-provider.js';
import {createProviderRegistry} from './provider-registry.js';

test('one inherited contract supports Sweden SJ, SL and Chile independently',async()=>{
 class FixtureProvider extends TransportProvider{
  async queryJourney({from,to,mode}){return {status:'ok',departures:[{from,to,mode}]};}
 }
 const registry=createProviderRegistry({providers:{sj:{},sl:{},chile:{}},normalize:x=>x});
 const sj=new FixtureProvider({country:'SE',operator:'SJ',modes:['train']});
 const sl=new FixtureProvider({country:'SE',operator:'SL',modes:['bus','train','metro','ferry']});
 const chile=new FixtureProvider({country:'CL',operator:'Metro de Santiago',modes:['metro']});
 registry.register('sj',sj);registry.register('sl',sl);registry.register('chile',chile);
 for(const region of ['sj','sl','chile']){
  const result=await registry.query({region,from:' A ',to:' B '});
  assert.equal(result.status,'ok');assert.equal(result.provider,region);
  assert.equal(result.departures[0].from,'A');
 }
 assert.equal(sj.supports('bus'),false);
 assert.equal(sl.supports('ferry'),true);
 assert.equal(chile.supports('metro'),true);
 assert.equal((await sj.query({provider:'sj',from:'A',to:'B',mode:'bus'})).status,'unavailable');
});
test('adapter inheritance preserves existing registry region and fails closed',async()=>{
 const provider=new AdapterTransportProvider({country:'SE',operator:'SJ',modes:['train'],adapter:async input=>({provider:input.provider,status:'ok',departures:[{id:'1'}]})});
 const registry=createProviderRegistry({providers:{sweden_sj:{}},normalize:x=>x});
 registry.register('sweden_sj',provider);
 assert.equal((await registry.query({region:'sweden_sj',from:'A',to:'B'})).status,'ok');
 const broken=new AdapterTransportProvider({country:'CL',operator:'X',adapter:async()=>{throw Error('secret-key')}});
 registry.register('sweden_sj',broken);
 const result=await registry.query({region:'sweden_sj',from:'A',to:'B'});
 assert.equal(result.status,'unavailable');
 assert.equal(JSON.stringify(result).includes('secret-key'),false);
});
