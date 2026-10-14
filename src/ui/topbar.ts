import type { GameState } from '../sim/state';
import { warehouseAmount } from '../sim/state';
import { RESOURCE_COLOR, RESOURCE_ORDER } from '../data/resources';
import type { Season } from '../data/seasons';
import { currentSeason, currentYear, seasonProgress, winterWarning } from '../sim/seasons';
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
#topbar .season {
  position: relative;
  overflow: hidden;
  padding-bottom: 9px;
}
#topbar .season .icon, #topbar .warning .icon {
  font-size: 22px;
  line-height: 1;
}
#topbar .season .bar {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 4px;
  height: 4px;
  border-radius: 2px;
  background: rgba(244, 233, 216, 0.25);
}
#topbar .season .bar div {
  height: 100%;
  border-radius: 2px;
  background: #f4e9d8;
}
#topbar .warning {
  background: rgba(150, 40, 30, 0.9);
  animation: winter-pulse 1.2s ease-in-out infinite alternate;
}
#topbar .warning.hidden {
  display: none;
}
@keyframes winter-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}
#topbar .swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.4);
}
`;

/** Placeholder season icons until ui/wiosna.png etc. arrive (docs/ASSETS.md). */
const SEASON_ICON: Record<Season, string> = {
  wiosna: '🌱',
  lato: '☀️',
  jesien: '🍂',
  zima: '❄️',
};

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

  const season = chip(null);
  season.el.classList.add('season');
  const seasonIcon = document.createElement('span');
  seasonIcon.className = 'icon';
  season.el.insertBefore(seasonIcon, season.value);
  const seasonBar = document.createElement('div');
  seasonBar.className = 'bar';
  const seasonFill = document.createElement('div');
  seasonBar.appendChild(seasonFill);
  season.el.appendChild(seasonBar);

  // Before winter, while stores fall short: snowflake, days left, and a
  // swatch for each good that is missing.
  const warning = chip(null);
  warning.el.classList.add('warning', 'hidden');
  const warningIcon = document.createElement('span');
  warningIcon.className = 'icon';
  warningIcon.textContent = SEASON_ICON.zima;
  warning.el.insertBefore(warningIcon, warning.value);
  const warningSwatches = document.createElement('div');
  warningSwatches.style.display = 'flex';
  warningSwatches.style.gap = '4px';
  warning.el.appendChild(warningSwatches);
  let shownMissing = '';

  const resourceChips = RESOURCE_ORDER.map((resource) => ({ resource, ...chip(RESOURCE_COLOR[resource]) }));
  const wolni = chip(null);

  document.body.appendChild(topbar);

  function refresh(state: GameState): void {
    for (const { resource, value } of resourceChips) {
      value.textContent = String(warehouseAmount(state, resource));
    }
    const freeCount = state.villagers.filter((v) => v.job.kind === 'idle').length;
    wolni.value.textContent = `${STRINGS.wolni}: ${freeCount}`;

    const now = currentSeason(state);
    seasonIcon.textContent = SEASON_ICON[now];
    season.value.textContent = `${STRINGS.pory[now]} · ${STRINGS.rok} ${currentYear(state)}`;
    seasonFill.style.width = `${Math.round(seasonProgress(state) * 100)}%`;

    const warn = winterWarning(state);
    warning.el.classList.toggle('hidden', warn === null);
    if (warn) {
      warning.value.textContent = String(warn.days);
      const key = warn.missing.join(',');
      if (key !== shownMissing) {
        shownMissing = key;
        warningSwatches.replaceChildren(
          ...warn.missing.map((resource) => {
            const swatch = document.createElement('div');
            swatch.className = 'swatch';
            swatch.style.background = hexColor(RESOURCE_COLOR[resource]);
            return swatch;
          }),
        );
      }
    }
  }

  return { refresh };
}
