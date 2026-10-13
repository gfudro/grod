import type { GameState } from '../sim/state';
import { warehouseAmount } from '../sim/state';
import { RESOURCE_COLOR, RESOURCE_ORDER } from '../data/resources';
import { STRINGS } from './strings';

const TOPBAR_STYLE = `
#topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  gap: 10px;
  padding: 8px 14px;
  box-sizing: border-box;
  font-family: sans-serif;
  pointer-events: none;
}
#topbar .chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(43, 32, 22, 0.75);
  color: #f4e9d8;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 18px;
  font-weight: bold;
  min-height: 40px;
  box-sizing: border-box;
}
#topbar .swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.4);
}
`;

function injectStyle(): void {
  const style = document.createElement('style');
  style.textContent = TOPBAR_STYLE;
  document.head.appendChild(style);
}

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export interface TopBar {
  refresh(state: GameState): void;
}

export function mountTopBar(): TopBar {
  injectStyle();

  const topbar = document.createElement('div');
  topbar.id = 'topbar';

  function chip(color: number | null): { el: HTMLDivElement; value: HTMLSpanElement } {
    const el = document.createElement('div');
    el.className = 'chip';
    if (color !== null) {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = hexColor(color);
      el.appendChild(swatch);
    }
    const value = document.createElement('span');
    el.appendChild(value);
    topbar.appendChild(el);
    return { el, value };
  }

  const resourceChips = RESOURCE_ORDER.map((resource) => ({ resource, ...chip(RESOURCE_COLOR[resource]) }));
  const wolni = chip(null);

  document.body.appendChild(topbar);

  function refresh(state: GameState): void {
    for (const { resource, value } of resourceChips) {
      value.textContent = String(warehouseAmount(state, resource));
    }
    const freeCount = state.villagers.filter((v) => v.job.kind === 'idle').length;
    wolni.value.textContent = `${STRINGS.wolni}: ${freeCount}`;
  }

  return { refresh };
}
