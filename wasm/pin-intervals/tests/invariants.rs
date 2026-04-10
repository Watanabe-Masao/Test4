//! Mathematical invariants for pin interval calculations.
//!
//! Pin intervals use the inventory method: COGS = Opening + Purchases - Closing.
//! GP = Sales - COGS. GPR = GP / Sales.
//!
//! @contractId BIZ-011
//! @see references/03-guides/invariant-catalog.md

use pin_intervals_wasm::pin_intervals::calculate_pin_intervals;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

struct Scenario {
    label: &'static str,
    sales: Vec<f64>,
    cost: Vec<f64>,
    opening: f64,
    pin_days: Vec<u32>,
    pin_closing: Vec<f64>,
    days: u32,
}

fn make_scenarios() -> Vec<Scenario> {
    vec![
        Scenario {
            label: "uniform 30d single pin",
            sales: vec![1000.0; 30], cost: vec![700.0; 30],
            opening: 50000.0, pin_days: vec![30], pin_closing: vec![62000.0], days: 30,
        },
        Scenario {
            label: "uniform 30d two pins",
            sales: vec![1000.0; 30], cost: vec![700.0; 30],
            opening: 50000.0, pin_days: vec![15, 30], pin_closing: vec![55000.0, 62000.0], days: 30,
        },
        Scenario {
            label: "large values",
            sales: vec![1e8; 31], cost: vec![7e7; 31],
            opening: 1e10, pin_days: vec![31], pin_closing: vec![1.2e10], days: 31,
        },
        Scenario {
            label: "zero sales",
            sales: vec![0.0; 10], cost: vec![50.0; 10],
            opening: 1000.0, pin_days: vec![10], pin_closing: vec![1500.0], days: 10,
        },
        Scenario {
            label: "4 pins",
            sales: vec![100.0; 28], cost: vec![70.0; 28],
            opening: 5000.0, pin_days: vec![7, 14, 21, 28],
            pin_closing: vec![5200.0, 5400.0, 5600.0, 5800.0], days: 28,
        },
    ]
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-1: COGS identity
//   COGS = openingInventory + totalPurchaseCost - closingInventory
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_1_cogs_identity() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        for interval in &r {
            let expected_cogs = interval.opening_inventory + interval.total_purchase_cost - interval.closing_inventory;
            assert_close(interval.cogs, expected_cogs, 1e-10);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-2: Gross profit identity
//   grossProfit = totalSales - COGS
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_2_gross_profit_identity() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        for interval in &r {
            assert_close(interval.gross_profit, interval.total_sales - interval.cogs, 1e-10);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-3: Gross profit rate identity
//   grossProfitRate = grossProfit / totalSales (or 0 if totalSales = 0)
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_3_gpr_identity() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        for interval in &r {
            if interval.total_sales != 0.0 {
                assert_close(
                    interval.gross_profit_rate,
                    interval.gross_profit / interval.total_sales,
                    1e-10,
                );
            } else {
                assert_eq!(interval.gross_profit_rate, 0.0);
            }
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-4: Chain continuity
//   interval[i].openingInventory === interval[i-1].closingInventory
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_4_chain_continuity() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        if r.len() > 1 {
            for i in 1..r.len() {
                assert_eq!(
                    r[i].opening_inventory, r[i - 1].closing_inventory,
                    "FAIL [{}]: chain break at interval {}", s.label, i,
                );
            }
        }
        // First interval opening = function opening
        if !r.is_empty() {
            let expected_opening = if s.opening.is_nan() { 0.0 } else { s.opening };
            assert_eq!(r[0].opening_inventory, expected_opening);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-5: Day coverage (no gaps, no overlaps)
//   interval[i].endDay + 1 === interval[i+1].startDay
//   interval[0].startDay === 1
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_5_day_coverage() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        if r.is_empty() { continue; }
        assert_eq!(r[0].start_day, 1, "FAIL [{}]: first interval should start at 1", s.label);
        for i in 1..r.len() {
            assert_eq!(
                r[i].start_day, r[i - 1].end_day + 1,
                "FAIL [{}]: gap/overlap between intervals {} and {}", s.label, i - 1, i,
            );
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-6: Finite guarantee
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_6_finite_guarantee() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        for interval in &r {
            assert!(interval.cogs.is_finite(), "FAIL [{}]: COGS not finite", s.label);
            assert!(interval.gross_profit.is_finite(), "FAIL [{}]: GP not finite", s.label);
            assert!(interval.gross_profit_rate.is_finite(), "FAIL [{}]: GPR not finite", s.label);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// PIN-INV-7: Sales sum consistency
//   Σ interval.totalSales === Σ daily_sales[0..last_pin_day]
// ════════════════════════════════════════════════════════════════

#[test]
fn pin_inv_7_sales_sum_consistency() {
    for s in make_scenarios() {
        let r = calculate_pin_intervals(&s.sales, &s.cost, s.opening, &s.pin_days, &s.pin_closing, s.days);
        if r.is_empty() { continue; }
        let last_day = *s.pin_days.last().unwrap() as usize;
        let expected_total: f64 = s.sales[..last_day].iter().sum();
        let actual_total: f64 = r.iter().map(|i| i.total_sales).sum();
        assert_close(actual_total, expected_total, 1e-6);
    }
}
