// VUECORE-owned, provider-independent video policy.
// Specialists inherit this contract; no provider calls or uploads are performed here.
export const VIDEO_POLICY=Object.freeze({
 maxBytes:50*1024*1024,
 acceptedMimeTypes:Object.freeze(['video/mp4','video/webm','video/quicktime']),
 analysisEnabled:false,
 uploadEnabled:false,
 maxSampleFrames:0
});
export function videoAnalysisDecision({file,consent=false}={}){
 if(!file)return {allowed:false,reason:'missing_video'};
 if(!VIDEO_POLICY.acceptedMimeTypes.includes(file.type))return {allowed:false,reason:'unsupported_type'};
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>VIDEO_POLICY.maxBytes)return {allowed:false,reason:'invalid_size'};
 if(consent!==true)return {allowed:false,reason:'consent_required'};
 // Explicit fail-closed: enabling video requires a separately reviewed implementation.
 return {allowed:false,reason:'analysis_disabled'};
}
