// Shared VUECORE push-to-talk. Never sends a question automatically.
const locales={en:'en-US',sv:'sv-SE',es:'es-ES',hi:'hi-IN','zh-CN':'zh-CN',ru:'ru-RU',ar:'ar-SA',fr:'fr-FR',el:'el-GR',tr:'tr-TR',fa:'fa-IR',it:'it-IT'};
export const SPEECH_LABELS={
 en:['Start speaking','Stop recording','Microphone off','Listening — press again to stop','Speech recognition unavailable in this browser','Microphone permission denied','Listening stopped by browser. Tap to try again'],
 sv:['Börja prata','Stoppa inspelning','Mikrofon av','Lyssnar – tryck igen för att stoppa','Taligenkänning stöds inte i webbläsaren','Mikrofonåtkomst nekad','Webbläsaren stoppade lyssningen. Tryck för att försöka igen'],
 es:['Empezar a hablar','Detener grabación','Micrófono apagado','Escuchando: pulsa otra vez para detener','El navegador no admite reconocimiento de voz','Permiso del micrófono denegado','El navegador detuvo la escucha. Pulsa para reintentar'],
 it:['Inizia a parlare','Interrompi registrazione','Microfono spento','In ascolto: premi di nuovo per fermare','Riconoscimento vocale non disponibile','Accesso al microfono negato','Il browser ha interrotto l’ascolto. Premi per riprovare'],
"fr":["Commencer à parler","Arrêter l’enregistrement","Microphone désactivé","Écoute en cours — appuyez pour arrêter","Reconnaissance vocale indisponible dans ce navigateur","Accès au microphone refusé","Écoute interrompue. Appuyez pour réessayer"],
"tr":["Konuşmaya başla","Kaydı durdur","Mikrofon kapalı","Dinleniyor — durdurmak için tekrar dokunun","Bu tarayıcıda konuşma tanıma kullanılamıyor","Mikrofon izni reddedildi","Dinleme durdu. Tekrar deneyin"],
"el":["Έναρξη ομιλίας","Διακοπή εγγραφής","Μικρόφωνο απενεργοποιημένο","Ακρόαση — πατήστε ξανά για διακοπή","Η αναγνώριση ομιλίας δεν υποστηρίζεται","Δεν επιτρέπεται η πρόσβαση στο μικρόφωνο","Η ακρόαση διακόπηκε. Δοκιμάστε ξανά"],
"fa":["شروع صحبت","توقف ضبط","میکروفون خاموش","در حال شنیدن — برای توقف دوباره بزنید","تشخیص گفتار در این مرورگر در دسترس نیست","دسترسی به میکروفون رد شد","شنیدن متوقف شد. دوباره تلاش کنید"],
"ar":["ابدأ التحدث","إيقاف التسجيل","الميكروفون مغلق","جارٍ الاستماع — اضغط مرة أخرى للإيقاف","التعرف على الكلام غير متاح في هذا المتصفح","تم رفض إذن الميكروفون","توقف الاستماع. اضغط لإعادة المحاولة"],
"ru":["Начать говорить","Остановить запись","Микрофон выключен","Прослушивание — нажмите ещё раз для остановки","Распознавание речи недоступно в этом браузере","Доступ к микрофону запрещён","Прослушивание остановлено. Повторите попытку"],
"hi":["बोलना शुरू करें","रिकॉर्डिंग रोकें","माइक्रोफ़ोन बंद","सुन रहा है — रोकने के लिए फिर दबाएँ","इस ब्राउज़र में वाक् पहचान उपलब्ध नहीं है","माइक्रोफ़ोन की अनुमति नहीं मिली","सुनना बंद हो गया। फिर प्रयास करें"],
"zh-CN":["开始说话","停止录音","麦克风已关闭","正在聆听 — 再按一次停止","此浏览器不支持语音识别","麦克风权限被拒绝","聆听已停止。点击重试"]
};
export function speechLocale(lang){return locales[lang]||locales.en;}
export function initPushToTalk({documentRef=document,Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,autoSubmit=false}={}){
 const button=documentRef.getElementById('vue-router-mic');
 const status=documentRef.getElementById('vue-router-mic-status');
 const input=documentRef.getElementById('vue-router-question');
 const picker=documentRef.getElementById('language');
 const brain=documentRef.querySelector('.vue-brain');
 if(!button||!status||!input||!picker||!brain)return;
 let recognition=null,active=false,finalText='',baseText='',submitWhenEnded=false;
 const t=()=>SPEECH_LABELS[picker.value]||SPEECH_LABELS.en;
 const render=(message)=>{button.textContent=active?'■ '+t()[1]:'🎙 '+t()[0];button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?t()[1]:t()[0]);status.textContent=message||(active?t()[3]:t()[2]);brain.classList.toggle('vue-brain-recording',active);};
 const stop=()=>{active=false;submitWhenEnded=autoSubmit&&!!finalText.trim();try{recognition?.stop();}catch{}render();};
 button.addEventListener('click',()=>{
  if(active){stop();return;}
  if(!Recognition){render(t()[4]);return;}
  recognition=new Recognition();
  recognition.lang=speechLocale(picker.value);
  recognition.continuous=true;
  recognition.interimResults=true;
  finalText='';baseText=input.value.trim();submitWhenEnded=false;
  recognition.onresult=(event)=>{
   let interim='';
   for(let i=event.resultIndex;i<event.results.length;i++){
    const phrase=event.results[i][0]?.transcript||'';
    if(event.results[i].isFinal)finalText+=(finalText?' ':'')+phrase.trim();
    else interim+=(interim?' ':'')+phrase.trim();
   }
   const spoken=[finalText,interim].filter(Boolean).join(' ');
   input.value=[baseText,spoken].filter(Boolean).join(baseText&&spoken?' ':'');
   input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  recognition.onerror=(event)=>{
   if(event.error==='not-allowed'||event.error==='service-not-allowed'){active=false;submitWhenEnded=false;render(t()[5]);}
   else if(event.error!=='no-speech'){active=false;submitWhenEnded=false;render(t()[6]);}
  };
  recognition.onend=()=>{
   if(active){active=false;submitWhenEnded=autoSubmit&&!!finalText.trim();render();}
   else render();
   if(submitWhenEnded){submitWhenEnded=false;documentRef.getElementById('vue-router-send')?.click();}
  };
  try{recognition.start();active=true;render();}catch{active=false;render(t()[4]);}
 });
 picker.addEventListener('change',()=>{if(active)stop();else render();});
 documentRef.addEventListener('visibilitychange',()=>{if(documentRef.hidden&&active)stop();});
 render();
}
