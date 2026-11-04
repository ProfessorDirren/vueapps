/** Shared VUECORE music recognition adapter. Provider credentials never leave the server. */
export const MUSIC_LIMIT_BYTES = 4 * 1024 * 1024;
export const MUSIC_TYPES = Object.freeze(['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/flac','video/mp4','video/webm','video/quicktime']);
export function validateMusicClip(file) {
 if (!file || !MUSIC_TYPES.includes((file.type||'').toLowerCase())) return {ok:false,code:'unsupported_type'};
 if (!Number.isSafeInteger(file.size)||file.size<1||file.size>MUSIC_LIMIT_BYTES) return {ok:false,code:'invalid_size'};
 return {ok:true};
}
export async function identifyMusic(file,{token,fetcher=fetch,signal}={}) {
 const check=validateMusicClip(file);
 if(!check.ok) return {ok:false,error:check.code};
 if(!token) return {ok:false,error:'not_configured'};
 const form=new FormData();
 form.set('api_token',token);
 form.set('file',file,'clip');
 let response;
 try{response=await fetcher('https://api.audd.io/',{method:'POST',body:form,signal});}
 catch{return {ok:false,error:'provider_unavailable'};}
 if(!response?.ok)return {ok:false,error:'provider_unavailable'};
 let payload;try{payload=await response.json()}catch{return {ok:false,error:'provider_unavailable'}}
 if(payload?.status!=='success')return {ok:false,error:'provider_unavailable'};
 if(payload.result===null)return {ok:true,match:null};
 const match=payload.result;
 if(!match||typeof match.artist!=='string'||typeof match.title!=='string'||!match.artist.trim()||!match.title.trim())return {ok:false,error:'invalid_provider_response'};
 return {ok:true,match:{artist:match.artist,title:match.title,album:typeof match.album==='string'?match.album:null,release_date:typeof match.release_date==='string'?match.release_date:null,song_link:typeof match.song_link==='string'&&/^https:\/\//.test(match.song_link)?match.song_link:null}};
}
