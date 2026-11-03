import { PortalVueHelp } from '../core/portal-help.js';
import { mountVueHelp } from './help-renderer.js';

const picker = document.getElementById('language');
mountVueHelp({
  host: document.getElementById('vuecore-help'),
  help: new PortalVueHelp(),
  language: () => picker?.value ?? 'en',
  languageControl: picker,
});
