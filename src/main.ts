import { renderApp } from './ui/app';

// Kick off on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderApp());
} else {
  renderApp();
}
