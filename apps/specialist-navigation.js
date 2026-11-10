import { PortalVueHelp } from '../core/portal-help.js';
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
 const style=document.createElement('style');
 style.textContent=`
 #vuecore-navigation{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:12px 5%;background:#0b1720}
 #vuecore-navigation .vuecore-help-trigger,#vuecore-navigation .vuecore-home-link{display:inline-flex;align-items:center;justify-content:center;min-height:40px;background:#16b8b0!important;color:#06252b!important;border:1px solid #67eee2!important;border-radius:8px;padding:8px 14px;font:700 15px Arial,Helvetica,sans-serif;text-transform:uppercase;text-decoration:none;cursor:pointer}
 #vuecore-navigation .vuecore-help-trigger:hover,#vuecore-navigation .vuecore-home-link:hover{background:#55e1d3!important}
 #vuecore-navigation .vuecore-help-trigger:focus-visible,#vuecore-navigation .vuecore-home-link:focus-visible{outline:3px solid #f4cf72;outline-offset:3px}
 #vuecore-navigation .vuecore-help-panel{position:absolute;z-index:30;max-width:min(680px,90vw);margin-top:8px;padding:16px;background:#142630;color:#f4f7f8;border:1px solid #36525a;border-radius:12px;box-shadow:0 12px 30px #0008}
 #vuecore-navigation .vuecore-help-panel[hidden]{display:none}
 `;
 document.head.append(style);
}
