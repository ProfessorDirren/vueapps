import {musicBudget} from '../core/music-budget.js';
import {identifyMusic,validateMusicClip,MUSIC_LIMIT_BYTES} from '../core/music-recognition.js';
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request,{token=process.env.AUDD_API_TOKEN,fetcher=fetch,budgetGate=musicBudget,enabled=process.env.MUSIC_RECOGNITION_ENABLED==='true'}={}){
 if(!enabled||!token)return json(503,{error:'Music recognition is not configured'});
 const declared=Number(request.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>MUSIC_LIMIT_BYTES+8192)return json(413,{error:'Clip too large'});
 let form;try{form=await request.formData()}catch{return json(400,{error:'Invalid upload'})}
 const clip=form.get('file');
 if(!clip||typeof clip.arrayBuffer!=='function')return json(400,{error:'Missing clip'});
 const valid=validateMusicClip(clip);
 if(!valid.ok)return json(valid.code==='invalid_size'?413:415,{error:valid.code});
 if(!(await budgetGate()))return json(429,{error:'Daily music recognition budget unavailable or exhausted'});
 const result=await identifyMusic(clip,{token,fetcher,signal:AbortSignal.timeout(15000)});
 if(!result.ok)return json(result.error==='invalid_size'?413:result.error==='unsupported_type'?415:502,{error:result.error});
 return json(200,{match:result.match,specialist:'vinylvue'});
}

export const config={api:{bodyParser:false}};
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 let bytes=0;const chunks=[];
 try{for await(const chunk of req){bytes+=chunk.length;if(bytes>MUSIC_LIMIT_BYTES+8192)return res.status(413).json({error:'Clip too large'});chunks.push(chunk)}}
 catch{return res.status(400).json({error:'Invalid upload'})}
 const request=new Request('https://localhost/api/music-recognition',{method:'POST',headers:{'content-type':req.headers['content-type']||''},body:Buffer.concat(chunks)});
 const response=await POST(request);return res.status(response.status).json(await response.json());
}
