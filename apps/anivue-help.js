import { AniVueHelp } from '../core/anivue-help.js';
import { mountVueHelp } from './help-renderer.js';

const picker = document.getElementById('language');
mountVueHelp({
  host: document.getElementById('anivue-help'),
  help: new AniVueHelp(),
  language: () => picker?.value ?? 'en',
  languageControl: picker,
});
