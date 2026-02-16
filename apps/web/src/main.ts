import './styles/main.css';
import { renderAppShell } from './components/layout/appShell';
import { renderDashboardV2, renderDaily, renderSummary } from './components/views/renderers';
import { processShiire, processTenkanIn, processUriage } from './features/import/processors';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app が見つかりません');

app.innerHTML = renderAppShell();
const content = document.getElementById('content');
if (!content) throw new Error('#content が見つかりません');

const sampleStores = {
  '1': { name: 'サンプル店' },
};

const imported = {
  shiire: [],
  uriage: [],
  tenkanIn: [],
};

// process* は段階移行中のため main.ts から明示的に利用し、
// 既存の global 関数から features/import へ責務を移動した。
const shiire = processShiire({ data: imported, stores: sampleStores, suppliers: {} });
const uriage = processUriage({ data: imported, stores: sampleStores });
const tenkanIn = processTenkanIn({ data: imported, stores: sampleStores });

console.debug('import result (migration scaffold)', { shiire, uriage, tenkanIn });

const state = {
  storeName: '全店',
  sales: 1250000,
  invStart: 280000,
  totalCost: 730000,
  invEnd: 260000,
};

renderDashboardV2(content, state);

const viewButtons = document.createElement('div');
viewButtons.style.display = 'flex';
viewButtons.style.gap = '8px';
viewButtons.style.padding = '0 16px 16px';
viewButtons.innerHTML = `
  <button id="view-dash">dashboard</button>
  <button id="view-daily">daily</button>
  <button id="view-summary">summary</button>
`;

app.querySelector('.main')?.prepend(viewButtons);

document.getElementById('view-dash')?.addEventListener('click', () => renderDashboardV2(content, state));
document.getElementById('view-daily')?.addEventListener('click', () =>
  renderDaily(content, [
    { day: '1日', sales: 120000 },
    { day: '2日', sales: 148000 },
  ]),
);
document.getElementById('view-summary')?.addEventListener('click', () => renderSummary(content, state));
