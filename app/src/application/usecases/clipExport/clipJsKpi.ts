/**
 * クリップ JS — KPI セクション
 *
 * clipJs.ts から分離。サマリー KPI グリッドの描画。
 */

export const CLIP_JS_KPI = `
  // ── KPI ──
  function renderKpi(parent){
    const s = D.summary;
    const py = D.prevYear;
    const grid = el('div',{class:'kpi-grid'});
    const add = (label,value,sub,accent) => {
      const k = el('div',{class:'kpi'});
      if(accent) k.style.borderTopColor = accent;
      k.append(el('div',{class:'kpi-label'},label));
      k.append(el('div',{class:'kpi-value'},value));
      if(sub) k.append(el('div',{class:'kpi-sub'},sub));
      grid.append(k);
    };
    add('総売上', fmtCurrency(s.totalSales), '予算: '+fmtCurrency(s.budget), 'var(--primary)');
    add('予算達成率', fmtPct(s.budgetAchievementRate), null, achColor(s.budgetAchievementRate));
    add('客数', s.totalCustomers.toLocaleString()+'人', '日平均: '+Math.round(s.totalCustomers/D.daysInMonth)+'人', 'var(--info)');
    if(s.invMethodGrossProfit != null)
      add('粗利益(在庫法)', fmtCurrency(s.invMethodGrossProfit), '粗利率: '+fmtPct(s.invMethodGrossProfitRate), 'var(--positive)');
    add('推定マージン', fmtCurrency(s.estMethodMargin), '推定率: '+fmtPct(s.estMethodMarginRate), 'var(--warning)');
    add('コア値入率', fmtPct(s.coreMarkupRate), null, '#06b6d4');
    if(py.hasPrevYear && py.totalSales > 0){
      const yoyR = s.totalSales / py.totalSales;
      add('前年比', fmtPct(yoyR), '前年売上: '+fmtCurrency(py.totalSales), condColor(yoyR-1));
    }
    add('着地予測', fmtCurrency(s.projectedSales), null, '#a855f7');
    parent.append(grid);
  }
`
