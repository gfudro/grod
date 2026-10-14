/**
 * Recorded voice lines from assets/audio/ (docs/AUDIO.md), found by file
 * name without the extension. A missing recording is silence, not an
 * error (CLAUDE.md "Grafiki i dźwięki").
 */
const FILES = import.meta.glob('../../assets/audio/*.{mp3,m4a,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const URLS = new Map<string, string>(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, ''), url]),
);

export function hasVoice(name: string): boolean {
  return URLS.has(name);
}

/** Plays a voice line if it has been recorded. Never throws. */
export function playVoice(name: string): void {
  const url = URLS.get(name);
  if (!url) return;
  try {
    // Safari may refuse sound before the first tap — that's fine, stay quiet.
    void new Audio(url).play().catch(() => {});
  } catch {
    // no audio support
  }
}
