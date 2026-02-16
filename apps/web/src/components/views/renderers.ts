import { calculateProfitSummary } from '../../domain/summary';

export interface ViewRenderContext {
  storeName: string;
  sales: number;
  invStart: number;
  totalCost: number;
  invEnd: number;
}

export function renderDashboardV2(root: HTMLElement, ctx: ViewRenderContext) {
  const summary = calculateProfitSummary(ctx);

  root.innerHTML = `
    <section class="section expanded">
      <div class="section-header">
        <div class="section-icon">📊</div>
        <div class="section-info">
          <div class="section-name">ダッシュボード（V2移行版）</div>
          <div class="section-meta">${ctx.storeName}</div>
        </div>
      </div>
      <div class="section-body">
        <div class="kpi-grid">
          <div class="kpi-card" data-color="primary"><div class="kpi-label">売上</div><div class="kpi-value">${ctx.sales.toLocaleString()}</div></div>
          <div class="kpi-card" data-color="success"><div class="kpi-label">売上原価</div><div class="kpi-value">${summary.cogs.toLocaleString()}</div></div>
          <div class="kpi-card" data-color="info"><div class="kpi-label">粗利</div><div class="kpi-value">${summary.grossProfit.toLocaleString()}</div></div>
          <div class="kpi-card" data-color="purple"><div class="kpi-label">粗利率</div><div class="kpi-value">${(summary.marginRate * 100).toFixed(1)}%</div></div>
        </div>
      </div>
    </section>
  `;
}

export function renderDaily(root: HTMLElement, rows: Array<{ day: string; sales: number }>) {
  const tbody = rows
    .map((r) => `<tr><td>${r.day}</td><td class="col-price">${r.sales.toLocaleString()}</td></tr>`)
    .join('');

  root.innerHTML = `
    <section class="section expanded">
      <div class="section-header"><div class="section-icon daily">📅</div><div class="section-name">日別推移</div></div>
      <div class="section-body"><table><thead><tr><th>日</th><th>売上</th></tr></thead><tbody>${tbody}</tbody></table></div>
    </section>
  `;
}

export function renderSummary(root: HTMLElement, ctx: ViewRenderContext) {
  const summary = calculateProfitSummary(ctx);

  root.innerHTML = `
    <section class="summary-panel">
      <div class="summary-panel-header">
        <div class="summary-panel-icon">🧾</div>
        <div class="summary-panel-title">サマリー</div>
      </div>
      <div class="summary-row"><span class="lt">期首在庫</span><span class="value">${ctx.invStart.toLocaleString()}</span></div>
      <div class="summary-row"><span class="lt">仕入原価</span><span class="value">${ctx.totalCost.toLocaleString()}</span></div>
      <div class="summary-row"><span class="lt">期末在庫</span><span class="value">${ctx.invEnd.toLocaleString()}</span></div>
      <div class="summary-total"><span>売上原価</span><span class="value">${summary.cogs.toLocaleString()}</span></div>
    </section>
  `;
}
