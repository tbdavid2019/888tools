import type { Router } from 'vue-router';
import { config } from '@/config';

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function loadGoogleAnalyticsScript(measurementId: string) {
  if (document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.gaId = measurementId;
  document.head.appendChild(script);
}

function initializeGoogleAnalytics(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

function trackPageView(measurementId: string, pagePath: string) {
  window.gtag?.('config', measurementId, {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function installGoogleAnalytics(router: Router) {
  const { measurementId, isEnabled } = config.ga;

  if (!isEnabled || !measurementId || typeof window === 'undefined') {
    return;
  }

  loadGoogleAnalyticsScript(measurementId);
  initializeGoogleAnalytics(measurementId);

  router.afterEach((to) => {
    trackPageView(measurementId, to.fullPath);
  });
}
