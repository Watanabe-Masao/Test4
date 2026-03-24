/**
 * クリップ JS — ドリルダウンセクション
 *
 * clipJs.ts から分離。カテゴリドリルダウンビューの描画。
 */

export const CLIP_JS_DRILL = `
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
`
