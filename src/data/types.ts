export interface Vec2 {
  x: number;
  y: number;
}

export function tileKey(tile: Vec2): string {
  return `${tile.x},${tile.y}`;
}
