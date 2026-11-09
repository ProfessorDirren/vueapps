// Shared server-side gate for consented, bounded video evidence.
// The client-side check is not a security boundary.
import {prepareVideoEvidence} from './video-evidence.js';
import {validImage} from '../api/vue-followup.js';
export function validateVideoEvidence(value,{consent=false}={}){
 if(!Array.isArray(value))return {ok:false,reason:'invalid_frame_count'};
 const result=prepareVideoEvidence(value,{consent});
 if(!result.ok)return result;
 if(!result.images.every(validImage))return {ok:false,reason:'invalid_frame_image'};
 return {ok:true,images:result.images};
}
