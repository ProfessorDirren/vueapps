import { AnyVueHelp } from '../core/anyvue-help.js';
import { mountVueHelp } from './help-renderer.js';

const getLanguage = () => {
  try { return sessionStorage.getItem('vue-language') || 'en'; }
  catch { return 'en'; }
};
mountVueHelp({
  host: document.getElementById('anyvue-help'),
  help: new AnyVueHelp(),
  language: getLanguage,
});
