//! Forecast invariant tests (F-INV)
//!
//! These tests verify mathematical properties that must hold regardless of input.

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

/* ── F-INV-1: stdDev >= 0 ── */

#[test]
fn finv1_stddev_non_negative() {
    let scenarios: &[&[f64]] = &[
        &[100.0, 200.0, 300.0],
        &[0.0, 0.0, 0.0],
        &[1e10, 1e10, 1e10],
        &[-100.0, 100.0, -50.0, 50.0],
        &[1.0],
        &[],
    ];
    for values in scenarios {
        let r = calculate_stddev(values);
        assert!(
            r.std_dev >= 0.0,
            "stdDev must be >= 0 for {:?}, got {}",
            values,
            r.std_dev
        );
    }
}

/* ── F-INV-2/3: constant values → stdDev == 0, mean == value ── */

#[test]
fn finv2_constant_values_zero_stddev() {
    let values = [42.0, 42.0, 42.0, 42.0, 42.0];
    let r = calculate_stddev(&values);
    assert_close(r.std_dev, 0.0, 1e-10);
    assert_close(r.mean, 42.0, 1e-10);
}

#[test]
fn finv3_mean_equals_sum_over_count() {
    let values = [100.0, 200.0, 300.0, 400.0, 500.0];
    let r = calculate_stddev(&values);
    let expected_mean = values.iter().sum::<f64>() / values.len() as f64;
    assert_close(r.mean, expected_mean, 1e-10);
}

/* ── F-INV-8: 0 <= R² <= 1 ── */

#[test]
fn finv8_r_squared_bounds() {
    let scenarios: &[(&[f64], &[f64])] = &[
        (&[1.0, 2.0, 3.0, 4.0, 5.0], &[100.0, 200.0, 300.0, 400.0, 500.0]),
        (&[1.0, 2.0, 3.0, 4.0, 5.0], &[100.0, 120.0, 95.0, 130.0, 110.0]),
        (&[1.0, 2.0, 3.0], &[50.0, 50.0, 50.0]),
        (&[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
         &[95000.0, 102000.0, 98000.0, 110000.0, 105000.0,
           115000.0, 108000.0, 120000.0, 112000.0, 125000.0]),
    ];
    for (keys, vals) in scenarios {
        let r = linear_regression(keys, vals);
        assert!(
            r.r_squared >= 0.0 && r.r_squared <= 1.0,
            "R² must be in [0, 1] for keys={:?}, got {}",
            keys,
            r.r_squared
        );
    }
}

#[test]
fn finv8_perfect_linear_r_squared_one() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
    let vals = [100.0, 200.0, 300.0, 400.0, 500.0];
    let r = linear_regression(&keys, &vals);
    assert_close(r.r_squared, 1.0, 1e-10);
}

/* ── F-INV-10: isAnomaly == (|zScore| > threshold) ── */

#[test]
fn finv10_anomaly_z_score_threshold_match() {
    let keys: Vec<f64> = (1..=20).map(|i| i as f64).collect();
    let mut vals = vec![100.0; 20];
    vals[19] = 500.0; // outlier
    let threshold = 2.0;

    let results = detect_anomalies(&keys, &vals, threshold);
    for entry in &results {
        assert_eq!(
            entry.is_anomaly,
            entry.z_score.abs() > threshold,
            "isAnomaly must match |zScore| > threshold for day={}",
            entry.day
        );
    }
}

/* ── F-INV-12: seasonalIndex.length == 12 ── */

#[test]
fn finv12_seasonal_index_always_12() {
    let scenarios: Vec<(Vec<f64>, Vec<f64>, Vec<f64>)> = vec![
        (vec![], vec![], vec![]),
        (vec![2024.0], vec![1.0], vec![100.0]),
        (
            (0..24).map(|i| 2023.0 + (i / 12) as f64).collect(),
            (0..24).map(|i| (i % 12 + 1) as f64).collect(),
            (0..24).map(|i| 100000.0 + i as f64 * 1000.0).collect(),
        ),
    ];
    for (years, months, sales) in &scenarios {
        let r = analyze_trend(years, months, sales);
        assert_eq!(
            r.seasonal_index.len(),
            12,
            "seasonalIndex must always have 12 entries, got {}",
            r.seasonal_index.len()
        );
    }
}

/* ── F-INV-13: overallTrend ∈ {up, down, flat} ── */

#[test]
fn finv13_overall_trend_valid_values() {
    let years = vec![2024.0; 6];
    let months = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0];

    let scenarios: &[&[f64]] = &[
        &[100.0, 105.0, 110.0, 150.0, 160.0, 170.0], // up
        &[170.0, 160.0, 150.0, 110.0, 105.0, 100.0], // down
        &[100.0, 101.0, 99.0, 100.0, 101.0, 100.0],  // flat
    ];

    for sales in scenarios {
        let r = analyze_trend(&years, &months, sales);
        assert!(
            r.overall_trend <= 2,
            "overallTrend must be 0 (up), 1 (down), or 2 (flat), got {}",
            r.overall_trend
        );
    }
}

/* ── Finite guarantees ── */

#[test]
fn all_stddev_outputs_finite() {
    let scenarios: &[&[f64]] = &[
        &[1e15, 1e15, 1e15],
        &[0.001, 0.002, 0.003],
        &[100.0, 200.0, 300.0, 400.0, 500.0],
    ];
    for values in scenarios {
        let r = calculate_stddev(values);
        assert!(r.mean.is_finite(), "mean must be finite for {:?}", values);
        assert!(
            r.std_dev.is_finite(),
            "stdDev must be finite for {:?}",
            values
        );
    }
}

#[test]
fn all_regression_outputs_finite() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
    let vals = [95000.0, 102000.0, 98000.0, 110000.0, 105000.0,
                115000.0, 108000.0, 120000.0, 112000.0, 125000.0];
    let r = linear_regression(&keys, &vals);
    assert!(r.slope.is_finite());
    assert!(r.intercept.is_finite());
    assert!(r.r_squared.is_finite());
}

#[test]
fn wma_values_finite() {
    let keys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
    let vals = [100.0, 110.0, 105.0, 120.0, 115.0, 130.0, 125.0];
    let results = calculate_wma(&keys, &vals, 3);
    for entry in &results {
        assert!(entry.wma.is_finite());
    }
}

#[test]
fn trend_numeric_outputs_finite() {
    let years: Vec<f64> = (0..12).map(|_| 2024.0).collect();
    let months: Vec<f64> = (1..=12).map(|m| m as f64).collect();
    let sales = vec![1e6, 1.1e6, 1.05e6, 1.2e6, 1.15e6, 1.3e6,
                     1.25e6, 1.35e6, 1.1e6, 1.2e6, 1.3e6, 1.4e6];
    let r = analyze_trend(&years, &months, &sales);
    assert!(r.average_monthly_sales.is_finite());
    for &v in &r.seasonal_index {
        assert!(v.is_finite());
    }
}
