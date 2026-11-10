/**
 * VUECORE shared photo-to-evidence boundary.
 * A photo is untrusted input, not a live-data source. Specialists supply
 * a domain-specific extractor; CORE validates and isolates the result.
 */
export function createPhotoEvidencePipeline({extract,validate}){
 if(typeof extract!=='function'||typeof validate!=='function')throw new TypeError('Photo evidence pipeline requires extraction and validation');
 return Object.freeze({
  async analyze({image,question='',language='en'}={}){
   if(typeof image!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,/.test(image))return {status:'invalid_image',verified:false};
   try{
    const evidence=await extract({image,question,language});
    if(!validate(evidence))return {status:'needs_clarification',verified:false};
    return {status:'extracted_unverified',verified:false,evidence};
   }catch{return {status:'unavailable',verified:false};}
  }
 });
}
