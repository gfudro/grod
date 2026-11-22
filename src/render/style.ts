/**
 * Which look the map is drawn in: hand-made pixel art or the plain
 * placeholder shapes. Kept on the device (localStorage), not in the save,
 * so switching never touches the player's game.
 */
export type GraphicsStyle = 'pixel' | 'plain';

const STORAGE_KEY = 'grod.graphics';

function load(): GraphicsStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'plain' ? 'plain' : 'pixel';
  } catch {
    return 'pixel';
  }
}

let current: GraphicsStyle = load();
const listeners = new Set<(style: GraphicsStyle) => void>();

export function graphicsStyle(): GraphicsStyle {
  return current;
}

export function isPixelStyle(): boolean {
  return current === 'pixel';
}

export function setGraphicsStyle(style: GraphicsStyle): void {
  if (style === current) return;
  current = style;
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // Private mode or storage blocked: the choice lasts until reload.
  }
  for (const listener of listeners) listener(style);
}

export function onGraphicsStyleChange(listener: (style: GraphicsStyle) => void): void {
  listeners.add(listener);
}
