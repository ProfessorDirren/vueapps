import { PortalVueHelp } from '../core/portal-help.js';
import { mountVueHelp } from './help-renderer.js';

const picker = document.getElementById('language');
mountVueHelp({
  host: document.getElementById('vuecore-help'),
  help: new PortalVueHelp(),
  language: () => picker?.value ?? 'en',
  languageControl: picker,
});

const helpHost = document.getElementById('vuecore-help');
if (helpHost) {
  const home = document.createElement('a');
  home.href = './';
  home.className = 'vuecore-home-link';
  // Shared VUECORE navigation follows the same language lifecycle as HELP.
  const homeLabels = {
    en: 'HOME', sv: 'HEM', es: 'INICIO', fr: 'ACCUEIL',
    'pt-BR': 'INÍCIO', it: 'INIZIO', hi: 'होम', 'zh-CN': '首页', ru: 'ГЛАВНАЯ',
    ar: 'الرئيسية', el: 'ΑΡΧΙΚΗ', tr: 'ANA SAYFA', fa: 'خانه'
  };
  const renderHome = () => {
    const label = homeLabels[picker?.value] || homeLabels.en;
    home.textContent = label;
    home.setAttribute('aria-label', label);
    home.lang = picker?.value || 'en';
  };
  picker?.addEventListener('change', renderHome);
  document.addEventListener('vueapps:languagechange', renderHome);
  renderHome();
  helpHost.querySelector('.vuecore-help-trigger')?.after(home);
}
