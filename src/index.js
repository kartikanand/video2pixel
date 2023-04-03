import App from './App';

const APP_ROOT = 'video-root';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App(APP_ROOT);
  app.start();
});
