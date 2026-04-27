/**
 * クリップ JS — ウォーターフォールセクション
 *
 * clipJs.ts から分離。要因分解ウォーターフォールの描画 + SVG 生成。
 *
 * @responsibility R:unclassified
 */

export const CLIP_JS_WATERFALL = `
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
`
