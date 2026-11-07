// Privacy-preserving portal and specialist event tracking. Public write-only project token.
(() => {
  if (!['vueapps.se', 'www.vueapps.se'].includes(location.hostname)) return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

  const specialist = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/,'').toUpperCase();
  const app = specialist === 'INDEX' ? 'VUEAPPS' : specialist;
  const actionIds = new Set(['analyze','observe','prepare','identify','review','ingredient-read','ingredient-scan','ingredient-research','go','again','send']);
  if (app !== 'VUEAPPS') document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button || !actionIds.has(button.id) || button.disabled) return;
    document.dispatchEvent(new CustomEvent('vueapps:analytics', {detail: {name:'specialist_action',specialist:app,action:button.id}}));
  }, true);
  // Observe only explicit first-party assessment endpoints; never inspect request bodies or responses.
  const assessmentEndpoints = new Set(['vue-router','antiqvue','vinylvue','musicgearvue','wardrobevue','medivue','foodvue','anivue','anyvue','motovue','estatevue','homevue','plantvue','armvue','slumpvue']);
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    let endpoint = '';
    try {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
        const segment = url.pathname.slice(5).split('/')[0];
        if (assessmentEndpoints.has(segment)) endpoint = segment;
      }
    } catch {}
    if (!endpoint) return nativeFetch(input, init);
    const method = String(init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    if (method !== 'POST') return nativeFetch(input, init);
    const label = endpoint === 'vue-router' ? 'VUECORE' : endpoint.toUpperCase();
    document.dispatchEvent(new CustomEvent('vueapps:analytics', {detail:{name:'assessment_started',specialist:label}}));
    return nativeFetch(input, init).then(response => {
      if (response.ok) document.dispatchEvent(new CustomEvent('vueapps:analytics', {detail:{name:'assessment_completed',specialist:label}}));
      return response;
    });
  };
  const pending = [];
  let client = null;
  document.addEventListener('vueapps:analytics', (event) => {
    const {name, specialist, action} = event.detail || {};
    if (!['assessment_started', 'assessment_completed', 'specialist_action'].includes(name)) return;
    if (typeof specialist !== 'string' || !/^[A-Z-]{2,32}$/.test(specialist)) return;
    const payload = {vue_app: specialist, $current_url: location.origin + location.pathname};
    if (name === 'specialist_action' && actionIds.has(action)) payload.action = action;
    if (client) client.capture(name, payload);
    else if (pending.length < 20) pending.push({name, payload});
  });

  const sdk = document.createElement('script');
  sdk.async = true;
  sdk.src = 'https://eu-assets.i.posthog.com/static/array.js';
  sdk.onload = () => {
    try {
      window.posthog.init('phc_txEyX46KQ3BLFL8SwbtYRmSnu3hmB5xip87VQfYZwG72', {
        api_host: 'https://eu.i.posthog.com',
        ui_host: 'https://eu.posthog.com',
        persistence: 'memory',
        person_profiles: 'never',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_feature_flags: true,
        loaded: (readyClient) => {
          client = readyClient;
          for (const event of pending.splice(0)) client.capture(event.name, event.payload);
          const page = location.origin + location.pathname;
          let referrer = '';
          try { if (document.referrer) referrer = new URL(document.referrer).origin; } catch {}
          client.capture('$pageview', {
            vue_app: app,
            $current_url: page,
            $referrer: referrer,
            $pathname: location.pathname,
            $host: location.hostname,
            $title: document.title,
          });
        },
      });
    } catch { /* Analytics must never interrupt the portal. */ }
  };
  document.head.appendChild(sdk);
})();
