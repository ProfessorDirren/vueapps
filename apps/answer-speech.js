// VUECORE Voice 2.0: user-initiated playback of an existing specialist answer.
// No audio upload, paid API, or automatic speech. Browser voices vary by device.
import {speechLocale} from './push-to-talk.js';
const messages={
 en:['Listen to answer','Stop reading','Speech playback is unavailable on this device','No matching voice installed; using device default'],
 sv:['Lyssna på svaret','Stoppa uppläsning','Uppläsning stöds inte på enheten','Ingen passande röst installerad; använder enhetens standardröst'],
 es:['Escuchar respuesta','Detener lectura','La lectura en voz alta no está disponible','No hay voz compatible instalada; se usa la voz predeterminada'],
 'pt-BR':["Ouvir resposta", "Parar leitura", "Leitura em voz alta indisponível", "Nenhuma voz compatível instalada. Usando a voz padrão."],
 it:['Ascolta la risposta','Interrompi lettura','La lettura vocale non è disponibile','Nessuna voce adatta installata; uso la voce predefinita'],
 fr:['Écouter la réponse','Arrêter la lecture','Lecture vocale indisponible','Aucune voix adaptée ; voix par défaut'],
 el:['Ακρόαση απάντησης','Διακοπή ανάγνωσης','Η εκφώνηση δεν είναι διαθέσιμη','Δεν υπάρχει κατάλληλη φωνή'],
 tr:['Yanıtı dinle','Okumayı durdur','Sesli okuma kullanılamıyor','Uygun ses yok; varsayılan ses kullanılıyor'],
 fa:['شنیدن پاسخ','توقف خواندن','خواندن با صدا در دسترس نیست','صدای مناسب موجود نیست'],
 ar:['استمع إلى الإجابة','إيقاف القراءة','القراءة الصوتية غير متاحة','لا يوجد صوت مناسب'],
 ru:['Прослушать ответ','Остановить чтение','Озвучивание недоступно','Подходящий голос не установлен'],
 hi:['उत्तर सुनें','पढ़ना रोकें','आवाज़ में पढ़ना उपलब्ध नहीं है','उपयुक्त आवाज़ उपलब्ध नहीं है'],
 'zh-CN':['朗读回答','停止朗读','此设备不支持语音朗读','未找到匹配的语音']
};
export function speechVoiceForLanguage(voices,lang){
 const locale=speechLocale(lang).toLowerCase(),base=locale.split('-')[0];
 return (voices||[]).find(v=>v.lang?.toLowerCase()===locale)
   ||(voices||[]).find(v=>v.lang?.toLowerCase().split('-')[0]===base)
   ||null;
}
export function createAnswerSpeech({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){
 let current=null;
 const stop=()=>{
  const old=current;current=null;
  if(old){old.button.setAttribute('aria-pressed','false');old.button.textContent=old.words[0];}
  try{synth?.cancel();}catch{}
 };
 const attach=(article,answerElement,lang)=>{
  const words=messages[lang]||messages.en;
  const button=document.createElement('button');
  button.type='button';button.className='vue-answer-speak';button.textContent=words[0];
  button.setAttribute('aria-label',words[0]);button.setAttribute('aria-pressed','false');
  const note=document.createElement('span');note.className='vue-answer-speak-note';note.setAttribute('role','status');
  button.addEventListener('click',()=>{
   if(current?.button===button){stop();return;}
   stop();note.textContent='';
   if(!synth||!Utterance||typeof synth.speak!=='function'){note.textContent=words[2];return;}
   const text=answerElement.textContent?.trim();
   if(!text)return;
   const utterance=new Utterance(text);utterance.lang=speechLocale(lang);
   const voice=speechVoiceForLanguage(synth.getVoices?.()||[],lang);
   if(voice)utterance.voice=voice;
   else note.textContent=words[3];
   const session={button,words,utterance};current=session;
   button.textContent=words[1];button.setAttribute('aria-pressed','true');
   const done=()=>{if(current===session){current=null;button.textContent=words[0];button.setAttribute('aria-pressed','false');}};
   utterance.onend=done;utterance.onerror=done;
   try{synth.speak(utterance);}catch{done();note.textContent=words[2];}
  });
  article.append(button,note);
 };
 return {attach,stop};
}
