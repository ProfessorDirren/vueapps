// Shared, provider-independent VUECORE frame schedule. No upload or AI calls.
// Sampling is intentionally bounded for the free-tier budget.
import {VIDEO_POLICY} from './video-policy.js';
import {validateVideoMetadata} from './video-metadata.js';
export const VIDEO_SAMPLE_COUNT=3;
export function videoSampleTimes(duration,count=VIDEO_SAMPLE_COUNT){
 if(!Number.isFinite(duration)||duration<=0||duration>120)throw new RangeError('Invalid video duration');
 if(!Number.isSafeInteger(count)||count<1||count>3)throw new RangeError('Invalid sample count');
 return Array.from({length:count},(_,i)=>Number((duration*(i+1)/(count+1)).toFixed(3)));
}
export async function captureVideoFrames(video,{count=VIDEO_SAMPLE_COUNT,signal,consent=false,file}={}){
 if(consent!==true)throw new Error('Video frame consent required');
 if(!file||!VIDEO_POLICY.acceptedMimeTypes.includes(file.type)||!Number.isSafeInteger(file.size)||file.size<1||file.size>VIDEO_POLICY.maxBytes)throw new Error('Invalid video file');
 if(signal?.aborted)throw new Error('Cancelled');
 const duration=video?.duration;
 const metadata=validateVideoMetadata({duration,videoWidth:video?.videoWidth,videoHeight:video?.videoHeight});
 if(!metadata.ok)throw new Error('Invalid video metadata: '+metadata.reason);
 const times=videoSampleTimes(duration,count);
 if(video.videoWidth<128||video.videoHeight<128)throw new Error('Invalid video dimensions');
 const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
 const canvas=document.createElement('canvas');
 canvas.width=Math.round(video.videoWidth*scale);
 canvas.height=Math.round(video.videoHeight*scale);
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas unavailable');
 const frames=[];
 let totalChars=0;
 for(const time of times){
  if(signal?.aborted)throw new Error('Cancelled');
  await new Promise((resolve,reject)=>{
   const cleanup=()=>{video.removeEventListener('seeked',done);video.removeEventListener('error',fail);signal?.removeEventListener('abort',fail);clearTimeout(timer)};
   const done=()=>{cleanup();resolve()};
   const fail=()=>{cleanup();reject(new Error('Frame unavailable'))};
   const timer=setTimeout(fail,8000);
   video.addEventListener('seeked',done,{once:true});
   video.addEventListener('error',fail,{once:true});
   signal?.addEventListener('abort',fail,{once:true});
   try{video.currentTime=time}catch(error){cleanup();reject(error)}
  });
  if(signal?.aborted)throw new Error('Cancelled');
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const frame=canvas.toDataURL('image/jpeg',0.65);
  totalChars+=frame.length;
  if(frame.length>700000||totalChars>1200000)throw new Error('Frame too large');
  frames.push({time,image:frame});
 }
 return frames;
}
