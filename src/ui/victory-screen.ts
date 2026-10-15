import type { GameState } from '../sim/state';
import { currentYear } from '../sim/seasons';
import { chronicleSentence, STRINGS } from './strings';

export interface VictoryScreenCallbacks {
  getState: () => GameState;
  onNameMound: (name: string) => void;
  onNewGame: () => void;
  /** The game pauses while the screen is open. */
  onOpenChange: (open: boolean) => void;
}

const STYLE = `
#victory {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(20, 14, 8, 0.75);
  z-index: 60;
  font-family: Georgia, 'Times New Roman', serif;
}
#victory.visible { display: flex; }
#victory .scroll {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 22px;
  border-radius: 14px;
  background: #f1e4c6;
  color: #2b2016;
  border: 6px solid #c9a24a;
  box-shadow: 0 0 0 4px #6b5220;
}
#victory .hill { font-size: 72px; line-height: 1; text-align: center; }
#victory h1 { margin: 0; font-size: 44px; text-align: center; letter-spacing: 2px; }
#victory .sub { text-align: center; font-family: sans-serif; font-weight: bold; color: #6b5220; font-size: 18px; }
#victory .name-row { display: flex; gap: 8px; }
#victory input {
  flex: 1;
  min-height: 56px;
  font-size: 24px;
  padding: 0 12px;
  border-radius: 10px;
  border: 2px solid #8a6a42;
  background: #fffaf0;
  font-family: Georgia, serif;
  -webkit-user-select: text;
  user-select: text;
}
#victory ol {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0;
  padding: 4px 4px 4px 28px;
  font-size: 18px;
  line-height: 1.45;
  min-height: 100px;
}
#victory li { margin-bottom: 6px; }
#victory .buttons { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
#victory button {
  min-width: 96px;
  min-height: 64px;
  padding: 0 16px;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.35);
  background: #e8d9b8;
  color: #2b2016;
  font-family: sans-serif;
  font-size: 18px;
  font-weight: bold;
  touch-action: manipulation;
}
#victory button.play { background: #6fa83f; color: #fff; border-color: #2f5d1a; min-width: 180px; }
#victory button.danger { background: #b5513f; color: #fff; }
`;

export interface VictoryScreen {
  /** Opens the screen (the kopiec was just finished, or its panel was tapped). */
  open(): void;
}

/**
 * The end of the game (GDD "Cel gry"): the finished kopiec, a field for
 * Artur to name it, the whole chronicle, and the choice to play on or
 * start a new gród. Single words on the buttons; the sentences are dad's.
 */
export function mountVictoryScreen(cb: VictoryScreenCallbacks): VictoryScreen {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'victory';
  const scroll = document.createElement('div');
  scroll.className = 'scroll';
  overlay.appendChild(scroll);

  const hill = document.createElement('div');
  hill.className = 'hill';
  hill.textContent = '⛰️';
  const title = document.createElement('h1');
  const sub = document.createElement('div');
  sub.className = 'sub';

  const nameRow = document.createElement('div');
  nameRow.className = 'name-row';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 40;
  nameInput.placeholder = STRINGS.nazwa;
  nameInput.autocapitalize = 'words';
  const nameButton = document.createElement('button');
  nameButton.textContent = STRINGS.nazwij;
  nameRow.append(nameInput, nameButton);

  const list = document.createElement('ol');

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  const playButton = document.createElement('button');
  playButton.className = 'play';
  playButton.textContent = `▶ ${STRINGS.grajDalej}`;
  const newButton = document.createElement('button');
  buttons.append(playButton, newButton);

  scroll.append(hill, title, sub, nameRow, list, buttons);
  document.body.appendChild(overlay);

  let newGameArmed = false;
  function resetNewGameButton(): void {
    newGameArmed = false;
    newButton.classList.remove('danger');
    newButton.textContent = `✨ ${STRINGS.nowa}`;
  }

  function refresh(): void {
    const state = cb.getState();
    const moundName = state.mound?.name ?? '';
    title.textContent = moundName ? `${STRINGS.kopiec} „${moundName}”` : `${STRINGS.kopiec}!`;
    sub.textContent = `${state.name || STRINGS.grod} · ${STRINGS.rok} ${currentYear(state)}`;
    list.replaceChildren(
      ...[...state.chronicle].reverse().map((entry) => {
        const li = document.createElement('li');
        li.textContent = chronicleSentence(entry);
        return li;
      }),
    );
    list.reversed = true;
  }

  function setOpen(open: boolean): void {
    overlay.classList.toggle('visible', open);
    if (open) {
      nameInput.value = cb.getState().mound?.name ?? '';
      resetNewGameButton();
      refresh();
    } else {
      nameInput.blur();
    }
    cb.onOpenChange(open);
  }

  const rename = (): void => {
    cb.onNameMound(nameInput.value);
    nameInput.blur();
    refresh();
  };
  nameButton.addEventListener('click', rename);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') rename();
  });
  playButton.addEventListener('click', () => setOpen(false));
  // Two taps, like NOWA in the chronicle; the old gród is archived, never deleted.
  newButton.addEventListener('click', () => {
    if (!newGameArmed) {
      newGameArmed = true;
      newButton.classList.add('danger');
      newButton.textContent = STRINGS.naPewno;
      return;
    }
    cb.onNewGame();
  });

  return { open: () => setOpen(true) };
}
