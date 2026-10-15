import { BUILDINGS } from '../data/buildings';
import { RESOURCE_COLOR, type ResourceType } from '../data/resources';
import { RUINS_REBUILD } from '../data/storms';
import type { InspectInfo } from '../sim/inspect';
import { MOUND_ID } from '../sim/demolish';
import { STRINGS } from './strings';

const PANEL_STYLE = `
#inspect-panel {
  position: absolute;
  z-index: 10;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  background: rgba(43, 32, 22, 0.9);
  color: #f4e9d8;
  border-radius: 10px;
  padding: 10px 16px;
  font-family: sans-serif;
  font-size: 15px;
  font-weight: bold;
  display: none;
  align-items: center;
  gap: 10px;
  text-align: center;
  white-space: nowrap;
}
#inspect-panel.visible {
  display: flex;
}
#inspect-panel button {
  min-width: 64px;
  min-height: 44px;
  border-radius: 8px;
  border: 2px solid rgba(0, 0, 0, 0.35);
  background: #e8d9b8;
  color: #2b2016;
  font-size: 13px;
  font-weight: bold;
  font-family: sans-serif;
  touch-action: manipulation;
  flex-shrink: 0;
}
#inspect-panel button.demolish {
  background: #b5513f;
  color: #fff;
}
#inspect-panel button.demolish.armed {
  background: #cc2211;
  border-color: #ffe14d;
}
#inspect-panel button.rebuild {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #6fa83f;
  color: #fff;
}
#inspect-panel button.rebuild .cost span {
  padding: 1px 5px;
  border-radius: 6px;
  color: #fff;
}
#inspect-panel button.active {
  background: #6fa83f;
  color: #fff;
  border-color: #2f5d1a;
}
`;

function injectStyle(): void {
  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.head.appendChild(style);
}

function describe(info: InspectInfo): string {
  switch (info.kind) {
    case 'warehouse': {
      const stock = Object.entries(info.stock)
        .map(([resource, amount]) => `${resource} ${amount ?? 0}`)
        .join(', ');
      return `MAGAZYN — ${info.connected ? 'droga OK' : 'brak drogi'} — ${stock}`;
    }
    case 'site':
      return `${info.name} (plac budowy) — dostarczono ${info.delivered} — ${
        info.builders > 0 ? `budują: ${info.builders}` : 'czeka na robotnika'
      }`;
    case 'building': {
      const road = info.connected ? 'droga OK' : 'brak drogi';
      if (info.buildingKind === 'usluga') return `${info.name} — ${road}`;
      const workerStatus = info.paused
        ? 'wstrzymany'
        : !info.hasWorker
          ? 'bez pracownika'
          : info.workerWaitingFor
            ? `brak: ${info.workerWaitingFor}`
            : info.workerWaiting
              ? 'pracownik czeka na drogę'
              : 'obsadzony';
      const plots = info.plots ? ` — ${info.plots.join(', ')}` : '';
      return `${info.name} — ${road} — ${workerStatus}${plots}`;
    }
    case 'house': {
      const guard = `${info.shielded ? 'kontyna chroni' : 'bez kontyny'}, ${info.hasWell ? 'studnia blisko' : 'bez studni'}`;
      if (info.ruined) {
        const status = info.rebuilding ? 'odbudowa trwa' : info.rebuildMissing.length > 0 ? `brak: ${info.rebuildMissing.join(', ')}` : 'można odbudować';
        return `${STRINGS.zgliszcza} (${info.name}) — ${status} — ${guard}`;
      }
      if (info.burning) {
        return `${info.name} — PALI SIĘ — ${info.hasWell ? 'ludzie gaszą wodą ze studni' : 'brak studni, nie ma czym gasić'}`;
      }
      const storm = info.stormDays !== null ? ` — burza za ${info.stormDays} dni (${guard})` : '';
      const goods = info.goods.map((g) => `${g.resource} ${g.have}/${g.target}`).join(', ');
      let growth = '';
      if (info.upgrading) {
        growth = ` — buduje: ${info.nextName}`;
      } else if (info.nextName) {
        const r = info.readiness;
        const missing = [
          !r.goodsFull && 'towary',
          !r.serviceInRange && r.service && BUILDINGS[r.service].name.toLowerCase(),
          ...r.missingCost,
        ].filter(Boolean);
        growth = ` — ${info.nextName}: ${missing.length > 0 ? `brak ${missing.join(', ')}` : 'zaraz'}`;
      }
      const need =
        (info.shortages.length > 0 ? ` — brak: ${info.shortages.join(', ')}` : '') +
        (info.strikers > 0 ? ` — głodni w domu: ${info.strikers}` : '');
      return `${info.name} — ${info.connected ? 'droga OK' : 'brak drogi'} — mieszkańcy ${info.residents}/${info.capacity} — ${goods}${need}${growth}${storm}`;
    }
    case 'mound': {
      const title = info.name ? `${STRINGS.kopiec} „${info.name}”` : STRINGS.kopiec;
      if (info.done) return `${title} — usypany!`;
      const goods = info.goods.map((g) => `${g.resource} ${g.have}/${g.target}`).join(', ');
      const road = info.connected ? `sypią: ${info.builders}` : 'brak drogi';
      const missing = info.missing.length > 0 ? ` — brak: ${info.missing.join(', ')}` : '';
      return `${title} — ${goods} — ${road}${missing}`;
    }
    case 'villager':
      return `LUDZIK — ${info.description}`;
  }
}

