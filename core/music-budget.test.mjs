import test from 'node:test';
import assert from 'node:assert/strict';
import {musicBudget} from './music-budget.js';
const env={UPSTASH_REDIS_REST_URL:'https://example.upstash.io',UPSTASH_REDIS_REST_TOKEN:'test',MUSIC_DAILY_RECOGNITION_LIMIT:'2'};
test('music quota fails closed without Redis credentials',async()=>{
 assert.equal(await musicBudget({env:{},fetcher:async()=>{throw Error('must not call')}}),false);
});
test('music quota rejects invalid limits and insecure Redis endpoints',async()=>{
 assert.equal(await musicBudget({env:{...env,MUSIC_DAILY_RECOGNITION_LIMIT:'0'}}),false);
 assert.equal(await musicBudget({env:{...env,UPSTASH_REDIS_REST_URL:'http://example.upstash.io'}}),false);
});
test('music quota accepts atomic reservation within limit',async()=>{
 let request;
 const allowed=await musicBudget({env,now:new Date('2026-11-04T12:00:00Z'),fetcher:async(url,opts)=>{request={url,opts};return {ok:true,json:async()=>({result:2})}}});
 assert.equal(allowed,true);assert.equal(request.url,'https://example.upstash.io');
 assert.equal(request.opts.headers.Authorization,'Bearer test');
 assert.match(request.opts.body,/music:global:2026-11-04/);
});
test('music quota denies exhaustion, invalid responses and provider errors',async()=>{
 assert.equal(await musicBudget({env,fetcher:async()=>({ok:true,json:async()=>({result:3})})}),false);
 assert.equal(await musicBudget({env,fetcher:async()=>({ok:true,json:async()=>({result:'1'})})}),false);
 assert.equal(await musicBudget({env,fetcher:async()=>{throw Error('network')}}),false);
});
