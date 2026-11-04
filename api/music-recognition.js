import {identifyMusic,MUSIC_LIMIT_BYTES} from '../core/music-recognition.js';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request,{token=process.env.AUDD_API_TOKEN,fetcher=fetch}={}){
 if(!token)return json(503,{error:'Music recognition is not configured'});
 const declared=Number(request.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>MUSIC_LIMIT_BYTES+8192)return json(413,{error:'Clip too large'});
 let form;try{form=await request.formData()}catch{return json(400,{error:'Invalid upload'})}
 const clip=form.get('file');
 if(!clip||typeof clip.arrayBuffer!=='function')return json(400,{error:'Missing clip'});
 const result=await identifyMusic(clip,{token,fetcher,signal:AbortSignal.timeout(15000)});
 if(!result.ok)return json(result.error==='invalid_size'?413:result.error==='unsupported_type'?415:502,{error:result.error});
 return json(200,{match:result.match,specialist:'vinylvue'});
}
