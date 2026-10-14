import type { GameState } from '../sim/state';
import { currentYear } from '../sim/seasons';
import { chronicleSentence, STRINGS } from './strings';

export interface ChronicleScreenCallbacks {
  getState: () => GameState;
  onRename: (name: string) => void;
  onExport: () => void;
  /** Resolves false when the file is not a save that can be loaded. */
  onImport: (file: File) => Promise<boolean>;
  onNewGame: () => void;
  /** Where the KRONIKA button goes (the bottom band, next to DROGA). */
  buttonSlot: HTMLElement;
  /** The game pauses while the chronicle is open. */
  onOpenChange: (open: boolean) => void;
}

const STYLE = `
#chronicle-button {
  min-width: 64px;
  min-height: 64px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.35);
  background: #e8d9b8;
  color: #2b2016;
  font-family: sans-serif;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  touch-action: manipulation;
}
#chronicle-button .icon { font-size: 24px; line-height: 1; }
#chronicle {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(20, 14, 8, 0.7);
  z-index: 50;
  font-family: Georgia, 'Times New Roman', serif;
}
#chronicle.visible { display: flex; }
#chronicle .book {
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
  border: 4px solid #8a6a42;
}
#chronicle h1 { margin: 0; font-size: 30px; text-align: center; }
#chronicle .year { text-align: center; font-family: sans-serif; font-weight: bold; color: #6b5220; }
#chronicle .name-row { display: flex; gap: 8px; }
#chronicle input {
  flex: 1;
  min-height: 52px;
  font-size: 22px;
  padding: 0 12px;
  border-radius: 10px;
  border: 2px solid #8a6a42;
  background: #fffaf0;
  font-family: Georgia, serif;
  /* body has user-select: none, which would stop typing on iPad */
  -webkit-user-select: text;
  user-select: text;
}
#chronicle ol {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0;
  padding: 4px 4px 4px 28px;
  font-size: 19px;
  line-height: 1.45;
  min-height: 120px;
}
#chronicle li { margin-bottom: 6px; }
#chronicle .buttons { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
#chronicle button {
  min-width: 96px;
  min-height: 64px;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.35);
  background: #e8d9b8;
  color: #2b2016;
  font-family: sans-serif;
  font-size: 16px;
  font-weight: bold;
  touch-action: manipulation;
}
#chronicle button.close { background: #6fa83f; color: #fff; border-color: #2f5d1a; }
#chronicle button.danger { background: #b5513f; color: #fff; }
#chronicle button.error { background: #cc4433; color: #fff; }
`;

export interface ChronicleScreen {
  refresh(): void;
}

export function mountChronicleScreen(cb: ChronicleScreenCallbacks): ChronicleScreen {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const openButton = document.createElement('button');
  openButton.id = 'chronicle-button';
  openButton.innerHTML = `<span class="icon">📜</span><span>${STRINGS.kronika}</span>`;
  cb.buttonSlot.appendChild(openButton);

  const overlay = document.createElement('div');
  overlay.id = 'chronicle';
  const book = document.createElement('div');
  book.className = 'book';
  overlay.appendChild(book);

  const title = document.createElement('h1');
  const year = document.createElement('div');
  year.className = 'year';

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
  const exportButton = document.createElement('button');
  exportButton.textContent = `💾 ${STRINGS.zapisz}`;
  const importButton = document.createElement('button');
  importButton.textContent = `📂 ${STRINGS.wczytaj}`;
  const newButton = document.createElement('button');
  newButton.textContent = `✨ ${STRINGS.nowa}`;
  const closeButton = document.createElement('button');
  closeButton.className = 'close';
  closeButton.textContent = STRINGS.zamknij;
  buttons.append(exportButton, importButton, newButton, closeButton);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  book.append(title, year, nameRow, list, buttons, fileInput);
  document.body.appendChild(overlay);

  let newGameArmed = false;

  function resetNewGameButton(): void {
    newGameArmed = false;
    newButton.classList.remove('danger');
    newButton.textContent = `✨ ${STRINGS.nowa}`;
  }

  function refresh(): void {
    const state = cb.getState();
    title.textContent = state.name || STRINGS.grod;
    year.textContent = `${STRINGS.rok} ${currentYear(state)}`;
    // Newest first: the latest news is what dad reads out after a session.
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
      nameInput.value = cb.getState().name;
      resetNewGameButton();
      importButton.classList.remove('error');
      importButton.textContent = `📂 ${STRINGS.wczytaj}`;
      refresh();
    } else {
      nameInput.blur();
    }
    cb.onOpenChange(open);
  }

  openButton.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));

  const rename = (): void => {
    cb.onRename(nameInput.value);
    nameInput.blur();
    refresh();
  };
  nameButton.addEventListener('click', rename);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') rename();
  });

  exportButton.addEventListener('click', () => cb.onExport());

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const ok = await cb.onImport(file);
    if (!ok) {
      importButton.classList.add('error');
      importButton.textContent = `📂 ${STRINGS.blad}`;
    }
  });

  // Two taps: the first turns the button red and asks; the second starts
  // a new game (the old one is archived, never deleted).
  newButton.addEventListener('click', () => {
    if (!newGameArmed) {
      newGameArmed = true;
      newButton.classList.add('danger');
      newButton.textContent = STRINGS.naPewno;
      return;
    }
    cb.onNewGame();
  });

  return { refresh };
}
