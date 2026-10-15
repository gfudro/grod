import { BUILDINGS, BUILDING_ORDER, type BuildingType } from '../data/buildings';
import { RESOURCE_COLOR } from '../data/resources';
import type { BuildPlacementController } from '../input/build-place';
import type { RoadDrawController } from '../input/road-draw';
import { canAfford } from '../sim/placement';
import { MOUND } from '../data/mound';
import { moundUnlocked } from '../sim/mound';
import type { GameState, SpeedMultiplier } from '../sim/state';
import { STRINGS } from './strings';

export interface HudCallbacks {
  roadDraw: RoadDrawController;
  buildPlace: BuildPlacementController;
  state: GameState;
  /** Speed buttons shown: Artur's two, or all of them in test mode. */
  speeds: readonly SpeedMultiplier[];
  getSpeed: () => SpeedMultiplier;
  onSpeedChange: (speed: SpeedMultiplier) => void;
}

const HUD_STYLE = `
#hud, #palette {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  box-sizing: border-box;
  font-family: sans-serif;
}
#hud {
  justify-content: space-between;
  padding-top: 0;
}
/* Wider than an iPad since the dwór chain: it slides sideways under a
   finger until the bottom bar gets its redesign (ROADMAP "Z testów"). */
#palette {
  justify-content: safe center;
  overflow-x: auto;
  overflow-y: hidden;
  touch-action: pan-x;
  scrollbar-width: none;
}
#palette::-webkit-scrollbar {
  display: none;
}
#hud .hud-group {
  display: flex;
  gap: 6px;
}
#hud button, #palette button {
  min-width: 64px;
  min-height: 64px;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.35);
  background: #e8d9b8;
  color: #2b2016;
  font-size: 18px;
  font-weight: bold;
  font-family: sans-serif;
  touch-action: manipulation;
}
#palette button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  gap: 4px;
  min-width: 72px;
  flex-shrink: 0;
}
#palette button .cost {
  display: flex;
  gap: 4px;
}
#palette button .cost span {
  padding: 1px 5px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
}
#hud button.active, #palette button.active {
  background: #6fa83f;
  color: #fff;
  border-color: #2f5d1a;
}
/* Icon over the word, like KRONIKA, so the bottom row still fits an iPad. */
#hud button.erase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 13px;
  padding: 4px 8px;
}
#hud button.erase .icon {
  font-size: 22px;
  line-height: 1;
  color: #cc4433;
}
#hud button.erase.active .icon {
  color: #fff;
}
#hud button.erase.active {
  background: #cc4433;
  border-color: #5a1a12;
}
#hud button.undo {
  background: #b5513f;
  color: #fff;
  min-width: 80px;
}
#palette button.goal {
  background: #f0d27a;
  border-color: #8a6a1a;
}
#hud button:disabled, #palette button:disabled {
  opacity: 0.4;
}
`;

function injectStyle(): void {
  const style = document.createElement('style');
  style.textContent = HUD_STYLE;
  document.head.appendChild(style);
}

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export interface Hud {
  refresh(): void;
  /** Where other modules can add a button next to DROGA (e.g. KRONIKA). */
  extraSlot: HTMLElement;
}

export function mountHud({ roadDraw, buildPlace, state, speeds, getSpeed, onSpeedChange }: HudCallbacks): Hud {
  injectStyle();

  const hud = document.createElement('div');
  hud.id = 'hud';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud-group';
  const roadButton = document.createElement('button');
  roadButton.textContent = STRINGS.droga;
  // GUMKA: drag over a road to take it away (COFNIJ puts it back).
  const eraseButton = document.createElement('button');
  eraseButton.className = 'erase';
  eraseButton.innerHTML = `<span class="icon">✖</span><span>${STRINGS.gumka}</span>`;
  leftGroup.append(roadButton, eraseButton);
  const extraSlot = leftGroup;

  const centerGroup = document.createElement('div');
  centerGroup.className = 'hud-group';
  const pauseButton = document.createElement('button');
  pauseButton.textContent = STRINGS.pauza;
  const speedButtons = speeds.map((speed) => {
    const button = document.createElement('button');
    button.textContent = `x${speed}`;
    button.addEventListener('click', () => {
      onSpeedChange(speed);
      refresh();
    });
    return { speed, button };
  });
  centerGroup.append(pauseButton, ...speedButtons.map((b) => b.button));

  const rightGroup = document.createElement('div');
  rightGroup.className = 'hud-group';
  const undoButton = document.createElement('button');
  undoButton.textContent = STRINGS.cofnij;
  undoButton.className = 'undo';
  rightGroup.appendChild(undoButton);

  hud.append(leftGroup, centerGroup, rightGroup);

  const palette = document.createElement('div');
  palette.id = 'palette';
  const buildingButtons = new Map<BuildingType, HTMLButtonElement>();
  for (const type of BUILDING_ORDER) {
    const def = BUILDINGS[type];
    const button = document.createElement('button');
    const name = document.createElement('div');
    name.textContent = def.name;
    const cost = document.createElement('div');
    cost.className = 'cost';
    // The kopiec shows what heaping it up takes; it is paid bit by bit.
    const shownCost = def.kind === 'kopiec' ? MOUND.cost : def.cost;
    for (const [resource, amount] of Object.entries(shownCost)) {
      const span = document.createElement('span');
      span.textContent = `${amount}`;
      span.style.background = hexColor(RESOURCE_COLOR[resource as keyof typeof RESOURCE_COLOR]);
      cost.appendChild(span);
    }
    button.append(name, cost);
    if (def.kind === 'kopiec') button.classList.add('goal');
    button.addEventListener('click', () => {
      buildPlace.setArmed(buildPlace.armedType() === type ? null : type);
      roadDraw.setRoadMode(false);
      roadDraw.setEraseMode(false);
      refresh();
    });
    palette.appendChild(button);
    buildingButtons.set(type, button);
  }
  // Bottom band: building palette on top, controls underneath.
  (document.getElementById('bottom-band') ?? document.body).append(palette, hud);

  function refresh(): void {
    roadButton.classList.toggle('active', roadDraw.isRoadMode());
    eraseButton.classList.toggle('active', roadDraw.isEraseMode());
    const speed = getSpeed();
    pauseButton.classList.toggle('active', speed === 0);
    for (const b of speedButtons) b.button.classList.toggle('active', speed === b.speed);
    undoButton.disabled = !roadDraw.canUndo();

    const armed = buildPlace.armedType();
    for (const [type, button] of buildingButtons) {
      button.classList.toggle('active', armed === type);
      button.disabled = !canAfford(state, type);
      // The goal of the game joins the bar once the gród has a dwór.
      if (BUILDINGS[type].kind === 'kopiec') button.style.display = moundUnlocked(state) || state.mound ? '' : 'none';
    }
  }

  eraseButton.addEventListener('click', () => {
    roadDraw.setEraseMode(!roadDraw.isEraseMode());
    buildPlace.setArmed(null);
    refresh();
  });
  roadButton.addEventListener('click', () => {
    roadDraw.setRoadMode(!roadDraw.isRoadMode());
    buildPlace.setArmed(null);
    refresh();
  });
  undoButton.addEventListener('click', () => {
    roadDraw.undo();
    refresh();
  });
  pauseButton.addEventListener('click', () => {
    onSpeedChange(0);
    refresh();
  });

  refresh();
  return { refresh, extraSlot };
}
