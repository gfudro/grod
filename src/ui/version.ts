import pkg from '../../package.json';

export const APP_VERSION: string = pkg.version;

export function mountVersionLabel(): void {
  const label = document.createElement('div');
  label.id = 'version-label';
  label.textContent = `v${APP_VERSION}`;
  document.body.appendChild(label);
}
