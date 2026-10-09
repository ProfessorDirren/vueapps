import test from "node:test";
import assert from "node:assert/strict";
import { VueDomain, VueFlow, VueCoreError, validateMedia, normalizeAssessment } from "./index.js";
import { MotoVueDomain } from "./motovue.js";

test("validates image and video media limits",()=>{
 assert.equal(validateMedia({type:"image/jpeg",size:200},"image").ok,true);
 assert.equal(validateMedia({type:"image/gif",size:200},"image").code,"unsupported_type");
 assert.equal(validateMedia({type:"video/mp4",size:50*1024*1024+1},"video").code,"too_large");
 assert.equal(validateMedia({type:"image/png",size:0},"image").code,"empty_file");
});
test("normalizes assessments",()=>{
 assert.equal(normalizeAssessment({severity:"monitor",summary:" Check "}).summary,"Check");
 assert.throws(()=>normalizeAssessment({severity:"unknown",summary:"oops"}),VueCoreError);
});
test("domain must implement assessment",async()=>{
 const flow=new VueFlow(new VueDomain({id:"example"}));
 await assert.rejects(()=>flow.run(),/implement/);
});
test("emergency safety gate overrides domain assessment",async()=>{
 class Danger extends VueDomain {
  constructor(){super({id:"danger"})}
  emergencyCheck(){return {severity:"emergency",summary:"Stop"}}
  async assess(){throw Error("Must not run")}
 }
 const result=await new VueFlow(new Danger()).run();
 assert.equal(result.assessment.severity,"emergency");
 assert.equal(result.source,"safety-rule");
});
test("MOTOVUE brake problem is emergency",async()=>{
 const result=await new VueFlow(new MotoVueDomain()).run({category:"motorcycle",symptoms:["brakes"]});
 assert.equal(result.assessment.severity,"emergency");
 assert.equal(result.source,"safety-rule");
});
test("MOTOVUE no-start uses domain guidance",async()=>{
 const result=await new VueFlow(new MotoVueDomain()).run({category:"car",symptoms:["no-start"]});
 assert.equal(result.assessment.severity,"professional");
 assert.equal(result.source,"domain");
});
test("media never claims to have been analyzed",async()=>{
 const result=await new VueFlow(new MotoVueDomain()).run({symptoms:["other"],media:[{kind:"image",file:{type:"image/jpeg",size:500}}]});
 assert.equal(result.mediaAnalyzed,false);
 assert.match(result.assessment.limitations.join(" "),/NOT analyzed/);
});
test("invalid language and media rejected",async()=>{
 const flow=new VueFlow(new MotoVueDomain());
 await assert.rejects(()=>flow.run({language:"xx"}),/Unsupported language/);
 await assert.rejects(()=>flow.run({media:[{kind:"video",file:{type:"image/jpeg",size:10}}]}),/Unsupported file type/);
});
