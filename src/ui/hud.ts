import { BUILDINGS, BUILDING_ORDER, type BuildingType } from '../data/buildings';
import { RESOURCE_COLOR } from '../data/resources';
import type { BuildPlacementController } from '../input/build-place';
import type { RoadDrawController } from '../input/road-draw';
import { canAfford } from '../sim/placement';
import { SPEEDS, type GameState, type SpeedMultiplier } from '../sim/state';
import { STRINGS } from './strings';

export interface HudCallbacks {
  roadDraw: RoadDrawController;
  buildPlace: BuildPlacementController;
  state: GameState;
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
#palette {
  justify-content: center;
}
#hud .hud-group {
  display: flex;
  gap: 8px;
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
#hud button.undo {
  background: #b5513f;
  color: #fff;
  min-width: 80px;
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

export function mountHud({ roadDraw, buildPlace, state, getSpeed, onSpeedChange }: HudCallbacks): Hud {
  injectStyle();

  const hud = document.createElement('div');
  hud.id = 'hud';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud-group';
  const roadButton = document.createElement('button');
  roadButton.textContent = STRINGS.droga;
  leftGroup.appendChild(roadButton);
  const extraSlot = leftGroup;

  const centerGroup = document.createElement('div');
  centerGroup.className = 'hud-group';
  const pauseButton = document.createElement('button');
  pauseButton.textContent = STRINGS.pauza;
  const speedButtons = SPEEDS.map((speed) => {
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
    for (const [resource, amount] of Object.entries(def.cost)) {
      const span = document.createElement('span');
      span.textContent = `${amount}`;
      span.style.background = hexColor(RESOURCE_COLOR[resource as keyof typeof RESOURCE_COLOR]);
      cost.appendChild(span);
    }
    button.append(name, cost);
    button.addEventListener('click', () => {
      buildPlace.setArmed(buildPlace.armedType() === type ? null : type);
      roadDraw.setRoadMode(false);
      refresh();
    });
    palette.appendChild(button);
    buildingButtons.set(type, button);
  }
  // Bottom band: building palette on top, controls underneath.
  (document.getElementById('bottom-band') ?? document.body).append(palette, hud);

  function refresh(): void {
    roadButton.classList.toggle('active', roadDraw.isRoadMode());
    const speed = getSpeed();
    pauseButton.classList.toggle('active', speed === 0);
    for (const b of speedButtons) b.button.classList.toggle('active', speed === b.speed);
    undoButton.disabled = !roadDraw.canUndo();

    const armed = buildPlace.armedType();
    for (const [type, button] of buildingButtons) {
      button.classList.toggle('active', armed === type);
      button.disabled = !canAfford(state, type);
    }
  }

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
