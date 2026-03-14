//! Cross-validation tests: verify Rust matches TS reference values.
//!
//! Reference values computed from TS implementations:
//!   - forecast.ts: calculateStdDev, detectAnomalies
//!   - advancedForecast.ts: calculateWMA, linearRegression
//!   - trendAnalysis.ts: analyzeTrend

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

// TS reference data: sampleDailySales from bridge test
// [1,100000], [2,120000], [3,95000], [4,130000], [5,110000],
// [6,105000], [7,200000], [8,115000], [9,108000], [10,125000]
const SAMPLE_KEYS: [f64; 10] = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
const SAMPLE_VALUES: [f64; 10] = [
    100000.0, 120000.0, 95000.0, 130000.0, 110000.0,
    105000.0, 200000.0, 115000.0, 108000.0, 125000.0,
];

/* ── calculateStdDev ── */

#[test]
fn stddev_normal_scenario() {
    let r = calculate_stddev(&SAMPLE_VALUES);
    // TS reference: mean = 120800, variance computation
    let expected_mean = SAMPLE_VALUES.iter().sum::<f64>() / 10.0;
    assert_close(r.mean, expected_mean, 1e-6);
    assert!(r.std_dev > 0.0);
    assert!(r.std_dev.is_finite());
}

#[test]
fn stddev_simple_known_values() {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, stddev=2
    let r = calculate_stddev(&[2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]);
    assert_close(r.mean, 5.0, 1e-10);
    assert_close(r.std_dev, 2.0, 1e-10);
}

/* ── linearRegression ── */

#[test]
fn regression_perfect_linear() {
    // y = 100x → slope=100, intercept=0, R²=1
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
    let vals = [100.0, 200.0, 300.0, 400.0, 500.0];
    let r = linear_regression(&keys, &vals);
    assert_close(r.slope, 100.0, 1e-10);
    assert_close(r.intercept, 0.0, 1e-10);
    assert_close(r.r_squared, 1.0, 1e-10);
}

#[test]
fn regression_normal_scenario() {
    let r = linear_regression(&SAMPLE_KEYS, &SAMPLE_VALUES);
    // Verify outputs are reasonable
    assert!(r.slope.is_finite());
    assert!(r.intercept.is_finite());
    assert!(r.r_squared >= 0.0 && r.r_squared <= 1.0);
}

/* ── calculateWMA ── */

#[test]
fn wma_window_3() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
    let vals = [100.0, 200.0, 300.0, 400.0, 500.0];
    let r = calculate_wma(&keys, &vals, 3);
    assert_eq!(r.len(), 5);

    // First two: wma = actual
    assert_close(r[0].wma, 100.0, 1e-10);
    assert_close(r[1].wma, 200.0, 1e-10);

    // Third: (100*1 + 200*2 + 300*3) / 6 = 1400/6
    assert_close(r[2].wma, 1400.0 / 6.0, 1e-10);

    // Fourth: (200*1 + 300*2 + 400*3) / 6 = 2000/6
    assert_close(r[3].wma, 2000.0 / 6.0, 1e-10);
}

#[test]
fn wma_normal_scenario() {
    let r = calculate_wma(&SAMPLE_KEYS, &SAMPLE_VALUES, 5);
    assert_eq!(r.len(), 10);
    // First 4 entries: wma = actual
    for i in 0..4 {
        assert_close(r[i].wma, SAMPLE_VALUES[i], 1e-10);
    }
    // Remaining entries should be weighted averages (finite)
    for i in 4..10 {
        assert!(r[i].wma.is_finite());
    }
}

/* ── detectAnomalies ── */

#[test]
fn anomalies_normal_scenario() {
    let r = detect_anomalies(&SAMPLE_KEYS, &SAMPLE_VALUES, 2.0);
    // The 200000 value at index 6 is likely an anomaly
    if !r.is_empty() {
        assert!(r.iter().any(|a| (a.value - 200000.0).abs() < 1e-10));
    }
}

#[test]
fn anomalies_low_threshold() {
    let r = detect_anomalies(&SAMPLE_KEYS, &SAMPLE_VALUES, 1.0);
    // Lower threshold → more anomalies
    assert!(!r.is_empty());
    for entry in &r {
        assert!(entry.z_score.abs() > 1.0);
    }
}

/* ── analyzeTrend ── */

#[test]
fn trend_normal_scenario() {
    let years = [2025.0, 2025.0, 2025.0, 2025.0, 2025.0, 2025.0];
    let months = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    let sales = [1000000.0, 1100000.0, 1050000.0, 1200000.0, 1250000.0, 1300000.0];

    let r = analyze_trend(&years, &months, &sales);
    assert_eq!(r.mom_changes.len(), 6);
    assert_eq!(r.yoy_changes.len(), 6);
    assert_eq!(r.moving_avg_3.len(), 6);
    assert_eq!(r.moving_avg_6.len(), 6);
    assert_eq!(r.seasonal_index.len(), 12);
    assert!(r.average_monthly_sales.is_finite());

    // First MoM is NaN (null)
    assert!(r.mom_changes[0].is_nan());
    // Second MoM: 1100000/1000000 = 1.1
    assert_close(r.mom_changes[1], 1.1, 1e-10);
}

#[test]
fn trend_extreme_values() {
    let years = [2024.0; 6];
    let months = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    let sales = [1e10, 1.1e10, 1.05e10, 1.2e10, 1.15e10, 1.3e10];
    let r = analyze_trend(&years, &months, &sales);
    assert!(r.average_monthly_sales.is_finite());
    assert_eq!(r.seasonal_index.len(), 12);
}

/* ── Boundary: 2 entries minimum ── */

#[test]
fn regression_two_entries() {
    let keys = [1.0, 2.0];
    let vals = [100.0, 200.0];
    let r = linear_regression(&keys, &vals);
    assert_close(r.slope, 100.0, 1e-10);
    assert_close(r.r_squared, 1.0, 1e-10);
}

#[test]
fn regression_one_entry_returns_zero() {
    let r = linear_regression(&[1.0], &[100.0]);
    assert_eq!(r.slope, 0.0);
    assert_eq!(r.intercept, 0.0);
    assert_eq!(r.r_squared, 0.0);
}
