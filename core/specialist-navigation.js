import { PortalVueHelp } from './portal-help.js';
import { AnyVueHelp } from './anyvue-help.js';
import { mountVueHelp } from './help-renderer.js';
// One VUECORE-owned navigation for every standalone specialist.
const anchor=document.querySelector('header')||document.querySelector('main');
if(anchor&&!document.getElementById('vuecore-navigation')){
 const nav=document.createElement('nav');
 nav.id='vuecore-navigation';nav.setAttribute('aria-label','VUECORE navigation');
 const host=document.getElementById('anyvue-help')||document.createElement('div');
 if(!host.id)host.id='vuecore-specialist-help';
 nav.append(host);
 if(anchor.tagName==='HEADER')anchor.insertAdjacentElement('afterend',nav);else anchor.prepend(nav);
 const picker=document.getElementById('language');
 const getLanguage=()=>picker?.value||(()=>{try{return sessionStorage.getItem('vue-language')||'en'}catch{return 'en'}})();
 mountVueHelp({host,help:host.id==='anyvue-help'?new AnyVueHelp():new PortalVueHelp(),language:getLanguage,languageControl:picker,home:true});
 const stylesheet=document.createElement('link');
 stylesheet.rel='stylesheet';stylesheet.href='./core/navigation.css';
 document.head.append(stylesheet);
}