export type TogglePauseCallback = (buildingId: string, paused: boolean) => void;
export type DemolishCallback = (id: string) => void;
export type RebuildCallback = (houseId: string) => void;

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function mountInspectPanel(
  onTogglePause: TogglePauseCallback,
  onDemolish: DemolishCallback,
  onRebuild: RebuildCallback,
  onOpenMound: () => void,
): (info: InspectInfo | null) => void {
  injectStyle();
  const panel = document.createElement('div');
  panel.id = 'inspect-panel';

  const text = document.createElement('span');
  panel.appendChild(text);

  const pauseButton = document.createElement('button');
  panel.appendChild(pauseButton);

  // ODBUDUJ on burned ruins, with the cost on the button like the palette.
  const rebuildButton = document.createElement('button');
  rebuildButton.className = 'rebuild';
  const rebuildLabel = document.createElement('span');
  rebuildLabel.textContent = `🔨 ${STRINGS.odbuduj}`;
  const rebuildCost = document.createElement('span');
  rebuildCost.className = 'cost';
  for (const [resource, amount] of Object.entries(RUINS_REBUILD.cost) as [ResourceType, number][]) {
    const chip = document.createElement('span');
    chip.textContent = String(amount);
    chip.style.background = hexColor(RESOURCE_COLOR[resource]);
    rebuildCost.appendChild(chip);
  }
  rebuildButton.append(rebuildLabel, rebuildCost);
  panel.appendChild(rebuildButton);

  // On the finished kopiec: opens its screen again (name, chronicle).
  const moundButton = document.createElement('button');
  moundButton.textContent = `⛰️ ${STRINGS.kopiec}`;
  moundButton.addEventListener('click', () => onOpenMound());
  panel.appendChild(moundButton);

  // Two taps, like NOWA in the chronicle: the first asks, the second pulls it down.
  const demolishButton = document.createElement('button');
  demolishButton.className = 'demolish';
  panel.appendChild(demolishButton);
  let demolishId: string | null = null;
  let demolishArmed = false;
  demolishButton.addEventListener('click', () => {
    if (!demolishId) return;
    if (!demolishArmed) {
      demolishArmed = true;
      demolishButton.classList.add('armed');
      demolishButton.textContent = STRINGS.naPewno;
      return;
    }
    onDemolish(demolishId);
  });

  // Floats at the top of the map area, below the top band.
  (document.getElementById('app') ?? document.body).appendChild(panel);

  return (info: InspectInfo | null) => {
    if (!info) {
      panel.classList.remove('visible');
      demolishId = null;
      demolishArmed = false;
      demolishButton.classList.remove('armed');
      return;
    }
    text.textContent = describe(info);

    if (info.kind === 'building' && info.buildingKind !== 'usluga') {
      pauseButton.style.display = '';
      pauseButton.textContent = info.paused ? 'WZNÓW' : 'WSTRZYMAJ';
      pauseButton.classList.toggle('active', info.paused);
      pauseButton.onclick = () => onTogglePause(info.id, !info.paused);
    } else {
      pauseButton.style.display = 'none';
      pauseButton.onclick = null;
    }

    if (info.kind === 'house' && info.ruined && !info.rebuilding) {
      rebuildButton.style.display = '';
      rebuildButton.disabled = info.rebuildMissing.length > 0;
      rebuildButton.style.opacity = info.rebuildMissing.length > 0 ? '0.4' : '';
      rebuildButton.onclick = () => onRebuild(info.id);
    } else {
      rebuildButton.style.display = 'none';
      rebuildButton.onclick = null;
    }

    moundButton.style.display = info.kind === 'mound' && info.done ? '' : 'none';

    const id =
      info.kind === 'site' || info.kind === 'building' || info.kind === 'house'
        ? info.id
        : info.kind === 'mound' && !info.done
          ? MOUND_ID
          : null;
    if (id !== demolishId) {
      // A different thing was tapped: start the two-tap question over.
      demolishId = id;
      demolishArmed = false;
      demolishButton.classList.remove('armed');
    }
    demolishButton.style.display = id ? '' : 'none';
    if (!demolishArmed) demolishButton.textContent = `🔨 ${STRINGS.zburz}`;

    panel.classList.add('visible');
  };
}
