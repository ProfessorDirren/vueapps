import {MUSIC_LIMIT_BYTES,MUSIC_TYPES} from '../core/music-recognition.js';
const labels={
 en:['Identify song','Record 12 seconds','Choose audio/video','Ready to identify','Listening…','Identifying…','No matching song found','Music recognition is not configured yet','Recording is not available on this device','Clip must be audio/video and under 10 MB','Recognition unavailable. Try again.','Stop recording'],
 es:['Identificar canción','Grabar 12 segundos','Elegir audio/vídeo','Listo para identificar','Grabando…','Identificando…','No se encontró la canción','Reconocimiento musical aún no configurado','Grabación no disponible','Audio/vídeo de menos de 10 MB','Reconocimiento no disponible','Detener grabación'],
 sv:['Identifiera låt','Spela in 12 sekunder','Välj ljud/video','Redo att identifiera','Spelar in…','Identifierar…','Ingen låt hittades','Musikidentifiering är inte konfigurerad ännu','Inspelning stöds inte på enheten','Ljud/video måste vara under 10 MB','Identifiering misslyckades','Stoppa inspelning'],
 hi:['गीत पहचानें','12 सेकंड रिकॉर्ड करें','ऑडियो/वीडियो चुनें','पहचान के लिए तैयार','रिकॉर्डिंग…','पहचान जारी…','गीत नहीं मिला','संगीत पहचान अभी सेट नहीं है','रिकॉर्डिंग उपलब्ध नहीं','10 MB से कम ऑडियो/वीडियो चुनें','पहचान उपलब्ध नहीं','रिकॉर्डिंग रोकें'],
 'zh-CN':['识别歌曲','录制12秒','选择音频/视频','准备识别','录制中…','识别中…','未找到歌曲','音乐识别尚未配置','无法录音','请选择小于10MB的音视频','识别失败','停止录制'],
 ru:['Определить песню','Записать 12 секунд','Выбрать аудио/видео','Готово к распознаванию','Запись…','Распознавание…','Песня не найдена','Распознавание пока не настроено','Запись недоступна','Аудио/видео до 10 МБ','Распознавание недоступно','Остановить запись'],
 ar:['التعرف على الأغنية','سجّل 12 ثانية','اختر صوتًا أو فيديو','جاهز للتعرف','جارٍ التسجيل…','جارٍ التعرف…','لم يتم العثور على أغنية','خدمة التعرف غير مهيأة بعد','التسجيل غير متاح','اختر صوتًا أو فيديو أقل من 10 ميغابايت','التعرف غير متاح','إيقاف التسجيل']
};
export function mountMusicRecognition(host){
 if(!host)return;
 const root=document.createElement('section');root.id='vuecore-music';root.style.cssText='margin:20px 0;padding:14px;border:1px solid #527078;border-radius:12px';
 const heading=document.createElement('h3'),record=document.createElement('button'),pick=document.createElement('button'),file=document.createElement('input'),identify=document.createElement('button'),status=document.createElement('p'),result=document.createElement('p');
 file.type='file';file.accept='audio/*,video/*';file.hidden=true;status.setAttribute('role','status');result.setAttribute('aria-live','polite');
 for(const btn of [record,pick,identify]){btn.type='button';btn.style.cssText='margin:4px;padding:10px;border-radius:8px;cursor:pointer'}
 root.append(heading,record,pick,file,identify,status,result);host.append(root);
 let clip=null,recorder=null,stream=null,timeout=null,busy=false;
 const words=()=>labels[document.documentElement.lang]||labels.en;
 const render=()=>{const t=words();heading.textContent=t[0];record.textContent=recorder&&recorder.state==='recording'?t[11]:t[1];pick.textContent=t[2];identify.textContent=t[0];identify.disabled=!clip||busy;record.disabled=busy;pick.disabled=busy};
 const accept=f=>{if(!f||!MUSIC_TYPES.includes(f.type.toLowerCase())||f.size<1||f.size>MUSIC_LIMIT_BYTES){status.textContent=words()[9];clip=null}else{clip=f;status.textContent=words()[3]}result.textContent='';render()};
 pick.onclick=()=>file.click();file.onchange=()=>{accept(file.files?.[0]);file.value=''};
 record.onclick=async()=>{
 if(recorder&&recorder.state==='recording'){recorder.stop();return}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status.textContent=words()[8];return}
 try{
 stream=await navigator.mediaDevices.getUserMedia({audio:true});
 const mime=['audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('codec');
 const parts=[];recorder=new MediaRecorder(stream,{mimeType:mime});
 recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
 recorder.onstop=()=>{clearTimeout(timeout);stream?.getTracks().forEach(t=>t.stop());stream=null;const f=new File(parts,'song-clip.'+(mime==='audio/mp4'?'m4a':'webm'),{type:mime});recorder=null;accept(f)};
 recorder.start();status.textContent=words()[4];render();timeout=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop()},12000);
 }catch{stream?.getTracks().forEach(t=>t.stop());stream=null;status.textContent=words()[8];render()}
 };
 identify.onclick=async()=>{
 if(!clip||busy)return;busy=true;status.textContent=words()[5];result.textContent='';render();
 try{const form=new FormData();form.set('file',clip);const response=await fetch('/api/music-recognition',{method:'POST',body:form,signal:AbortSignal.timeout(20000)});const data=await response.json();if(response.status===503)status.textContent=words()[7];else if(!response.ok)status.textContent=words()[10];else if(!data.match)status.textContent=words()[6];else{status.textContent='VINYLVUE';result.textContent=[data.match.artist,data.match.title,data.match.album].filter(Boolean).join(' — ')}}catch{status.textContent=words()[10]}finally{busy=false;render()}
 };
 document.getElementById('language')?.addEventListener('change',render);
 render();
}
