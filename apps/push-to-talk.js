// Shared VUECORE push-to-talk. Never sends a question automatically.
const locales={en:'en-US',sv:'sv-SE',es:'es-ES',hi:'hi-IN','zh-CN':'zh-CN',ru:'ru-RU',ar:'ar-SA',fr:'fr-FR',el:'el-GR',tr:'tr-TR',fa:'fa-IR',it:'it-IT'};
const labels={
 en:['Start speaking','Stop recording','Microphone off','Listening — press again to stop','Speech recognition unavailable in this browser','Microphone permission denied','Listening stopped by browser. Tap to try again'],
 sv:['Börja prata','Stoppa inspelning','Mikrofon av','Lyssnar – tryck igen för att stoppa','Taligenkänning stöds inte i webbläsaren','Mikrofonåtkomst nekad','Webbläsaren stoppade lyssningen. Tryck för att försöka igen'],
 es:['Empezar a hablar','Detener grabación','Micrófono apagado','Escuchando: pulsa otra vez para detener','El navegador no admite reconocimiento de voz','Permiso del micrófono denegado','El navegador detuvo la escucha. Pulsa para reintentar'],
 it:['Inizia a parlare','Interrompi registrazione','Microfono spento','In ascolto: premi di nuovo per fermare','Riconoscimento vocale non disponibile','Accesso al microfono negato','Il browser ha interrotto l’ascolto. Premi per riprovare']
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
 const t=()=>labels[picker.value]||labels.en;
 const render=(message)=>{button.textContent=active?'■ REC':'🎙 '+t()[0];button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?t()[1]:t()[0]);status.textContent=message||(active?t()[3]:t()[2]);brain.classList.toggle('vue-brain-recording',active);};
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
