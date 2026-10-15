import type { GameState } from '../sim/state';
import { villagePopulation, warehouseAmount } from '../sim/state';
import { RESOURCE_COLOR, RESOURCE_ORDER, type ResourceType } from '../data/resources';
import { BUILDINGS } from '../data/buildings';
import { SEASON_ORDER, type Season } from '../data/seasons';
import { currentSeason, currentYear, winterWarning, yearProgress } from '../sim/seasons';
import { activeStorm, protectingKontyna, stormDaysLeft } from '../sim/storms';
import { STRINGS } from './strings';

const TOPBAR_STYLE = `
#topbar {
  display: flex;
  flex-wrap: nowrap; /* one line always: a wrap would make the whole map jump */
  align-items: center;
  gap: 4px;
  padding: 6px;
  box-sizing: border-box;
  font-family: sans-serif;
  pointer-events: none;
  overflow: hidden;
}
#topbar .chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #3a2b1c;
  color: #f4e9d8;
  border-radius: 10px;
  padding: 4px 6px;
  font-size: 17px;
  font-weight: bold;
  min-height: 40px;
  box-sizing: border-box;
  flex-shrink: 0;
  white-space: nowrap;
  /* Every digit the same width, so a chip doesn't twitch as numbers change. */
  font-variant-numeric: tabular-nums;
}
#topbar .season {
  gap: 8px;
  padding: 3px 10px 3px 3px;
}
#topbar .season .clock {
  width: 58px;
  height: 58px;
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
#topbar .warning.hidden, #topbar .resource.hidden {
  display: none;
}
/* A storm over a house the kontyna guards: shown, but calm. */
#topbar .warning.guarded {
  background: #4a5160;
  animation: none;
}
@keyframes winter-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}
/* Room for three digits, so 99 → 100 doesn't push its neighbours. */
#topbar .amount > span:first-child {
  min-width: 3ch;
}
#topbar .resource .amount, #topbar .stacked .amount {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}
#topbar .resource .label, #topbar .stacked .label {
  font-size: 10px;
  font-weight: normal;
  opacity: 0.65;
}
#topbar .season .label {
  font-size: 12px;
  opacity: 0.8;
}
#topbar .season .amount > span:first-child {
  min-width: 0;
}
#topbar .swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.4);
}
/* With the kopiec's goods all 13 chips can be on the bar: when it no
   longer fits, everything gets a little smaller rather than wrapping. */
#topbar.tight { gap: 3px; padding: 4px; }
#topbar.tight .chip { font-size: 15px; padding: 3px 4px; gap: 3px; }
#topbar.tight .resource .label, #topbar.tight .stacked .label { font-size: 9px; }
#topbar.tight .amount > span:first-child { min-width: 2.4ch; }
#topbar.tight .swatch { width: 10px; height: 10px; }
#topbar.tight .season .clock { width: 50px; height: 50px; }
#topbar.tighter .chip { font-size: 13px; padding: 2px 3px; }
#topbar.tighter .resource .label, #topbar.tighter .stacked .label { font-size: 8px; }
#topbar.tighter .season .clock { width: 42px; height: 42px; }
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

/** The first goods every village handles; their chips are always on the bar. */
const ALWAYS_SHOWN: ResourceType[] = ['drewno', 'glina', 'ryba'];

/**
 * Whether the village has met this good yet: some in the warehouse, a
 * house or someone's hands, or a building (or site) that makes it. Chips
 * for later goods join the bar as their chains get built, so the bar
 * fits an iPad even with every good of the pyramid.
 */
function villageKnows(state: GameState, resource: ResourceType): boolean {
  return (
    ALWAYS_SHOWN.includes(resource) ||
    warehouseAmount(state, resource) > 0 ||
    state.buildings.some((b) => BUILDINGS[b.type].produces === resource) ||
    state.sites.some((s) => BUILDINGS[s.type].produces === resource) ||
    state.houses.some((h) => (h.goods[resource] ?? 0) > 0) ||
    state.villagers.some((v) => v.carrying === resource)
  );
}

export interface TopBar {
  refresh(state: GameState): void;
}

export function mountTopBar(): TopBar {
  injectStyle();

  const topbar = document.createElement('div');
  topbar.id = 'topbar';

  /** Puts `value` over a small `label` inside the chip, e.g. 36 over DREWNO. */
  function stack(el: HTMLElement, value: HTMLSpanElement, labelText: string): HTMLSpanElement {
    const amount = document.createElement('div');
    amount.className = 'amount';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = labelText;
    el.replaceChild(amount, value);
    amount.append(value, label);
    return label;
  }

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

  // The season's name, with the year in small print under it.
  const season = chip(null);
  season.el.classList.add('season', 'stacked');
  const seasonYear = stack(season.el, season.value, '');
  const clock = buildSeasonClock();
  season.el.insertBefore(clock.svg, season.el.firstChild);

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

  // A storm cloud over a house: lightning sign and days until the bolt.
  // Red and pulsing over an unguarded house, calm grey under a kontyna.
  const storm = chip(null);
  storm.el.classList.add('warning', 'hidden');
  const stormIcon = document.createElement('span');
  stormIcon.className = 'icon';
  stormIcon.textContent = '⚡';
  storm.el.insertBefore(stormIcon, storm.value);

  // Swatch, the amount, and the resource's name in small print under it.
  const resourceChips = RESOURCE_ORDER.map((resource) => {
    const { el, value } = chip(RESOURCE_COLOR[resource]);
    el.classList.add('resource');
    stack(el, value, STRINGS.zasoby[resource]);
    return { resource, el, value, shown: false };
  });
  const ludzie = chip(null);
  ludzie.el.classList.add('stacked');
  stack(ludzie.el, ludzie.value, STRINGS.ludzie);
  const wolni = chip(null);
  wolni.el.classList.add('stacked');
  stack(wolni.el, wolni.value, STRINGS.wolni);

  (document.getElementById('top-band') ?? document.body).appendChild(topbar);

  /** Shrinks the bar a step at a time until it fits in one line again. */
  function fit(): void {
    topbar.classList.remove('tight', 'tighter');
    if (topbar.scrollWidth <= topbar.clientWidth) return;
    topbar.classList.add('tight');
    if (topbar.scrollWidth <= topbar.clientWidth) return;
    topbar.classList.add('tighter');
  }
  let layoutKey = '';
  window.addEventListener('resize', () => {
    layoutKey = '';
  });

  function refresh(state: GameState): void {
    for (const chip of resourceChips) {
      // Once shown, a chip stays: it would be confusing to see it vanish at 0.
      if (!chip.shown && villageKnows(state, chip.resource)) chip.shown = true;
      chip.el.classList.toggle('hidden', !chip.shown);
      chip.value.textContent = String(warehouseAmount(state, chip.resource));
    }
    const freeCount = state.villagers.filter((v) => v.job.kind === 'idle').length;
    ludzie.value.textContent = String(villagePopulation(state));
    wolni.value.textContent = String(freeCount);

    const now = currentSeason(state);
    season.value.textContent = STRINGS.pory[now];
    seasonYear.textContent = `${STRINGS.rok} ${currentYear(state)}`;
    clock.setHand(yearProgress(state));

    const cloud = activeStorm(state);
    const cloudHouse = cloud ? state.houses.find((h) => h.id === cloud.houseId) : undefined;
    storm.el.classList.toggle('hidden', !cloud || !cloudHouse);
    if (cloud && cloudHouse) {
      storm.value.textContent = String(stormDaysLeft(state, cloud));
      storm.el.classList.toggle('guarded', protectingKontyna(state, cloudHouse) !== null);
    }

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

    // Measure only when what is on the bar changes, not on every tick.
    const key = [
      ...resourceChips.map((c) => (c.shown ? 1 : 0)),
      warn ? warn.missing.length + 1 : 0,
      cloud ? 1 : 0,
    ].join('');
    if (key !== layoutKey) {
      layoutKey = key;
      fit();
    }
  }

  return { refresh };
}
