//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/pinIntervals.ts (lines 36-74)
//!
//! @contractId BIZ-011
//! @see references/01-principles/purchase-cost-definition.md

use pin_intervals_wasm::pin_intervals::calculate_pin_intervals;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

// ════════════════════════════════════════════════════════════════
// Golden fixtures: TS pinIntervals.ts lines 36-74
// ════════════════════════════════════════════════════════════════

#[test]
fn golden_single_interval() {
    // 30 days, uniform sales=1000/day, cost=700/day
    // Opening=50000, Closing=62000
    // COGS = 50000 + 21000 - 62000 = 9000
    // GP = 30000 - 9000 = 21000, GPR = 21000/30000 = 0.7
    let sales = vec![1000.0; 30];
    let cost = vec![700.0; 30];
    let r = calculate_pin_intervals(&sales, &cost, 50000.0, &[30], &[62000.0], 30);
    assert_eq!(r.len(), 1);
    assert_eq!(r[0].start_day, 1);
    assert_eq!(r[0].end_day, 30);
    assert_eq!(r[0].total_sales, 30000.0);
    assert_eq!(r[0].total_purchase_cost, 21000.0);
    assert_eq!(r[0].cogs, 9000.0);
    assert_eq!(r[0].gross_profit, 21000.0);
    assert_close(r[0].gross_profit_rate, 0.7, 1e-10);
}

#[test]
fn golden_two_intervals() {
    let sales = vec![1000.0; 30];
    let cost = vec![700.0; 30];
    // Pin at day 15 (closing=55000) and day 30 (closing=62000)
    let r = calculate_pin_intervals(
        &sales, &cost, 50000.0,
        &[15, 30], &[55000.0, 62000.0], 30,
    );
    assert_eq!(r.len(), 2);

    // Interval 1: days 1-15
    assert_eq!(r[0].start_day, 1);
    assert_eq!(r[0].end_day, 15);
    assert_eq!(r[0].opening_inventory, 50000.0);
    assert_eq!(r[0].closing_inventory, 55000.0);
    assert_eq!(r[0].total_sales, 15000.0);
    assert_eq!(r[0].total_purchase_cost, 10500.0);
    // COGS = 50000 + 10500 - 55000 = 5500
    assert_eq!(r[0].cogs, 5500.0);

    // Interval 2: days 16-30
    assert_eq!(r[1].start_day, 16);
    assert_eq!(r[1].end_day, 30);
    assert_eq!(r[1].opening_inventory, 55000.0); // prev closing
    assert_eq!(r[1].closing_inventory, 62000.0);
}

#[test]
fn golden_empty_pins() {
    let r = calculate_pin_intervals(&[100.0; 30], &[70.0; 30], 50000.0, &[], &[], 30);
    assert!(r.is_empty());
}

#[test]
fn golden_null_opening() {
    // openingInventory = NaN (null) → treated as 0
    let sales = vec![100.0; 10];
    let cost = vec![80.0; 10];
    let r = calculate_pin_intervals(&sales, &cost, f64::NAN, &[10], &[500.0], 10);
    assert_eq!(r[0].opening_inventory, 0.0);
    // COGS = 0 + 800 - 500 = 300
    assert_eq!(r[0].cogs, 300.0);
}

#[test]
fn golden_sparse_daily_data() {
    // Only some days have data (others = 0)
    let mut sales = vec![0.0; 30];
    let mut cost = vec![0.0; 30];
    for d in [0, 4, 9, 14, 19, 24, 29] {
        sales[d] = 1000.0;
        cost[d] = 700.0;
    }
    let r = calculate_pin_intervals(&sales, &cost, 10000.0, &[30], &[12000.0], 30);
    assert_eq!(r[0].total_sales, 7000.0);
    assert_eq!(r[0].total_purchase_cost, 4900.0);
}
