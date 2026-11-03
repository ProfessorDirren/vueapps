import { LANGUAGES, VueCoreError } from './index.js';

/**
 * Shared VUECORE help contract. Specialist VUEs extend this class and provide
 * their own domain-specific topics without copying language/fallback logic.
 * Presentation is framework-neutral (HTML, React, etc.).
 */
export class VueHelp {
  constructor({ id, translations, topics = {} }) {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id))
      throw new VueCoreError('invalid_help_id', 'Help domain id required');
    if (!translations || typeof translations.en?.title !== 'string' || !translations.en.title.trim())
      throw new VueCoreError('invalid_help_translation', 'English help title required');
    this.id = id;
    this.translations = translations;
    this.topics = topics;
  }

  getLanguage(language) {
    return LANGUAGES.includes(language) ? language : 'en';
  }

  getHelp(language = 'en') {
    const selected = this.getLanguage(language);
    const common = this.translations[selected] ?? this.translations.en;
    const specialized = this.topics[selected] ?? this.topics.en ?? [];
    if (!Array.isArray(specialized))
      throw new VueCoreError('invalid_help_topics', 'Help topics must be an array');
    return {
      id: this.id,
      language: selected,
      direction: selected === 'ar' ? 'rtl' : 'ltr',
      title: common.title,
      button: common.button ?? this.translations.en.button ?? 'Help',
      close: common.close ?? this.translations.en.close ?? 'Close',
      topics: specialized.map(topic => ({ title: topic.title, body: topic.body })),
    };
  }
}
