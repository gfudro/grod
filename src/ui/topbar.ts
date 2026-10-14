import type { GameState } from '../sim/state';
import { warehouseAmount } from '../sim/state';
import { RESOURCE_COLOR, RESOURCE_ORDER } from '../data/resources';
import { SEASON_ORDER, type Season } from '../data/seasons';
import { currentSeason, currentYear, winterWarning, yearProgress } from '../sim/seasons';
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
  gap: 10px;
  padding: 4px 14px 4px 4px;
}
#topbar .season .clock {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}
#topbar .warning .icon {
  font-size: 22px;
  line-height: 1;
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

const SEASON_CLOCK_COLOR: Record<Season, string> = {
  wiosna: '#7fb84a',
  lato: '#e8c24a',
  jesien: '#c9782e',
  zima: '#dfe9f0',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A round year clock: four coloured quarters (spring at the top right,
 * then clockwise), each with its icon, and a hand that goes round once
 * a year — so the coming winter can be seen approaching.
 */
function buildSeasonClock(): { svg: SVGSVGElement; setHand(progress: number): void } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-32 -32 64 64');
  svg.classList.add('clock');
  const r = 30;
  SEASON_ORDER.forEach((season, i) => {
    const a0 = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 4) * Math.PI * 2 - Math.PI / 2;
    const wedge = document.createElementNS(SVG_NS, 'path');
    wedge.setAttribute(
      'd',
      `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`,
    );
    wedge.setAttribute('fill', SEASON_CLOCK_COLOR[season]);
    wedge.setAttribute('stroke', '#2b2016');
    wedge.setAttribute('stroke-width', '1.5');
    svg.appendChild(wedge);
    const mid = (a0 + a1) / 2;
    const icon = document.createElementNS(SVG_NS, 'text');
    icon.setAttribute('x', String(r * 0.58 * Math.cos(mid)));
    icon.setAttribute('y', String(r * 0.58 * Math.sin(mid)));
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', '13');
    icon.textContent = SEASON_ICON[season];
    svg.appendChild(icon);
  });
  const hand = document.createElementNS(SVG_NS, 'line');
  hand.setAttribute('x1', '0');
  hand.setAttribute('y1', '0');
  hand.setAttribute('x2', '0');
  hand.setAttribute('y2', String(-r + 2));
  hand.setAttribute('stroke', '#2b2016');
  hand.setAttribute('stroke-width', '3.5');
  hand.setAttribute('stroke-linecap', 'round');
  svg.appendChild(hand);
  const hub = document.createElementNS(SVG_NS, 'circle');
  hub.setAttribute('r', '4');
  hub.setAttribute('fill', '#2b2016');
  svg.appendChild(hub);
  const rim = document.createElementNS(SVG_NS, 'circle');
  rim.setAttribute('r', String(r));
  rim.setAttribute('fill', 'none');
  rim.setAttribute('stroke', '#f4e9d8');
  rim.setAttribute('stroke-width', '2');
  svg.appendChild(rim);

  return {
    svg,
    setHand(progress: number): void {
      hand.setAttribute('transform', `rotate(${(progress * 360).toFixed(1)})`);
    },
  };
}

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
  const clock = buildSeasonClock();
  season.el.insertBefore(clock.svg, season.value);

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
    season.value.textContent = `${STRINGS.pory[now]} · ${STRINGS.rok} ${currentYear(state)}`;
    clock.setHand(yearProgress(state));

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
