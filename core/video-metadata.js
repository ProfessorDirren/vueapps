// VUECORE local video metadata validation. Never uploads or analyzes pixels.
export const MAX_VIDEO_DURATION_SECONDS=120;
export const MAX_VIDEO_DIMENSION=3840;
export function validateVideoMetadata({duration,videoWidth,videoHeight}={}){
 if(!Number.isFinite(duration)||duration<=0||duration>MAX_VIDEO_DURATION_SECONDS)return {ok:false,reason:'duration'};
 if(!Number.isSafeInteger(videoWidth)||!Number.isSafeInteger(videoHeight)||videoWidth<1||videoHeight<1||videoWidth>MAX_VIDEO_DIMENSION||videoHeight>MAX_VIDEO_DIMENSION)return {ok:false,reason:'dimensions'};
 return {ok:true,reason:'valid'};
}
export function probeVideoMetadata(video,{timeoutMs=10000}={}){
 return new Promise(resolve=>{
  if(!video||typeof video.addEventListener!=='function')return resolve({ok:false,reason:'unsupported'});
  let finished=false;
  const done=result=>{if(finished)return;finished=true;clearTimeout(timer);video.removeEventListener('loadedmetadata',loaded);video.removeEventListener('error',failed);resolve(result);};
  const loaded=()=>done(validateVideoMetadata(video));
  const failed=()=>done({ok:false,reason:'decode'});
  const timer=setTimeout(()=>done({ok:false,reason:'timeout'}),timeoutMs);
  video.addEventListener('loadedmetadata',loaded);video.addEventListener('error',failed);
  if(video.readyState>=1)loaded();
 });
}
