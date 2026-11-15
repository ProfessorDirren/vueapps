import {captureVideoFrames} from './video-frames.js';
import {prepareVideoEvidence} from './video-evidence.js';
import {videoAnalysisDecision} from './video-policy.js';

// One shared VUECORE entry point. No provider invocation or upload is permitted.
export async function prepareLocalVideoAssessment({video,file,consent=false,signal}={}){
 const decision=videoAnalysisDecision({file,consent});
 if(decision.reason!=='analysis_disabled')return {ok:false,reason:decision.reason};
 if(signal?.aborted)return {ok:false,reason:'aborted'};
 try{
  const frames=await captureVideoFrames(video,{file,consent,signal});
  if(signal?.aborted)return {ok:false,reason:'aborted'};
  const evidence=prepareVideoEvidence(frames,{consent});
  if(!evidence.ok)return {ok:false,reason:evidence.reason};
  // Deliberately return only a local preview summary, never image bytes.
  return {ok:true,frameCount:evidence.images.length,analysisEnabled:false,uploadEnabled:false};
 }catch(error){
  return {ok:false,reason:signal?.aborted?'aborted':'frame_extraction_failed'};
 }
}
