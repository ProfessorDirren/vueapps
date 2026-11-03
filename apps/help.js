import { PortalVueHelp } from '../core/portal-help.js';

const help = new PortalVueHelp();
const picker = document.getElementById('language');
const host = document.getElementById('vuecore-help');
if (picker && host) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'vuecore-help-trigger';
  trigger.setAttribute('aria-controls', 'vuecore-help-panel');
  trigger.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('aside');
  panel.id = 'vuecore-help-panel';
  panel.className = 'vuecore-help-panel';
  panel.hidden = true;
  host.append(trigger, panel);

  function render() {
    const copy = help.getHelp(picker.value);
    trigger.textContent = copy.button;
    panel.setAttribute('lang', copy.language);
    panel.setAttribute('dir', copy.direction);
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
  }
  trigger.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute('aria-expanded', String(!panel.hidden));
  });
  picker.addEventListener('change', render);
  render();
}
