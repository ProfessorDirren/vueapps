/** Framework-neutral accessible renderer for all inherited VUECORE Help subclasses. */
export function mountVueHelp({ host, help, language = () => 'en', languageControl }) {
  if (!host || !help) return () => {};
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'vuecore-help-trigger';
  const panel = document.createElement('aside');
  const panelId = host.id ? host.id + '-panel' : 'vuecore-help-panel';
  panel.id = panelId;
  panel.className = 'vuecore-help-panel';
  panel.hidden = true;
  trigger.setAttribute('aria-controls', panelId);
  trigger.setAttribute('aria-expanded', 'false');
  host.append(trigger, panel);
  const render = () => {
    const copy = help.getHelp(language());
    trigger.textContent = copy.button;
    panel.lang = copy.language;
    panel.dir = copy.direction;
    panel.setAttribute('aria-label', copy.title);
    panel.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = copy.title;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = copy.close;
    close.addEventListener('click', () => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    });
    panel.append(heading, close);
    for (const topic of copy.topics) {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = topic.title;
      const body = document.createElement('p');
      body.textContent = topic.body;
      section.append(title, body);
      panel.append(section);
    }
  };
  trigger.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute('aria-expanded', String(!panel.hidden));
  });
  languageControl?.addEventListener('change', render);
  document.addEventListener?.('vueapps:languagechange', render);
  render();
  return () => {
    languageControl?.removeEventListener?.('change', render);
    document.removeEventListener?.('vueapps:languagechange', render);
  };
}
