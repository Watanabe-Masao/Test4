const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAggregate } = require('./aggregate.js');

test('buildAggregate aggregates inventory/gp/margin/transfer/budget/baihen', () => {
  const input = {
    result: {
      '1': {
        invStart: 100, invEnd: 80,
        budget: 1000, budgetConsumed: 300, gpBudget: 200,
        totalSales: 500, grossProfit: 90,
        totalCoreSales: 400, coreMarginRate: 0.2,
        catTotals: {
          market: { cost: 180, price: 240 },
          hana: { cost: 40, price: 50 },
          consumable: { cost: 10, price: 10 },
        },
        daily: {
          1: { sales: 200, baihen: -5, baihenAbs: 5, coreSales: 160, suppliers:{}, shiire:{cost:80,price:100}, tenkanIn:[],tenkanOut:[],bumonIn:[],bumonOut:[], tenkanInTotal:{cost:0,price:0},tenkanOutTotal:{cost:0,price:0},bumonInTotal:{cost:0,price:0},bumonOutTotal:{cost:0,price:0}, hana:{cost:20,price:25},sanchoku:{cost:0,price:0},consumable:{cost:4}},
        },
        budgetDaily: { 1: 100, 2: 100 },
        transferDetails: { tenkanIn:[{day:1,cost:10}], tenkanOut:[], bumonIn:[], bumonOut:[] },
      },
      '2': {
        invStart: 200, invEnd: 150,
        budget: 2000, budgetConsumed: 500, gpBudget: 400,
        totalSales: 700, grossProfit: 140,
        totalCoreSales: 500, coreMarginRate: 0.3,
        catTotals: {
          market: { cost: 250, price: 360 },
          sanchoku: { cost: 50, price: 70 },
          consumable: { cost: 20, price: 20 },
        },
        daily: {
          1: { sales: 300, baihen: -7, baihenAbs: 7, coreSales: 210, suppliers:{}, shiire:{cost:100,price:130}, tenkanIn:[],tenkanOut:[],bumonIn:[],bumonOut:[], tenkanInTotal:{cost:0,price:0},tenkanOutTotal:{cost:0,price:0},bumonInTotal:{cost:0,price:0},bumonOutTotal:{cost:0,price:0}, hana:{cost:0,price:0},sanchoku:{cost:20,price:28},consumable:{cost:6}},
        },
        budgetDaily: { 1: 200 },
        transferDetails: { tenkanIn:[], tenkanOut:[{day:1,cost:-8}], bumonIn:[], bumonOut:[] },
      }
    },
    defaultMarginRate: 0.26,
  };

  const agg = buildAggregate(input, { storeIds: ['1', '2'], attachSourceStore: true });

  assert.equal(agg.invStart, 300);
  assert.equal(agg.invEnd, 230);
  assert.equal(agg.budget, 3000);
  assert.equal(agg.gpBudget, 600);
  assert.equal(agg.totalSales, 1200);
  assert.equal(agg.grossProfit, 230);
  assert.equal(agg.transferDetails.tenkanIn.length, 1);
  assert.equal(agg.transferDetails.tenkanIn[0]._store, '1');
  assert.equal(agg.transferDetails.tenkanOut.length, 1);
  assert.equal(agg.budgetDaily['1'], 300);
  assert.equal(agg.totalBaihen, 12);
  assert.equal(agg.baihenRateSales, 12 / 1212);
  assert.equal(agg.coreMarginRate, (600 - 430) / 600);
});


test('repository has no unresolved merge conflict markers', () => {
  const fs = require('node:fs');
  const path = require('node:path');

  const roots = [
    path.join(__dirname, '..', 'domain'),
    path.join(__dirname, '..', 'shiire_arari_v10_multistore_flowview_ES5_20260216_022229_fixed_v23.html'),
  ];

  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stat = fs.statSync(root);
    if (stat.isFile()) {
      files.push(root);
      continue;
    }
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop();
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const s = fs.statSync(full);
        if (s.isDirectory()) stack.push(full);
        else files.push(full);
      }
    }
  }

  const markerRe = /^(<<<<<<<|=======|>>>>>>>)/m;
  const offenders = files.filter((f) => markerRe.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});
