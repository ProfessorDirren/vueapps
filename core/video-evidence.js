// VUECORE-only gate for future expert video requests. No upload or AI calls.
import {VIDEO_SAMPLE_COUNT} from './video-frames.js';
const IMAGE_PREFIX='data:image/jpeg;base64,';
export function prepareVideoEvidence(frames,{consent=false}={}){
 if(consent!==true)return {ok:false,reason:'consent_required'};
 if(!Array.isArray(frames)||frames.length!==VIDEO_SAMPLE_COUNT)return {ok:false,reason:'invalid_frame_count'};
 let previous=-1;
 const images=[];
 for(const frame of frames){
  if(!frame||!Number.isFinite(frame.time)||frame.time<=previous||frame.time<0||frame.time>120)return {ok:false,reason:'invalid_frame_time'};
  if(typeof frame.image!=='string'||!frame.image.startsWith(IMAGE_PREFIX)||frame.image.length>700000||frame.image.length<IMAGE_PREFIX.length+16)return {ok:false,reason:'invalid_frame_image'};
  const payload=frame.image.slice(IMAGE_PREFIX.length);
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)||payload.length%4!==0)return {ok:false,reason:'invalid_frame_image'};
  // JPEG magic bytes must be present; syntactically valid base64 alone is insufficient.
  const header=payload.slice(0,8);
  if(!header.startsWith('/9j/'))return {ok:false,reason:'invalid_frame_image'};
  previous=frame.time;
  images.push(frame.image);
 }
 return {ok:true,images};
}
