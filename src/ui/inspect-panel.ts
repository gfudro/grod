import type { InspectInfo } from '../sim/inspect';

const PANEL_STYLE = `
#inspect-panel {
  position: fixed;
  left: 50%;
  top: 56px;
  transform: translateX(-50%);
  background: rgba(43, 32, 22, 0.9);
  color: #f4e9d8;
  border-radius: 10px;
  padding: 10px 16px;
  font-family: sans-serif;
  font-size: 15px;
  font-weight: bold;
  display: none;
  pointer-events: none;
  text-align: center;
  white-space: nowrap;
}
#inspect-panel.visible {
  display: block;
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
      const workerStatus = !info.hasWorker
        ? 'bez pracownika'
        : info.workerWaiting
          ? 'pracownik czeka na drogę do surowca'
          : 'obsadzony';
      return `${info.name} — ${info.connected ? 'droga OK' : 'brak drogi'} — ${workerStatus}`;
    }
    case 'house':
      return `ZIEMIANKA — ${info.connected ? 'droga OK' : 'brak drogi'} — mieszkańcy ${info.residents}/${info.capacity} — ryby ${info.ryby}/${info.rybyTarget}`;
    case 'villager':
      return `LUDZIK — ${info.description}`;
  }
}

export function mountInspectPanel(): (info: InspectInfo | null) => void {
  injectStyle();
  const panel = document.createElement('div');
  panel.id = 'inspect-panel';
  document.body.appendChild(panel);

  return (info: InspectInfo | null) => {
    if (!info) {
      panel.classList.remove('visible');
      return;
    }
    panel.textContent = describe(info);
    panel.classList.add('visible');
  };
}
