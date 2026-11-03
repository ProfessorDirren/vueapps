import { AnyVueHelp } from '../core/anyvue-help.js';
import { mountVueHelp } from './help-renderer.js';

const getLanguage = () => {
  try { return localStorage.getItem('vueapps-language-v2') || 'en'; }
  catch { return 'en'; }
};
mountVueHelp({
  host: document.getElementById('anyvue-help'),
  help: new AnyVueHelp(),
  language: getLanguage,
});
