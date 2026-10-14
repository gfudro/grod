import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import { hintSize, type TutorialHint } from '../sim/tutorial';

const MARKER_COLOR = 0xffe14d;
const OUTLINE_COLOR = 0x3a2516;

export interface TutorialMarker {
  container: Container;
  update(hint: TutorialHint | null): void;
  /** Bobs the arrow and pulses the frame; call every frame. */
  animate(deltaMs: number): void;
}

/** A bouncing arrow over a pulsing frame: "put it here" / "lead the road here". */
export function createTutorialMarker(): TutorialMarker {
  const container = new Container();
  container.visible = false;
  const frame = new Graphics();
  const arrow = new Graphics()
    .poly([-16, -30, 16, -30, 16, -14, 28, -14, 0, 12, -28, -14, -16, -14])
    .fill(MARKER_COLOR)
    .poly([-16, -30, 16, -30, 16, -14, 28, -14, 0, 12, -28, -14, -16, -14])
    .stroke({ color: OUTLINE_COLOR, width: 3 });
  container.addChild(frame, arrow);

  let arrowBaseY = 0;
  let elapsed = 0;

  function update(hint: TutorialHint | null): void {
    if (!hint?.tile) {
      container.visible = false;
      return;
    }
    container.visible = true;
    const { w, h } = hintSize(hint);
    const px = hint.tile.x * TILE_SIZE;
    const py = hint.tile.y * TILE_SIZE;
    frame.clear().roundRect(px + 3, py + 3, w * TILE_SIZE - 6, h * TILE_SIZE - 6, 8).stroke({ color: MARKER_COLOR, width: 5 });
    arrow.x = px + (w * TILE_SIZE) / 2;
    arrowBaseY = py - 8;
  }

  function animate(deltaMs: number): void {
    if (!container.visible) return;
    elapsed += deltaMs;
    const phase = (elapsed / 700) * Math.PI;
    arrow.y = arrowBaseY - Math.abs(Math.sin(phase)) * 14;
    frame.alpha = 0.55 + 0.45 * Math.abs(Math.cos(phase));
  }

  return { container, update, animate };
}
