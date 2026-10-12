import type { SpeedMultiplier } from '../sim/state';
import type { RoadDrawController } from '../input/road-draw';
import { STRINGS } from './strings';

export interface HudCallbacks {
  roadDraw: RoadDrawController;
  getSpeed: () => SpeedMultiplier;
  onSpeedChange: (speed: SpeedMultiplier) => void;
}

const HUD_STYLE = `
#hud {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  box-sizing: border-box;
  font-family: sans-serif;
  pointer-events: none;
}
#hud .hud-group {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}
#hud button {
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
#hud button.active {
  background: #6fa83f;
  color: #fff;
  border-color: #2f5d1a;
}
#hud button.undo {
  background: #b5513f;
  color: #fff;
  min-width: 80px;
}
#hud button:disabled {
  opacity: 0.4;
}
`;

function injectStyle(): void {
  const style = document.createElement('style');
  style.textContent = HUD_STYLE;
  document.head.appendChild(style);
}

export interface Hud {
  refresh(): void;
}

export function mountHud({ roadDraw, getSpeed, onSpeedChange }: HudCallbacks): Hud {
  injectStyle();

  const hud = document.createElement('div');
  hud.id = 'hud';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud-group';
  const roadButton = document.createElement('button');
  roadButton.textContent = STRINGS.droga;
  leftGroup.appendChild(roadButton);

  const centerGroup = document.createElement('div');
  centerGroup.className = 'hud-group';
  const pauseButton = document.createElement('button');
  pauseButton.textContent = STRINGS.pauza;
  const speed1Button = document.createElement('button');
  speed1Button.textContent = 'x1';
  const speed2Button = document.createElement('button');
  speed2Button.textContent = 'x2';
  const speed3Button = document.createElement('button');
  speed3Button.textContent = 'x3';
  centerGroup.append(pauseButton, speed1Button, speed2Button, speed3Button);

  const rightGroup = document.createElement('div');
  rightGroup.className = 'hud-group';
  const undoButton = document.createElement('button');
  undoButton.textContent = STRINGS.cofnij;
  undoButton.className = 'undo';
  rightGroup.appendChild(undoButton);

  hud.append(leftGroup, centerGroup, rightGroup);
  document.body.appendChild(hud);

  function refresh(): void {
    roadButton.classList.toggle('active', roadDraw.isRoadMode());
    const speed = getSpeed();
    pauseButton.classList.toggle('active', speed === 0);
    speed1Button.classList.toggle('active', speed === 1);
    speed2Button.classList.toggle('active', speed === 2);
    speed3Button.classList.toggle('active', speed === 3);
    undoButton.disabled = !roadDraw.canUndo();
  }

  roadButton.addEventListener('click', () => {
    roadDraw.setRoadMode(!roadDraw.isRoadMode());
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
  speed1Button.addEventListener('click', () => {
    onSpeedChange(1);
    refresh();
  });
  speed2Button.addEventListener('click', () => {
    onSpeedChange(2);
    refresh();
  });
  speed3Button.addEventListener('click', () => {
    onSpeedChange(3);
    refresh();
  });

  refresh();
  return { refresh };
}
