import type { InspectInfo } from '../sim/inspect';

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
        info.assignedWorkerId ? 'ktoś buduje' : 'czeka na robotnika'
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
      const goods = info.goods.map((g) => `${g.resource} ${g.have}/${g.target}`).join(', ');
      let growth = '';
      if (info.upgrading) {
        growth = ` — buduje: ${info.nextName}`;
      } else if (info.nextName) {
        const r = info.readiness;
        const missing = [
          !r.goodsFull && 'towary',
          !r.serviceInRange && 'studnia',
          ...r.missingCost,
        ].filter(Boolean);
        growth = ` — ${info.nextName}: ${missing.length > 0 ? `brak ${missing.join(', ')}` : 'zaraz'}`;
      }
      const need = info.shortages.length > 0 ? ` — brak: ${info.shortages.join(', ')}` : '';
      return `${info.name} — ${info.connected ? 'droga OK' : 'brak drogi'} — mieszkańcy ${info.residents}/${info.capacity} — ${goods}${need}${growth}`;
    }
    case 'villager':
      return `LUDZIK — ${info.description}`;
  }
}

export type TogglePauseCallback = (buildingId: string, paused: boolean) => void;

export function mountInspectPanel(onTogglePause: TogglePauseCallback): (info: InspectInfo | null) => void {
  injectStyle();
  const panel = document.createElement('div');
  panel.id = 'inspect-panel';

  const text = document.createElement('span');
  panel.appendChild(text);

  const pauseButton = document.createElement('button');
  panel.appendChild(pauseButton);

  // Floats at the top of the map area, below the top band.
  (document.getElementById('app') ?? document.body).appendChild(panel);

  return (info: InspectInfo | null) => {
    if (!info) {
      panel.classList.remove('visible');
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

    panel.classList.add('visible');
  };
}
