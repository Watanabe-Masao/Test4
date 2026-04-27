/**
 * クリップ JS — コア（ユーティリティ、Map構築、state、render関数）
 *
 * clipJs.ts から分離。vanilla JS テンプレートの共通基盤部分。
 *
 * @responsibility R:unclassified
 */

export const CLIP_JS_CORE = `
  const D = DATA;
  const $ = (s,p) => (p||document).querySelector(s);
  const $$ = (s,p) => [...(p||document).querySelectorAll(s)];
  const el = (tag,attrs,children) => {
    const e = document.createElement(tag);
    if(attrs) Object.entries(attrs).forEach(([k,v]) => {
      if(k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    if(children != null) {
      if(Array.isArray(children)) children.forEach(c => { if(c != null) e.append(typeof c === 'string' ? c : c); });
      else e.append(typeof children === 'string' ? children : children);
    }
    return e;
  };

  // ── Formatters ──
  const fmtCurrency = n => {
    if(n == null) return '-';
    const abs = Math.abs(Math.round(n));
    const s = abs >= 1e8 ? (n/1e8).toFixed(1)+'億' : abs >= 1e4 ? Math.round(n/1e4).toLocaleString()+'万' : Math.round(n).toLocaleString()+'円';
    return n < 0 ? '-'+s.replace('-','') : s;
  };
  const fmtSen = n => { const s = Math.round(n/1000); return s.toLocaleString()+'千'; };
  const fmtSenDiff = n => { const s = Math.round(n/1000); return (s>=0?'+':'')+s.toLocaleString()+'千'; };
  const fmtPct = (n,d) => { if(n==null||isNaN(n)) return '-'; return (n*100).toFixed(d??1)+'%'; };
  const condColor = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';
  const achColor = v => v >= 1 ? 'var(--positive)' : v >= 0.95 ? 'var(--warning)' : 'var(--negative)';

  // ── Build daily lookup maps ──
  const dailyMap = new Map(D.daily.map(d => [d.day, d]));
  const prevMap = new Map(D.prevYearDaily.map(d => [d.day, d]));

  // Cumulative
  const cumSalesMap = new Map();
  const cumBudgetMap = new Map();
  const cumPrevMap = new Map();
  let rS=0, rB=0, rP=0;
  for(let d=1; d<=D.daysInMonth; d++){
    rS += (dailyMap.get(d)?.sales??0);
    rB += (dailyMap.get(d)?.budget??0);
    rP += (prevMap.get(d)?.sales??0);
    cumSalesMap.set(d, rS);
    cumBudgetMap.set(d, rB);
    cumPrevMap.set(d, rP);
  }

  // ── State ──
  let currentView = 'calendar';
  let detailDay = null;

  // ── Render ──
  function render(){
    const app = $('#app');
    app.innerHTML = '';

    // Header
    app.append(el('h1',{},D.storeName+' '+D.year+'年'+D.month+'月'));
    app.append(el('div',{class:'subtitle'},'エクスポート: '+new Date(D.exportedAt).toLocaleString('ja-JP')));

    // Tabs
    const tabs = el('div',{class:'tabs'});
    const views = [
      ['calendar','カレンダー'],
      ['waterfall','要因分解'],
      ['hourly','時間帯分析'],
      ['drill','ドリルダウン'],
    ];
    views.forEach(([id,label]) => {
      const t = el('div',{class:'tab'+(currentView===id?' active':''),onclick:()=>{currentView=id;render();}},label);
      tabs.append(t);
    });
    app.append(tabs);

    // KPI Summary
    renderKpi(app);

    // Current view
    if(currentView==='calendar') renderCalendar(app);
    else if(currentView==='waterfall') renderWaterfall(app);
    else if(currentView==='hourly') renderHourly(app);
    else if(currentView==='drill') renderDrill(app);

    // Detail overlay
    if(detailDay != null) renderDayDetail(app);
  }
`
