//! Edge cases: boundary conditions, extreme values.
//!
//! @contractId BIZ-011

use pin_intervals_wasm::pin_intervals::calculate_pin_intervals;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

// ════════════════════════════════════════════════════════════════
// Single-day intervals
// ════════════════════════════════════════════════════════════════

#[test]
fn single_day_interval() {
    let r = calculate_pin_intervals(&[500.0], &[300.0], 1000.0, &[1], &[1200.0], 1);
    assert_eq!(r[0].start_day, 1);
    assert_eq!(r[0].end_day, 1);
    assert_eq!(r[0].total_sales, 500.0);
    // COGS = 1000 + 300 - 1200 = 100
    assert_eq!(r[0].cogs, 100.0);
}

#[test]
fn every_day_pinned() {
    // Pin every day → 5 single-day intervals
    let sales = vec![100.0; 5];
    let cost = vec![70.0; 5];
    let r = calculate_pin_intervals(
        &sales, &cost, 500.0,
        &[1, 2, 3, 4, 5], &[530.0, 560.0, 590.0, 620.0, 650.0], 5,
    );
    assert_eq!(r.len(), 5);
    for (i, interval) in r.iter().enumerate() {
        assert_eq!(interval.start_day, (i + 1) as u32);
        assert_eq!(interval.end_day, (i + 1) as u32);
    }
}

// ════════════════════════════════════════════════════════════════
// Zero values
// ════════════════════════════════════════════════════════════════

#[test]
fn zero_sales_zero_rate() {
    let r = calculate_pin_intervals(&[0.0; 10], &[50.0; 10], 1000.0, &[10], &[1500.0], 10);
    assert_eq!(r[0].total_sales, 0.0);
    assert_eq!(r[0].gross_profit_rate, 0.0); // safeDivide fallback
}

#[test]
fn zero_everything() {
    let r = calculate_pin_intervals(&[0.0; 5], &[0.0; 5], 0.0, &[5], &[0.0], 5);
    assert_eq!(r[0].cogs, 0.0);
    assert_eq!(r[0].gross_profit, 0.0);
    assert_eq!(r[0].gross_profit_rate, 0.0);
}

// ════════════════════════════════════════════════════════════════
// Large values
// ════════════════════════════════════════════════════════════════

#[test]
fn large_values_finite() {
    let sales = vec![1e8; 30];
    let cost = vec![7e7; 30];
    let r = calculate_pin_intervals(&sales, &cost, 1e10, &[30], &[1.2e10], 30);
    assert!(r[0].cogs.is_finite());
    assert!(r[0].gross_profit.is_finite());
    assert!(r[0].gross_profit_rate.is_finite());
}

// ════════════════════════════════════════════════════════════════
// Negative gross profit (loss)
// ════════════════════════════════════════════════════════════════

#[test]
fn negative_gross_profit() {
    // COGS > Sales → negative GP
    let r = calculate_pin_intervals(&[100.0; 10], &[200.0; 10], 5000.0, &[10], &[5500.0], 10);
    // COGS = 5000 + 2000 - 5500 = 1500, GP = 1000 - 1500 = -500
    assert!(r[0].gross_profit < 0.0);
    assert!(r[0].gross_profit_rate < 0.0);
}

// ════════════════════════════════════════════════════════════════
// Chain continuity
// ════════════════════════════════════════════════════════════════

#[test]
fn chain_opening_equals_prev_closing() {
    let sales = vec![100.0; 20];
    let cost = vec![70.0; 20];
    let r = calculate_pin_intervals(
        &sales, &cost, 1000.0,
        &[5, 10, 15, 20], &[1100.0, 1200.0, 1300.0, 1400.0], 20,
    );
    for i in 1..r.len() {
        assert_eq!(r[i].opening_inventory, r[i - 1].closing_inventory,
            "interval {} opening should equal interval {} closing", i, i - 1);
    }
}
