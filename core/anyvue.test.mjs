import test from "node:test";
import assert from "node:assert/strict";
import { POST, readiness } from "../api/anyvue.js";
const previous={ANYVUE_ENABLED:process.env.ANYVUE_ENABLED,ANYVUE_RATE_LIMIT_READY:process.env.ANYVUE_RATE_LIMIT_READY};
const request=(body)=>new Request("https://localhost/api/anyvue",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
test("disabled by default, no provider calls",async()=>{delete process.env.ANYVUE_ENABLED;const r=await POST(request({question:"hello"}));assert.equal(r.status,503)});
test("requires provider configuration before spending",async()=>{process.env.ANYVUE_ENABLED="true";delete process.env.OPENAI_API_KEY;const r=await POST(request({question:"hello"}));assert.equal(r.status,503)});
test("rejects invalid prompt before provider calls",async()=>{process.env.ANYVUE_ENABLED="true";process.env.ANYVUE_RATE_LIMIT_READY="true";const r=await POST(request({question:"x"}));assert.equal(r.status,400)});
test("rejects oversized JSON payload",async()=>{const r=await POST(request({question:"x".repeat(10000)}));assert.equal(r.status,413)});
test.after(()=>{for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v});

test("readiness reports disabled without exposing secrets",()=>{
 const status=readiness();assert.equal(typeof status.ready,"boolean");assert.equal(typeof status.providerCount,"number");assert.equal(JSON.stringify(status).includes("sk-"),false);
});
test("fails closed if Redis budget protection is absent",async()=>{
 const keys=["ANYVUE_ENABLED","OPENAI_API_KEY","ANTHROPIC_API_KEY","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.ANYVUE_ENABLED="true";process.env.OPENAI_API_KEY="fake";process.env.ANTHROPIC_API_KEY="fake";
  delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const r=await POST(request({question:"What is ANYVUE?"}));assert.equal(r.status,429);
 }finally{for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v}
});
