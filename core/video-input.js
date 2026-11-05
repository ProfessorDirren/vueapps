import {probeVideoMetadata} from './video-metadata.js';
import {VIDEO_POLICY} from './video-policy.js';
// Shared VUECORE video input component; specialist UIs inherit this behavior.
// Privacy-first: files stay on the user's device. No backend video analysis is enabled.
export const VIDEO_LIMIT_BYTES=VIDEO_POLICY.maxBytes;
export const VIDEO_MIME_TYPES=VIDEO_POLICY.acceptedMimeTypes;
export const VIDEO_LABELS=Object.freeze({
 en:['Record a Video','Choose a Video','Remove video','Video preview only. AI video analysis is not yet available.','Choose an MP4, WebM or MOV video up to 50 MB.','Video selected for local preview. Video AI analysis is not yet supported.'],
 es:['Grabar un vídeo','Elegir un vídeo','Quitar vídeo','Solo vista previa. El análisis de vídeo con IA aún no está disponible.','Elige un vídeo MP4, WebM o MOV de hasta 50 MB.','Vídeo seleccionado para vista previa local. El análisis con IA aún no está disponible.'],
 sv:['Spela in video','Välj en video','Ta bort video','Endast förhandsvisning. AI-videoanalys är ännu inte tillgänglig.','Välj en MP4-, WebM- eller MOV-video på högst 50 MB.','Videon kan förhandsvisas lokalt. AI-videoanalys stöds ännu inte.'],
 hi:['वीडियो रिकॉर्ड करें','वीडियो चुनें','वीडियो हटाएँ','केवल पूर्वावलोकन। AI वीडियो विश्लेषण अभी उपलब्ध नहीं है।','50 MB तक MP4, WebM या MOV वीडियो चुनें।','स्थानीय पूर्वावलोकन के लिए वीडियो चुना गया। AI विश्लेषण अभी उपलब्ध नहीं है।'],
 'zh-CN':['录制视频','选择视频','移除视频','仅供预览，AI 视频分析尚不可用。','请选择不超过 50 MB 的 MP4、WebM 或 MOV 视频。','已选择视频供本地预览，暂不支持 AI 视频分析。'],
 ru:['Записать видео','Выбрать видео','Удалить видео','Только предпросмотр. Анализ видео с ИИ пока недоступен.','Выберите MP4, WebM или MOV до 50 МБ.','Видео выбрано для локального просмотра. Анализ ИИ пока недоступен.'],
 ar:['تسجيل فيديو','اختيار فيديو','إزالة الفيديو','معاينة فقط. تحليل الفيديو بالذكاء الاصطناعي غير متاح بعد.','اختر فيديو MP4 أو WebM أو MOV بحجم لا يتجاوز 50 ميغابايت.','تم اختيار الفيديو للمعاينة المحلية. تحليل الذكاء الاصطناعي غير متاح بعد.']
});
export function videoBlocksSubmission(videoSelected){return videoSelected===true;}
export function isValidVideo(file){return !!file&&VIDEO_MIME_TYPES.includes(file.type)&&Number.isSafeInteger(file.size)&&file.size>0&&file.size<=VIDEO_LIMIT_BYTES;}
export function mountVuecoreVideoInput({root=document,status=document.getElementById('vue-router-status'),isBusy=()=>false}={}){
 const get=id=>root.getElementById(id);
 const record=get('vue-router-video-record'),choose=get('vue-router-video-choose');
 if(!record||!choose)return ()=>{};
 const preview=get('vue-router-video-preview'),panel=get('vue-router-video-panel'),notice=get('vue-router-video-notice');
 const recordFile=get('vue-router-video-record-file'),chooseFile=get('vue-router-video-choose-file'),remove=get('vue-router-video-remove');
 let url=null,selection=0;
 const labels=()=>VIDEO_LABELS[root.documentElement?.lang]||VIDEO_LABELS.en;
 const translate=()=>{const l=labels();record.textContent=l[0];choose.textContent=l[1];remove.textContent=l[2];notice.textContent=l[3];};
 const clear=()=>{selection++;if(url){URL.revokeObjectURL(url);url=null;}preview.pause();preview.removeAttribute('src');preview.load();panel.hidden=true;recordFile.value='';chooseFile.value='';};
 const onChoose=async event=>{if(isBusy())return;const file=event.target.files?.[0];if(!file)return;if(!isValidVideo(file)){clear();status.textContent=labels()[4];return;}clear();url=URL.createObjectURL(file);preview.src=url;panel.hidden=false;status.textContent=labels()[5];const current=selection;const result=await probeVideoMetadata(preview);if(current!==selection)return;if(!result.ok){clear();status.textContent=labels()[4];}};
 const openRecord=()=>{if(!isBusy())recordFile.click();},openChoose=()=>{if(!isBusy())chooseFile.click();},onRemove=()=>{if(!isBusy())clear();};
 recordFile.addEventListener('change',onChoose);chooseFile.addEventListener('change',onChoose);
 record.addEventListener('click',openRecord);choose.addEventListener('click',openChoose);remove.addEventListener('click',onRemove);
 const observer=new MutationObserver(translate);observer.observe(root.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('pagehide',clear);translate();
 return ()=>{clear();observer.disconnect();window.removeEventListener('pagehide',clear);recordFile.removeEventListener('change',onChoose);chooseFile.removeEventListener('change',onChoose);record.removeEventListener('click',openRecord);choose.removeEventListener('click',openChoose);remove.removeEventListener('click',onRemove);};
}
