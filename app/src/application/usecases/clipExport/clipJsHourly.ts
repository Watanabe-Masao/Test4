/**
 * クリップ JS — 時間帯分析セクション
 *
 * clipJs.ts から分離。時間帯別売上分析ビューの描画。
 */

export const CLIP_JS_HOURLY = `
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
`
