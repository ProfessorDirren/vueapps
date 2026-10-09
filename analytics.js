// Portal page views only. The project token is a public, write-only key.
(() => {
  if (!['vueapps.se', 'www.vueapps.se'].includes(location.hostname)) return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

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
        loaded: (client) => {
          const page = location.origin + location.pathname;
          let referrer = '';
          try { if (document.referrer) referrer = new URL(document.referrer).origin; } catch {}
          client.capture('$pageview', {
            vue_app: 'VUEAPPS',
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
