import { renderApp } from './ui/app';

// Basic env diagnostics to aid prod triage
(() => {
  try {
    const secure = typeof window !== 'undefined' && 'isSecureContext' in window ? (window as any).isSecureContext : 'unknown';
    const hasMedia = !!(navigator && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    console.info('[Env] origin=', location.origin, ' secureContext=', secure, ' mediaDevices.getUserMedia=', hasMedia);
  } catch {}
})();

// Kick off on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderApp());
} else {
  renderApp();
}
