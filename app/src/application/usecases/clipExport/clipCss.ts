/**
 * クリップ HTML 用 CSS テンプレート
 *
 * renderClipHtml から分離。自己完結型 HTML レポートのスタイル定義。
 *
 * @responsibility R:unclassified
 */

export const CSS_CONTENT = `
:root {
  --bg: #09090b; --bg2: #18181b; --bg3: #27272a;
  --text: #f4f4f5; --text2: #a1a1aa; --text3: #71717a;
  --border: rgba(255,255,255,0.06);
  --positive: #22c55e; --negative: #ef4444;
  --primary: #6366f1; --primary-dim: rgba(99,102,241,0.15);
  --warning: #f59e0b; --info: #3b82f6;
  --font: 'Segoe UI','Noto Sans JP',sans-serif;
  --mono: 'JetBrains Mono','Consolas',monospace;
  --radius: 8px;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { background:var(--bg); color:var(--text); font-family:var(--font); font-size:13px; line-height:1.5; }
#app { max-width:1200px; margin:0 auto; padding:16px; }
h1 { font-size:1.2rem; font-weight:700; margin-bottom:4px; }
h2 { font-size:1rem; font-weight:600; margin:16px 0 8px; border-bottom:1px solid var(--border); padding-bottom:4px; }
h3 { font-size:0.85rem; font-weight:600; margin:12px 0 6px; color:var(--text2); }
.subtitle { font-size:0.75rem; color:var(--text3); margin-bottom:12px; }

/* Tab system */
.tabs { display:flex; gap:4px; margin:12px 0 8px; flex-wrap:wrap; }
.tab { padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:500;
  background:var(--bg2); border:1px solid var(--border); color:var(--text2); transition:all .15s; }
.tab:hover { border-color:var(--primary); }
.tab.active { background:var(--primary-dim); border-color:var(--primary); color:var(--text); }

/* KPI grid */
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin:8px 0; }
.kpi { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:10px;
  border-top:3px solid var(--primary); }
.kpi-label { font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:.5px; }
.kpi-value { font-size:1.1rem; font-weight:700; font-family:var(--mono); margin-top:2px; }
.kpi-sub { font-size:0.65rem; color:var(--text3); margin-top:2px; }

/* Calendar */
.cal-table { width:100%; border-collapse:collapse; table-layout:fixed; }
.cal-table th { font-size:0.7rem; padding:4px; text-align:center; color:var(--text3); border-bottom:1px solid var(--border); }
.cal-table th.weekend { color:var(--negative); }
.cal-table td { border:1px solid var(--border); vertical-align:top; height:90px; padding:0; }
.cal-table td.empty { background:transparent; border-color:transparent; }
.cal-cell { padding:4px; cursor:pointer; height:100%; transition:background .15s; }
.cal-cell:hover { background:var(--bg3); }
.cal-day { font-size:0.7rem; font-weight:600; margin-bottom:2px; }
.cal-day.weekend { color:var(--negative); }
.cal-hero { font-size:0.8rem; font-weight:700; font-family:var(--mono); }
.cal-diff { font-size:0.6rem; font-weight:600; }
.cal-bar { height:3px; border-radius:2px; margin:2px 0; background:var(--bg3); }
.cal-bar-fill { height:100%; border-radius:2px; transition:width .3s; }
.cal-metric { font-size:0.55rem; color:var(--text3); }
.cal-cum { font-size:0.55rem; border-top:1px solid var(--border); padding-top:2px; margin-top:2px; }

/* Waterfall */
.wf-container { position:relative; margin:8px 0; }
.wf-svg { width:100%; }
.wf-legend { display:flex; gap:12px; font-size:0.65rem; color:var(--text2); margin-top:4px; }
.wf-legend-item { display:flex; align-items:center; gap:4px; }
.wf-legend-dot { width:10px; height:10px; border-radius:2px; }

/* Hourly chart */
.hourly-bars { display:flex; align-items:flex-end; gap:2px; height:120px; margin:8px 0; }
.hourly-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; }
.hourly-bar { width:100%; border-radius:2px 2px 0 0; transition:height .3s; min-height:1px; }
.hourly-label { font-size:0.5rem; color:var(--text3); margin-top:2px; }
.hourly-val { font-size:0.5rem; color:var(--text2); font-family:var(--mono); }

/* Drill table */
.drill-table { width:100%; border-collapse:collapse; font-size:0.7rem; }
.drill-table th { text-align:left; padding:4px 8px; border-bottom:1px solid var(--border); color:var(--text3); font-weight:500; }
.drill-table td { padding:4px 8px; border-bottom:1px solid var(--border); }
.drill-table tr:hover { background:var(--bg3); }
.drill-table tr.clickable { cursor:pointer; }
.drill-bar { height:4px; border-radius:2px; background:var(--bg3); margin-top:2px; }
.drill-bar-fill { height:100%; border-radius:2px; }

/* Detail panel */
.detail-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.6);
  display:flex; align-items:center; justify-content:center; z-index:100; }
.detail-panel { background:var(--bg2); border-radius:12px; max-width:700px; width:95%;
  max-height:85vh; overflow-y:auto; padding:20px; border:1px solid var(--border); }
.detail-close { float:right; cursor:pointer; font-size:1.2rem; color:var(--text3); background:none; border:none; }
.detail-close:hover { color:var(--text); }

/* Summary row */
.summary-row { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; }
.summary-item { background:var(--bg2); border:1px solid var(--border); border-radius:6px; padding:6px 10px; flex:1; min-width:100px; }
.summary-label { font-size:0.6rem; color:var(--text3); }
.summary-value { font-size:0.85rem; font-weight:600; font-family:var(--mono); }

/* Utility */
.positive { color:var(--positive); }
.negative { color:var(--negative); }
.mono { font-family:var(--mono); }
.hidden { display:none; }
.badge { display:inline-block; font-size:0.5rem; padding:1px 4px; border-radius:3px;
  background:var(--primary-dim); color:var(--primary); margin-left:4px; }

@media (max-width:700px) {
  .kpi-grid { grid-template-columns:repeat(2,1fr); }
  .cal-table td { height:70px; }
  .cal-hero { font-size:0.7rem; }
}
`
