/**
 * クリップ JS — 日別詳細セクション
 *
 * clipJs.ts から分離。日別詳細オーバーレイの描画。
 */

export const CLIP_JS_DETAIL = `
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
`
