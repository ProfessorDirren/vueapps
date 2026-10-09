import test from "node:test";
import assert from "node:assert/strict";
import { VueAnalysisAdapter, VueHttpAnalysisAdapter } from "./analysis.js";

const image = "data:image/png;base64,aGVsbG8=";
test("abstract AI adapter rejects unimplemented analysis",async()=>{
 await assert.rejects(()=>new VueAnalysisAdapter().analyze({}),/implement/);
});
test("AI adapter only allows same-origin /api routes",()=>{
 assert.throws(()=>new VueHttpAnalysisAdapter({endpoint:"https://example.com/api/analyze"}),/same-origin/);
 assert.throws(()=>new VueHttpAnalysisAdapter({endpoint:"//evil.com/api"}),/same-origin/);
});
test("video analysis cannot be silently simulated",async()=>{
 const adapter=new VueHttpAnalysisAdapter({endpoint:"/api/analyze-moto",fetchImpl:()=>{throw Error("Should not call")}});
 await assert.rejects(()=>adapter.analyze({video:"file"}),/not implemented/);
});
test("image analysis sends to server and returns structured payload",async()=>{
 let request;
 const adapter=new VueHttpAnalysisAdapter({endpoint:"/api/analyze-moto",fetchImpl:async (url,options)=>{
   request={url,options};return {ok:true,json:async()=>({summary:"Observed",severity:"monitor"})};
 }});
 const result=await adapter.analyze({image,category:"motorcycle",language:"sv"});
 assert.equal(request.url,"/api/analyze-moto");
 assert.equal(JSON.parse(request.options.body).category,"motorcycle");
 assert.equal(result.summary,"Observed");
});
test("API errors propagate without pretending success",async()=>{
 const adapter=new VueHttpAnalysisAdapter({endpoint:"/api/analyze-moto",fetchImpl:async()=>({ok:false,status:503})});
 await assert.rejects(()=>adapter.analyze({image}),/503/);
});
