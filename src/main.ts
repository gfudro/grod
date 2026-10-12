import { createGameApp } from './render/app';
import { mountVersionLabel } from './ui/version';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Brak elementu #app w index.html');
}

createGameApp(container);
mountVersionLabel();
