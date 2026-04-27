/**
 * クリップ JS — カレンダーセクション
 *
 * clipJs.ts から分離。月間カレンダービューの描画。
 *
 * @responsibility R:unclassified
 */

export const CLIP_JS_CALENDAR = `
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
`
