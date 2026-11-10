import { PortalVueHelp } from './portal-help.js';
import { mountVueHelp } from './help-renderer.js';
// One VUECORE-owned navigation for every standalone specialist.
const anchor=document.querySelector('header')||document.querySelector('main');
if(anchor&&!document.getElementById('vuecore-navigation')){
 const nav=document.createElement('nav');
 nav.id='vuecore-navigation';nav.setAttribute('aria-label','VUECORE navigation');
 const host=document.getElementById('anyvue-help')||document.createElement('div');
 if(!host.id)host.id='vuecore-specialist-help';
 const home=document.createElement('a');home.href='./';home.textContent='HOME';home.className='vuecore-home-link';
 nav.append(host,home);
 if(anchor.tagName==='HEADER')anchor.insertAdjacentElement('afterend',nav);else anchor.prepend(nav);
 if(host.id!=='anyvue-help'){
  const picker=document.getElementById('language');
  mountVueHelp({host,help:new PortalVueHelp(),language:()=>picker?.value||document.documentElement.lang||'en',languageControl:picker});
 }
 const stylesheet=document.createElement('link');
 stylesheet.rel='stylesheet';stylesheet.href='./core/navigation.css';
 document.head.append(stylesheet);
}
