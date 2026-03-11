/**
 * クリップ HTML 用 JavaScript テンプレート
 *
 * renderClipHtml から分離。自己完結型 HTML レポートのインタラクティブ描画ロジック。
 * vanilla JS テンプレートリテラルとして埋め込まれる。
 */

export const JS_CONTENT = `
'use strict';
(function(){
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

  // ── Calendar ──
  function renderCalendar(parent){
    parent.append(el('h2',{},'月間カレンダー'));
    const table = el('table',{class:'cal-table'});
    const thead = el('thead');
    const hr = el('tr');
    ['月','火','水','木','金','土','日'].forEach((l,i) => {
      hr.append(el('th',{class:i>=5?'weekend':''},l));
    });
    thead.append(hr);
    table.append(thead);

    const tbody = el('tbody');
    const firstDow = (new Date(D.year, D.month-1, 1).getDay()+6)%7;
    let cells = [];
    for(let i=0;i<firstDow;i++) cells.push(null);
    for(let d=1;d<=D.daysInMonth;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);

    for(let w=0;w<cells.length;w+=7){
      const tr = el('tr');
      for(let i=0;i<7;i++){
        const day = cells[w+i];
        if(day==null){ tr.append(el('td',{class:'empty'})); continue; }

        const rec = dailyMap.get(day);
        const budget = rec?.budget ?? 0;
        const actual = rec?.sales ?? 0;
        const diff = actual - budget;
        const ach = budget > 0 ? actual/budget : 0;
        const isWE = i >= 5;

        const td = el('td');
        const cell = el('div',{class:'cal-cell',onclick:()=>{detailDay=day;render();}});

        cell.append(el('div',{class:'cal-day'+(isWE?' weekend':'')},String(day)));

        if(budget > 0 || actual > 0){
          cell.append(el('div',{class:'cal-hero'},fmtSen(actual)));
          const diffEl = el('div',{class:'cal-diff',style:{color:condColor(diff)}},
            (diff>=0?'\\u25B2':'\\u25BC')+' '+fmtSenDiff(diff));
          cell.append(diffEl);

          if(budget > 0){
            const bar = el('div',{class:'cal-bar'});
            const fill = el('div',{class:'cal-bar-fill',style:{
              width:Math.min(ach*100,100)+'%',
              background:achColor(ach)
            }});
            bar.append(fill);
            cell.append(bar);
          }

          const prev = prevMap.get(day);
          if(prev && prev.sales > 0){
            const pyR = actual/prev.sales;
            cell.append(el('div',{class:'cal-metric',style:{color:condColor(pyR-1)}},
              (pyR>=1?'\\u25B2':'\\u25BC')+' 前年'+fmtPct(pyR,0)));
          }

          const cB = cumBudgetMap.get(day)||0;
          const cS = cumSalesMap.get(day)||0;
          if(cB > 0){
            const cA = cS/cB;
            const cD = cS-cB;
            cell.append(el('div',{class:'cal-cum'},
              el('span',{style:{color:achColor(cA)}},'累計 '+fmtPct(cA,0)+' '),
              el('span',{style:{color:condColor(cD)}},fmtSen(cD))
            ));
          }
        }

        td.append(cell);
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    parent.append(table);
  }

  // ── Waterfall ──
  function renderWaterfall(parent){
    parent.append(el('h2',{},'要因分解ウォーターフォール'));
    const dec = D.decomposition;
    if(!dec){ parent.append(el('div',{class:'subtitle'},'前年データなし（分解不可）')); return; }

    // Decomposition level tabs
    const tabs = el('div',{class:'tabs'});
    const levels = [[2,'2要素(客数\\u00D7客単価)']];
    if(dec.decompose3) levels.push([3,'3要素(客数\\u00D7点数\\u00D7単価)']);
    if(dec.decompose5) levels.push([5,'5要素(価格+構成比)']);

    if(!window._wfLevel) window._wfLevel = dec.decompose5 ? 5 : dec.decompose3 ? 3 : 2;
    levels.forEach(([lv,label]) => {
      tabs.append(el('div',{class:'tab'+(window._wfLevel===lv?' active':''),
        onclick:()=>{window._wfLevel=lv;render();}},label));
    });
    parent.append(tabs);

    // Summary
    const sr = el('div',{class:'summary-row'});
    const addS = (l,v,c) => {
      const item = el('div',{class:'summary-item'});
      item.append(el('div',{class:'summary-label'},l));
      const ve = el('div',{class:'summary-value'},v);
      if(c) ve.style.color = c;
      item.append(ve);
      sr.append(item);
    };
    const yoyDiff = dec.curSales - dec.prevSales;
    const yoyRatio = dec.curSales / dec.prevSales;
    addS('前年売上', fmtCurrency(dec.prevSales));
    addS('当年売上', fmtCurrency(dec.curSales));
    addS('差額', (yoyDiff>=0?'+':'')+fmtCurrency(yoyDiff), condColor(yoyDiff));
    addS('比率', fmtPct(yoyRatio), condColor(yoyRatio-1));
    parent.append(sr);

    // Build waterfall items
    const items = [{name:'前年売上',value:dec.prevSales,isTotal:true}];
    const lv = window._wfLevel;
    if(lv === 2){
      items.push({name:'客数効果',value:dec.decompose2.custEffect});
      items.push({name:'客単価効果',value:dec.decompose2.ticketEffect});
    } else if(lv === 3 && dec.decompose3){
      items.push({name:'客数効果',value:dec.decompose3.custEffect});
      items.push({name:'点数効果',value:dec.decompose3.qtyEffect});
      items.push({name:'単価効果',value:dec.decompose3.pricePerItemEffect});
    } else if(lv === 5 && dec.decompose5){
      items.push({name:'客数効果',value:dec.decompose5.custEffect});
      items.push({name:'点数効果',value:dec.decompose5.qtyEffect});
      items.push({name:'価格効果',value:dec.decompose5.priceEffect});
      items.push({name:'構成比変化',value:dec.decompose5.mixEffect});
    }
    items.push({name:'当年売上',value:dec.curSales,isTotal:true});

    drawWaterfallSVG(parent, items);

    // Invariant check
    const effects = items.filter(i=>!i.isTotal).reduce((s,i)=>s+i.value,0);
    const expected = dec.curSales - dec.prevSales;
    const checkEl = el('div',{class:'subtitle',style:{marginTop:'8px'}},
      '\\u2713 不変条件: '+fmtCurrency(effects)+' = '+fmtCurrency(expected)+
      ' (誤差: '+Math.abs(effects-expected).toFixed(2)+'円)');
    parent.append(checkEl);
  }

  function drawWaterfallSVG(parent, items){
    const W=800, H=300, pad={t:30,r:20,b:50,l:70};
    const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
    const barW = Math.min(cW/items.length*0.6, 60);
    const gap = cW/items.length;

    // Compute bases
    let running = 0;
    const bars = items.map((it,i) => {
      if(it.isTotal) {
        const b = {x:pad.l+i*gap+(gap-barW)/2, y:0, w:barW, h:0, base:0, value:it.value, name:it.name, isTotal:true};
        running = it.value;
        return b;
      }
      const base = it.value >= 0 ? running : running + it.value;
      const b = {x:pad.l+i*gap+(gap-barW)/2, y:0, w:barW, h:0, base, value:it.value, name:it.name, isTotal:false};
      running += it.value;
      return b;
    });

    const allVals = bars.flatMap(b => [b.base, b.base+Math.abs(b.value)]);
    const maxV = Math.max(...allVals)*1.1;
    const minV = Math.min(0, ...allVals)*1.1;
    const range = maxV - minV || 1;
    const scale = v => pad.t + cH - (v-minV)/range*cH;

    bars.forEach(b => {
      if(b.isTotal){b.y=scale(b.value);b.h=scale(0)-b.y;}
      else {
        const top = b.base + Math.abs(b.value);
        b.y = scale(top);
        b.h = Math.abs(scale(b.base) - scale(top));
      }
    });

    let svg = '<svg viewBox="0 0 '+W+' '+H+'" class="wf-svg" xmlns="http://www.w3.org/2000/svg">';
    // Grid lines
    const ticks = 5;
    for(let i=0;i<=ticks;i++){
      const v = minV + (range/ticks)*i;
      const y = scale(v);
      svg += '<line x1="'+pad.l+'" y1="'+y+'" x2="'+(W-pad.r)+'" y2="'+y+'" stroke="rgba(255,255,255,0.06)" />';
      svg += '<text x="'+(pad.l-8)+'" y="'+(y+3)+'" fill="#71717a" font-size="9" text-anchor="end" font-family="var(--mono)">'+fmtSen(v)+'</text>';
    }
    // Zero line
    const y0 = scale(0);
    svg += '<line x1="'+pad.l+'" y1="'+y0+'" x2="'+(W-pad.r)+'" y2="'+y0+'" stroke="rgba(255,255,255,0.12)" />';

    // Bars
    bars.forEach(b => {
      const color = b.isTotal ? 'var(--primary)' : b.value >= 0 ? 'var(--positive)' : 'var(--negative)';
      svg += '<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+Math.max(b.h,1)+'" fill="'+color+'" rx="3" opacity="0.85"/>';
      // Label
      const ly = b.value >= 0 ? b.y - 5 : b.y + b.h + 12;
      svg += '<text x="'+(b.x+b.w/2)+'" y="'+ly+'" fill="var(--text)" font-size="9" text-anchor="middle" font-family="var(--mono)">'+fmtSen(b.value)+'</text>';
      // X label
      svg += '<text x="'+(b.x+b.w/2)+'" y="'+(H-pad.b+15)+'" fill="var(--text2)" font-size="9" text-anchor="middle">'+b.name+'</text>';
    });

    svg += '</svg>';

    const container = el('div',{class:'wf-container'});
    container.innerHTML = svg;

    // Legend
    const legend = el('div',{class:'wf-legend'});
    [['var(--primary)','合計'],['var(--positive)','増加'],['var(--negative)','減少']].forEach(([c,l])=>{
      const item = el('div',{class:'wf-legend-item'});
      item.append(el('div',{class:'wf-legend-dot',style:{background:c}}));
      item.append(l);
      legend.append(item);
    });
    container.append(legend);
    parent.append(container);
  }

  // ── Hourly ──
  function renderHourly(parent){
    parent.append(el('h2',{},'時間帯別売上分析'));
    if(D.ctsRecords.length === 0){
      parent.append(el('div',{class:'subtitle'},'時間帯データなし'));
      return;
    }

    // Aggregate by hour
    const hourly = new Map();
    D.ctsRecords.forEach(r => {
      r.timeSlots.forEach(ts => {
        const prev = hourly.get(ts.hour) || {amount:0,quantity:0};
        prev.amount += ts.amount;
        prev.quantity += ts.quantity;
        hourly.set(ts.hour, prev);
      });
    });

    // Previous year hourly
    const prevHourly = new Map();
    D.ctsPrevRecords.forEach(r => {
      r.timeSlots.forEach(ts => {
        const prev = prevHourly.get(ts.hour) || {amount:0,quantity:0};
        prev.amount += ts.amount;
        prev.quantity += ts.quantity;
        prevHourly.set(ts.hour, prev);
      });
    });

    const hours = [];
    for(let h=0;h<24;h++){
      const cur = hourly.get(h);
      const prev = prevHourly.get(h);
      if(cur || prev) hours.push({hour:h, amount:cur?.amount??0, quantity:cur?.quantity??0,
        prevAmount:prev?.amount??0, prevQuantity:prev?.quantity??0});
    }
    if(hours.length === 0){ parent.append(el('div',{class:'subtitle'},'データなし')); return; }

    const maxAmt = Math.max(...hours.map(h=>Math.max(h.amount, h.prevAmount)));

    // Bar chart
    const barsDiv = el('div',{class:'hourly-bars'});
    hours.forEach(h => {
      const wrap = el('div',{class:'hourly-bar-wrap'});
      const pct = maxAmt > 0 ? h.amount/maxAmt*100 : 0;
      const prevPct = maxAmt > 0 ? h.prevAmount/maxAmt*100 : 0;

      if(D.prevYear.hasPrevYear && h.prevAmount > 0){
        wrap.append(el('div',{class:'hourly-bar',style:{height:prevPct+'%',background:'rgba(99,102,241,0.3)'}}));
      }
      wrap.append(el('div',{class:'hourly-bar',style:{height:pct+'%',background:'var(--primary)'}}));
      wrap.append(el('div',{class:'hourly-label'},h.hour+'時'));
      barsDiv.append(wrap);
    });
    parent.append(barsDiv);

    // Hourly table
    const table = el('table',{class:'drill-table'});
    const thead = el('thead');
    const hr = el('tr');
    ['時間帯','売上','構成比','点数','前年売上','前年比'].forEach(l => hr.append(el('th',{},l)));
    thead.append(hr);
    table.append(thead);

    const totalAmt = hours.reduce((s,h)=>s+h.amount,0);
    const tbody = el('tbody');
    hours.forEach(h => {
      const tr = el('tr');
      tr.append(el('td',{},h.hour+'時'));
      tr.append(el('td',{class:'mono'},fmtCurrency(h.amount)));
      tr.append(el('td',{class:'mono'},fmtPct(totalAmt>0?h.amount/totalAmt:0)));
      tr.append(el('td',{class:'mono'},h.quantity.toLocaleString()));
      tr.append(el('td',{class:'mono'},h.prevAmount>0?fmtCurrency(h.prevAmount):'-'));
      if(h.prevAmount > 0){
        const r = h.amount/h.prevAmount;
        tr.append(el('td',{class:'mono',style:{color:condColor(r-1)}},fmtPct(r)));
      } else {
        tr.append(el('td',{},'-'));
      }
      tbody.append(tr);
    });
    table.append(tbody);
    parent.append(table);
  }

  // ── Drill ──
  function renderDrill(parent){
    parent.append(el('h2',{},'カテゴリドリルダウン'));
    if(D.ctsRecords.length === 0){
      parent.append(el('div',{class:'subtitle'},'CTS データなし'));
      return;
    }

    if(!window._drillLevel) window._drillLevel = 'department';
    if(!window._drillFilter) window._drillFilter = {};

    const tabs = el('div',{class:'tabs'});
    [['department','部門'],['line','ライン'],['klass','クラス']].forEach(([lv,label]) => {
      tabs.append(el('div',{class:'tab'+(window._drillLevel===lv?' active':''),
        onclick:()=>{window._drillLevel=lv;window._drillFilter={};render();}},label));
    });
    parent.append(tabs);

    // Breadcrumb
    if(Object.keys(window._drillFilter).length > 0){
      const bc = el('div',{class:'subtitle',style:{cursor:'pointer'},onclick:()=>{window._drillFilter={};render();}},
        '\\u2190 フィルタ解除: '+Object.values(window._drillFilter).join(' > '));
      parent.append(bc);
    }

    // Aggregate
    const level = window._drillLevel;
    const filter = window._drillFilter;
    let filtered = D.ctsRecords;
    let filteredPrev = D.ctsPrevRecords;
    if(filter.deptCode){
      filtered = filtered.filter(r=>r.deptCode===filter.deptCode);
      filteredPrev = filteredPrev.filter(r=>r.deptCode===filter.deptCode);
    }
    if(filter.lineCode){
      filtered = filtered.filter(r=>r.lineCode===filter.lineCode);
      filteredPrev = filteredPrev.filter(r=>r.lineCode===filter.lineCode);
    }

    const agg = new Map();
    filtered.forEach(r => {
      let key, name;
      if(level==='department'){key=r.deptCode;name=r.deptName;}
      else if(level==='line'){key=r.lineCode;name=r.lineName;}
      else {key=r.klassCode;name=r.klassName;}
      const ex = agg.get(key)||{code:key,name:name||key,amount:0,quantity:0};
      ex.amount+=r.totalAmount; ex.quantity+=r.totalQuantity;
      agg.set(key, ex);
    });

    const prevAgg = new Map();
    filteredPrev.forEach(r => {
      let key, name;
      if(level==='department'){key=r.deptCode;name=r.deptName;}
      else if(level==='line'){key=r.lineCode;name=r.lineName;}
      else {key=r.klassCode;name=r.klassName;}
      const ex = prevAgg.get(key)||{code:key,name:name||key,amount:0,quantity:0};
      ex.amount+=r.totalAmount; ex.quantity+=r.totalQuantity;
      prevAgg.set(key, ex);
    });

    const items = [...agg.values()].sort((a,b)=>b.amount-a.amount);
    const totalAmt = items.reduce((s,i)=>s+i.amount,0);

    const COLORS = ['#6366f1','#0e7490','#d97706','#dc2626','#06b6d4','#db2777','#7c3aed','#65a30d','#f97316','#14b8a6'];

    const table = el('table',{class:'drill-table'});
    const thead = el('thead');
    const hr = el('tr');
    ['','名称','売上','構成比','点数','前年比','差額'].forEach(l => hr.append(el('th',{},l)));
    thead.append(hr);
    table.append(thead);

    const tbody = el('tbody');
    items.forEach((it,i) => {
      const prev = prevAgg.get(it.code);
      const pct = totalAmt>0?it.amount/totalAmt:0;
      const yoyR = prev&&prev.amount>0?it.amount/prev.amount:null;
      const yoyD = prev?it.amount-prev.amount:null;
      const color = COLORS[i%COLORS.length];

      const canDrill = level==='department'||level==='line';
      const tr = el('tr',{class:canDrill?'clickable':''});
      if(canDrill){
        tr.onclick = () => {
          if(level==='department'){
            window._drillFilter = {...window._drillFilter, deptCode:it.code, deptName:it.name};
            window._drillLevel = 'line';
          } else {
            window._drillFilter = {...window._drillFilter, lineCode:it.code, lineName:it.name};
            window._drillLevel = 'klass';
          }
          render();
        };
      }

      tr.append(el('td',{},el('div',{style:{width:'10px',height:'10px',borderRadius:'2px',background:color}})));
      tr.append(el('td',{},it.name+(canDrill?' \\u25B6':'')));
      tr.append(el('td',{class:'mono'},fmtCurrency(it.amount)));

      const pctCell = el('td');
      pctCell.append(el('span',{class:'mono'},fmtPct(pct)));
      const bar = el('div',{class:'drill-bar'});
      bar.append(el('div',{class:'drill-bar-fill',style:{width:(pct*100)+'%',background:color}}));
      pctCell.append(bar);
      tr.append(pctCell);

      tr.append(el('td',{class:'mono'},it.quantity.toLocaleString()));
      tr.append(el('td',{class:'mono',style:{color:yoyR!=null?condColor(yoyR-1):''}},yoyR!=null?fmtPct(yoyR):'-'));
      tr.append(el('td',{class:'mono',style:{color:yoyD!=null?condColor(yoyD):''}},yoyD!=null?fmtCurrency(yoyD):'-'));
      tbody.append(tr);
    });
    table.append(tbody);
    parent.append(table);
  }

  // ── Day Detail ──
  function renderDayDetail(parent){
    const day = detailDay;
    const rec = dailyMap.get(day);
    const prev = prevMap.get(day);
    const budget = rec?.budget ?? 0;
    const actual = rec?.sales ?? 0;
    const diff = actual - budget;
    const ach = budget > 0 ? actual/budget : 0;
    const DOW = ['日','月','火','水','木','金','土'];
    const dow = DOW[new Date(D.year, D.month-1, day).getDay()];

    const overlay = el('div',{class:'detail-overlay',onclick:()=>{detailDay=null;render();}});
    const panel = el('div',{class:'detail-panel',onclick:e=>e.stopPropagation()});

    const closeBtn = el('button',{class:'detail-close',onclick:()=>{detailDay=null;render();}},'\\u2715');
    panel.append(closeBtn);
    panel.append(el('h2',{style:{marginTop:'0'}},D.month+'月'+day+'日('+dow+')の詳細'));

    // KPIs
    const grid = el('div',{class:'kpi-grid'});
    const addK = (l,v,accent) => {
      const k = el('div',{class:'kpi'});
      if(accent) k.style.borderTopColor = accent;
      k.append(el('div',{class:'kpi-label'},l));
      k.append(el('div',{class:'kpi-value'},v));
      grid.append(k);
    };
    addK('予算', fmtCurrency(budget), 'var(--primary)');
    addK('実績', fmtCurrency(actual), condColor(diff));
    addK('予算差', (diff>=0?'+':'')+fmtCurrency(diff), condColor(diff));
    addK('達成率', fmtPct(ach), achColor(ach));
    if(rec) addK('客数', (rec.customers||0).toLocaleString()+'人', 'var(--info)');
    if(prev && prev.sales > 0){
      const r = actual/prev.sales;
      addK('前年比', fmtPct(r), condColor(r-1));
    }
    panel.append(grid);

    // Cumulative
    const cS = cumSalesMap.get(day)||0;
    const cB = cumBudgetMap.get(day)||0;
    const cP = cumPrevMap.get(day)||0;
    const sr = el('div',{class:'summary-row'});
    [{l:'累計売上',v:fmtCurrency(cS)},{l:'累計予算',v:fmtCurrency(cB)},
     {l:'累計達成率',v:fmtPct(cB>0?cS/cB:0)},{l:'累計前年',v:cP>0?fmtCurrency(cP):'-'}
    ].forEach(({l,v})=>{
      const item = el('div',{class:'summary-item'});
      item.append(el('div',{class:'summary-label'},l));
      item.append(el('div',{class:'summary-value'},v));
      sr.append(item);
    });
    panel.append(sr);

    // Day hourly
    const dayRecords = D.ctsRecords.filter(r=>r.day===day);
    if(dayRecords.length > 0){
      panel.append(el('h3',{},'時間帯別売上'));
      const hourly = new Map();
      dayRecords.forEach(r => {
        r.timeSlots.forEach(ts => {
          const p = hourly.get(ts.hour)||{amount:0,quantity:0};
          p.amount+=ts.amount; p.quantity+=ts.quantity;
          hourly.set(ts.hour, p);
        });
      });
      const hours = [];
      for(let h=0;h<24;h++){
        const v = hourly.get(h);
        if(v) hours.push({hour:h,...v});
      }
      if(hours.length > 0){
        const maxA = Math.max(...hours.map(h=>h.amount));
        const bars = el('div',{class:'hourly-bars',style:{height:'80px'}});
        hours.forEach(h => {
          const w = el('div',{class:'hourly-bar-wrap'});
          w.append(el('div',{class:'hourly-bar',style:{height:(maxA>0?h.amount/maxA*100:0)+'%',background:'var(--primary)'}}));
          w.append(el('div',{class:'hourly-label'},h.hour+''));
          bars.append(w);
        });
        panel.append(bars);
      }

      // Day category breakdown
      panel.append(el('h3',{},'部門別内訳'));
      const deptAgg = new Map();
      dayRecords.forEach(r => {
        const ex = deptAgg.get(r.deptCode)||{name:r.deptName,amount:0,quantity:0};
        ex.amount+=r.totalAmount; ex.quantity+=r.totalQuantity;
        deptAgg.set(r.deptCode, ex);
      });
      const prevDayRecords = D.ctsPrevRecords.filter(r=>r.day===day);
      const prevDeptAgg = new Map();
      prevDayRecords.forEach(r => {
        const ex = prevDeptAgg.get(r.deptCode)||{name:r.deptName,amount:0,quantity:0};
        ex.amount+=r.totalAmount; ex.quantity+=r.totalQuantity;
        prevDeptAgg.set(r.deptCode, ex);
      });

      const depts = [...deptAgg.entries()].sort((a,b)=>b[1].amount-a[1].amount);
      const tbl = el('table',{class:'drill-table'});
      const th = el('tr');
      ['部門','売上','構成比','前年比'].forEach(l=>th.append(el('th',{},l)));
      tbl.append(el('thead',{},th));
      const tb = el('tbody');
      const tAmt = depts.reduce((s,[,v])=>s+v.amount,0);
      depts.forEach(([code,v])=>{
        const tr = el('tr');
        tr.append(el('td',{},v.name));
        tr.append(el('td',{class:'mono'},fmtCurrency(v.amount)));
        tr.append(el('td',{class:'mono'},fmtPct(tAmt>0?v.amount/tAmt:0)));
        const pv = prevDeptAgg.get(code);
        if(pv&&pv.amount>0){
          const r = v.amount/pv.amount;
          tr.append(el('td',{class:'mono',style:{color:condColor(r-1)}},fmtPct(r)));
        } else tr.append(el('td',{},'-'));
        tb.append(tr);
      });
      tbl.append(tb);
      panel.append(tbl);
    }

    overlay.append(panel);
    parent.append(overlay);
  }

  // Initial render
  render();
})();
`
