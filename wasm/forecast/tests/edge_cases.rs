//! Edge case tests for forecast functions.
//!
//! Covers: empty, single, extreme values, negative, very small differences.

use forecast_wasm::anomalies::detect_anomalies;
use forecast_wasm::regression::linear_regression;
use forecast_wasm::stddev::calculate_stddev;
use forecast_wasm::trend::analyze_trend;
use forecast_wasm::wma::calculate_wma;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a,
        b,
        (a - b).abs(),
        tol
    );
}

/* ── Empty arrays ── */

#[test]
fn stddev_empty() {
    let r = calculate_stddev(&[]);
    assert_eq!(r.mean, 0.0);
    assert_eq!(r.std_dev, 0.0);
}

#[test]
fn regression_empty() {
    let r = linear_regression(&[], &[]);
    assert_eq!(r.slope, 0.0);
    assert_eq!(r.intercept, 0.0);
    assert_eq!(r.r_squared, 0.0);
}

#[test]
fn wma_empty() {
    let r = calculate_wma(&[], &[], 5);
    assert!(r.is_empty());
}

#[test]
fn anomalies_empty() {
    let r = detect_anomalies(&[], &[], 2.0);
    assert!(r.is_empty());
}

#[test]
fn trend_empty() {
    let r = analyze_trend(&[], &[], &[]);
    assert!(r.mom_changes.is_empty());
    assert_eq!(r.seasonal_index.len(), 12);
    assert_eq!(r.overall_trend, 2); // flat
    assert_close(r.average_monthly_sales, 0.0, 1e-10);
}

/* ── Single element ── */

#[test]
fn stddev_single() {
    let r = calculate_stddev(&[42.0]);
    assert_close(r.mean, 42.0, 1e-10);
    assert_close(r.std_dev, 0.0, 1e-10);
}

#[test]
fn wma_single() {
    let r = calculate_wma(&[1.0], &[100.0], 5);
    assert_eq!(r.len(), 1);
    assert_close(r[0].wma, 100.0, 1e-10);
}

/* ── Very large values (1e15 scale) ── */

#[test]
fn stddev_large_values() {
    let values = [1e15, 1.001e15, 0.999e15, 1.002e15, 0.998e15];
    let r = calculate_stddev(&values);
    assert!(r.mean.is_finite());
    assert!(r.std_dev.is_finite());
    assert!(r.std_dev >= 0.0);
}

#[test]
fn regression_large_values() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
    let vals = [1e15, 2e15, 3e15, 4e15, 5e15];
    let r = linear_regression(&keys, &vals);
    assert!(r.slope.is_finite());
    assert!(r.r_squared >= 0.0);
    assert!(r.r_squared <= 1.0 + 1e-10);
}

/* ── Very small differences ── */

#[test]
fn stddev_tiny_differences() {
    let values = [1.0, 1.0 + 1e-12, 1.0 - 1e-12, 1.0 + 2e-12, 1.0];
    let r = calculate_stddev(&values);
    assert!(r.std_dev >= 0.0);
    assert!(r.std_dev.is_finite());
}

/* ── Negative values ── */

#[test]
fn stddev_negative_values() {
    let values = [-100.0, -200.0, -300.0, -400.0, -500.0];
    let r = calculate_stddev(&values);
    assert_close(r.mean, -300.0, 1e-10);
    assert!(r.std_dev >= 0.0);
}

#[test]
fn regression_negative_slope() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
    let vals = [500.0, 400.0, 300.0, 200.0, 100.0];
    let r = linear_regression(&keys, &vals);
    assert_close(r.slope, -100.0, 1e-10);
    assert_close(r.r_squared, 1.0, 1e-10);
}

/* ── Anomaly edge cases ── */

#[test]
fn anomalies_exactly_3_entries() {
    let keys = [1.0, 2.0, 3.0];
    let vals = [100.0, 100.0, 100.0];
    let r = detect_anomalies(&keys, &vals, 2.0);
    // All same → stdDev == 0 → empty
    assert!(r.is_empty());
}

#[test]
fn anomalies_single_outlier() {
    let mut vals = vec![100.0; 100];
    let keys: Vec<f64> = (1..=100).map(|i| i as f64).collect();
    vals[99] = 10000.0; // extreme outlier
    let r = detect_anomalies(&keys, &vals, 2.0);
    assert!(!r.is_empty());
    assert!(r[0].is_anomaly);
}

/* ── WMA edge cases ── */

#[test]
fn wma_window_equals_length() {
    let keys = [1.0, 2.0, 3.0];
    let vals = [100.0, 200.0, 300.0];
    let r = calculate_wma(&keys, &vals, 3);
    assert_eq!(r.len(), 3);
    // First two: actual
    assert_close(r[0].wma, 100.0, 1e-10);
    assert_close(r[1].wma, 200.0, 1e-10);
    // Third: (100*1 + 200*2 + 300*3) / 6
    assert_close(r[2].wma, 1400.0 / 6.0, 1e-10);
}

#[test]
fn wma_window_exceeds_length() {
    let keys = [1.0, 2.0, 3.0];
    let vals = [100.0, 200.0, 300.0];
    let r = calculate_wma(&keys, &vals, 10);
    // Fewer than window → each entry's wma = actual
    assert_eq!(r.len(), 3);
    for entry in &r {
        assert_close(entry.wma, entry.actual, 1e-10);
    }
}

/* ── Trend edge cases ── */

#[test]
fn trend_single_month() {
    let r = analyze_trend(&[2024.0], &[1.0], &[100000.0]);
    assert_eq!(r.mom_changes.len(), 1);
    assert!(r.mom_changes[0].is_nan()); // First is always null/NaN
    assert_eq!(r.seasonal_index.len(), 12);
}

#[test]
fn trend_unsorted_input() {
    // Provide data out of order — function should sort internally
    let years = [2024.0, 2024.0, 2024.0];
    let months = [3.0, 1.0, 2.0];
    let sales = [300.0, 100.0, 200.0];
    let r = analyze_trend(&years, &months, &sales);
    // After sorting: [100, 200, 300] → MoM[1] = 200/100 = 2.0
    assert_close(r.mom_changes[1], 2.0, 1e-10);
}

#[test]
fn trend_zero_sales_mom_null() {
    let years = [2024.0, 2024.0, 2024.0];
    let months = [1.0, 2.0, 3.0];
    let sales = [0.0, 100.0, 200.0];
    let r = analyze_trend(&years, &months, &sales);
    // MoM[1] = 100/0 → null (NaN)
    assert!(r.mom_changes[1].is_nan());
}
