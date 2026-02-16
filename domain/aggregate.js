(function(global){
  function toFiniteNumber(v){
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function defaultDailyBucket(){
    return {
      sales:0,
      shiire:{cost:0,price:0},
      suppliers:{},
      tenkanIn:[],tenkanOut:[],bumonIn:[],bumonOut:[],
      tenkanInTotal:{cost:0,price:0},tenkanOutTotal:{cost:0,price:0},
      bumonInTotal:{cost:0,price:0},bumonOutTotal:{cost:0,price:0},
      hana:{cost:0,price:0},sanchoku:{cost:0,price:0},
      consumable:{cost:0,items:[]},
      baihen:0,baihenAbs:0,baihenRate:0,grossSales:0,
      coreSales:0,coreGrossSales:0,
      overDelivery:false,overDeliveryAmt:0
    };
  }

  function sumCostPriceMap(src, dst){
    if(!src) return;
    Object.entries(src).forEach(function(entry){
      var key = entry[0];
      var value = entry[1];
      if(!dst[key]){
        dst[key] = (value && typeof value==='object') ? Object.assign({}, value) : value;
        if(dst[key] && typeof dst[key]==='object'){
          if(typeof dst[key].cost==='number') dst[key].cost = 0;
          if(typeof dst[key].price==='number') dst[key].price = 0;
          if(typeof dst[key].sales==='number') dst[key].sales = 0;
        }
      }
      if(value && typeof value==='object' && dst[key] && typeof dst[key]==='object'){
        if(typeof value.cost==='number') dst[key].cost = (dst[key].cost||0) + value.cost;
        if(typeof value.price==='number') dst[key].price = (dst[key].price||0) + value.price;
        if(typeof value.sales==='number') dst[key].sales = (dst[key].sales||0) + value.sales;
        if(value.usePriceCalc) dst[key].usePriceCalc = true;
        if(value.name && !dst[key].name) dst[key].name = value.name;
      }else if(typeof value==='number'){
        dst[key] = (dst[key]||0) + value;
      }
    });
  }

  function buildAggregate(input, scope){
    input = input || {};
    scope = scope || {};
    var source = input.result || {};
    var defaultMarginRate = Number.isFinite(input.defaultMarginRate) ? input.defaultMarginRate : 0.26;
    var storeIds = Array.isArray(scope.storeIds) ? scope.storeIds.slice() : Object.keys(source).filter(function(id){ return id!=='all' && id!=='__sel__'; });
    var addStoreTag = !!scope.attachSourceStore;

    var agg = {
      __isAllAggregate: !!scope.markAsAll,
      daily:{},
      catTotals:{},
      supTotals:{},
      dailyTotals:{},
      budgetDaily:{},
      transferDetails:{tenkanIn:[],tenkanOut:[],bumonIn:[],bumonOut:[]}
    };

    var sumSales=0,sumGP=0,sumInvStart=0,sumInvEnd=0,sumBudget=0,sumBudgetConsumed=0,sumGPBudget=0;
    var weightedCoreSales=0,weightedMargin=0;

    function addDaily(srcDaily){
      if(!srcDaily) return;
      Object.entries(srcDaily).forEach(function(entry){
        var day = String(entry[0]);
        var d = entry[1] || {};
        var dst = agg.daily[day] || (agg.daily[day] = defaultDailyBucket());

        dst.sales += toFiniteNumber(d.sales);
        if(d.shiire){ dst.shiire.cost += toFiniteNumber(d.shiire.cost); dst.shiire.price += toFiniteNumber(d.shiire.price); }

        if(d.suppliers){
          Object.entries(d.suppliers).forEach(function(svEntry){
            var sc = svEntry[0];
            var sv = svEntry[1] || {};
            if(!dst.suppliers[sc]) dst.suppliers[sc] = Object.assign({}, sv, {cost:0,price:0});
            dst.suppliers[sc].cost += toFiniteNumber(sv.cost);
            dst.suppliers[sc].price += toFiniteNumber(sv.price);
            if(sv.usePriceCalc) dst.suppliers[sc].usePriceCalc = true;
          });
        }

        ['tenkanIn','tenkanOut','bumonIn','bumonOut'].forEach(function(k){
          (d[k]||[]).forEach(function(x){ dst[k].push(Object.assign({}, x)); });
        });

        ['tenkanInTotal','tenkanOutTotal','bumonInTotal','bumonOutTotal'].forEach(function(k){
          if(!d[k]) return;
          dst[k].cost += toFiniteNumber(d[k].cost);
          dst[k].price += toFiniteNumber(d[k].price);
        });

        if(d.hana){ dst.hana.cost += toFiniteNumber(d.hana.cost); dst.hana.price += toFiniteNumber(d.hana.price); }
        if(d.sanchoku){ dst.sanchoku.cost += toFiniteNumber(d.sanchoku.cost); dst.sanchoku.price += toFiniteNumber(d.sanchoku.price); }
        if(d.consumable){ dst.consumable.cost += toFiniteNumber(d.consumable.cost); }

        var baihenRaw = toFiniteNumber(d.baihen);
        var baihenAbs = (d.baihenAbs!=null) ? toFiniteNumber(d.baihenAbs) : Math.abs(baihenRaw);
        dst.baihen += baihenRaw;
        dst.baihenAbs += baihenAbs;

        dst.coreSales += toFiniteNumber(d.coreSales);
        dst.coreGrossSales += toFiniteNumber(d.coreGrossSales);

        if(d.overDelivery){
          dst.overDelivery = true;
          dst.overDeliveryAmt += toFiniteNumber(d.overDeliveryAmt);
        }
      });
    }

    storeIds.forEach(function(sid){
      var d = source[sid];
      if(!d) return;

      sumInvStart += toFiniteNumber(d.invStart);
      sumInvEnd += toFiniteNumber(d.invEnd);
      if(d.budget!=null) sumBudget += toFiniteNumber(d.budget);
      if(d.budgetConsumed!=null) sumBudgetConsumed += toFiniteNumber(d.budgetConsumed);
      if(d.gpBudget!=null) sumGPBudget += toFiniteNumber(d.gpBudget);

      addDaily(d.daily);
      sumCostPriceMap(d.catTotals, agg.catTotals);
      sumCostPriceMap(d.supTotals, agg.supTotals);
      sumCostPriceMap(d.dailyTotals, agg.dailyTotals);

      if(d.budgetDaily){
        Object.entries(d.budgetDaily).forEach(function(entry){
          var k = entry[0];
          var v = entry[1];
          agg.budgetDaily[k] = toFiniteNumber(agg.budgetDaily[k]) + toFiniteNumber(v);
        });
      }

      if(d.transferDetails){
        ['tenkanIn','tenkanOut','bumonIn','bumonOut'].forEach(function(k){
          (d.transferDetails[k]||[]).forEach(function(t){
            var row = Object.assign({}, t);
            if(addStoreTag) row._store = sid;
            agg.transferDetails[k].push(row);
          });
        });
      }

      sumSales += toFiniteNumber(d.totalSales);
      sumGP += toFiniteNumber(d.grossProfit);
      weightedCoreSales += toFiniteNumber(d.totalCoreSales);
      if(d.coreMarginRate!=null) weightedMargin += toFiniteNumber(d.coreMarginRate) * toFiniteNumber(d.totalCoreSales);
    });

    agg.totalSales = sumSales;
    agg.grossProfit = sumGP;
    agg.grossProfitRate = sumSales>0 ? (sumGP/sumSales) : 0;
    agg.estimatedGrossRate = agg.grossProfitRate;

    agg.invStart = sumInvStart;
    agg.invEnd = sumInvEnd;
    agg.estimatedInvEnd = sumInvEnd;

    agg.budget = sumBudget;
    agg.budgetConsumed = sumBudgetConsumed;
    agg.gpBudget = sumGPBudget>0 ? sumGPBudget : null;

    agg.totalCost = Object.values(agg.catTotals).reduce(function(s,c){ return s + toFiniteNumber(c && c.cost); }, 0);
    agg.totalPrice = Object.values(agg.catTotals).reduce(function(s,c){ return s + toFiniteNumber(c && c.price); }, 0);

    var hanaCost = toFiniteNumber(agg.catTotals.hana && agg.catTotals.hana.cost);
    var hanaPrice = toFiniteNumber(agg.catTotals.hana && agg.catTotals.hana.price);
    var sanchokuCost = toFiniteNumber(agg.catTotals.sanchoku && agg.catTotals.sanchoku.cost);
    var sanchokuPrice = toFiniteNumber(agg.catTotals.sanchoku && agg.catTotals.sanchoku.price);
    agg.deliverySalesCost = hanaCost + sanchokuCost;
    agg.deliverySalesPrice = hanaPrice + sanchokuPrice;

    agg.totalConsumable = toFiniteNumber(agg.catTotals.consumable && agg.catTotals.consumable.cost);
    agg.coreCost = agg.totalCost - agg.deliverySalesCost - agg.totalConsumable;
    agg.corePrice = agg.totalPrice - agg.deliverySalesPrice - agg.totalConsumable;
    agg.totalCoreSales = Object.values(agg.daily).reduce(function(s,d){ return s + toFiniteNumber(d && d.coreSales); }, 0);
    agg.totalBaihen = Object.values(agg.daily).reduce(function(s,d){ return s + toFiniteNumber(d && d.baihenAbs); }, 0);

    var totalGrossSales = agg.totalSales + agg.totalBaihen;
    agg.baihenRateSales = totalGrossSales>0 ? (agg.totalBaihen/totalGrossSales) : 0;

    agg.coreMarginRate = agg.corePrice>0 ? ((agg.corePrice-agg.coreCost)/agg.corePrice) : null;
    if(agg.coreMarginRate==null && weightedCoreSales>0) agg.coreMarginRate = weightedMargin/weightedCoreSales;
    if(agg.coreMarginRate==null) agg.coreMarginRate = defaultMarginRate;

    agg.avgMargin = agg.totalPrice>0 ? ((agg.totalPrice-agg.totalCost)/agg.totalPrice) : agg.coreMarginRate;

    return agg;
  }

  global.buildAggregate = buildAggregate;
  if(typeof module!=='undefined' && module.exports){
    module.exports = { buildAggregate: buildAggregate };
  }
})(typeof window!=='undefined' ? window : globalThis);
