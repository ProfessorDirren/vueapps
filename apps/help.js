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
  home.textContent = 'HOME';
  home.setAttribute('aria-label', 'Home');
  helpHost.querySelector('.vuecore-help-trigger')?.after(home);
}
