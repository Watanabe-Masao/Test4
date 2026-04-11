//! Mathematical invariants for trend analysis.
//! @contractId ANA-004
//! @methodFamily temporal_pattern

use trend_analysis_wasm::trend_analysis::*;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

// ════════════════════════════════════════════════════
// TREND-INV-1: Output array lengths = input length
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_1_output_lengths() {
    for n in [0, 1, 3, 6, 12, 24] {
        let y: Vec<i32> = (0..n).map(|i| 2024 + (i / 12) as i32).collect();
        let m: Vec<i32> = (0..n).map(|i| (i % 12 + 1) as i32).collect();
        let s: Vec<f64> = (0..n).map(|i| (i + 1) as f64 * 100.0).collect();
        let r = analyze_trend(&y, &m, &s);
        assert_eq!(r.mom_changes.len(), n);
        assert_eq!(r.yoy_changes.len(), n);
        assert_eq!(r.moving_avg_3.len(), n);
        assert_eq!(r.moving_avg_6.len(), n);
        assert_eq!(r.sorted_indices.len(), n);
    }
}

// ════════════════════════════════════════════════════
// TREND-INV-2: Seasonal index length = 12
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_2_seasonal_length() {
    for n in [0, 1, 6, 12, 24] {
        let y: Vec<i32> = vec![2025; n];
        let m: Vec<i32> = (0..n).map(|i| (i % 12 + 1) as i32).collect();
        let s: Vec<f64> = vec![100.0; n];
        let r = analyze_trend(&y, &m, &s);
        assert_eq!(r.seasonal_index.len(), 12);
    }
}

// ════════════════════════════════════════════════════
// TREND-INV-3: MoM definition
//   momChanges[i] = totalSales[i] / totalSales[i-1] (sorted)
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_3_mom_definition() {
    let y = [2025, 2025, 2025, 2025];
    let m = [1, 2, 3, 4];
    let s = [100.0, 150.0, 120.0, 180.0];
    let r = analyze_trend(&y, &m, &s);
    assert!(r.mom_changes[0].is_nan());
    assert_close(r.mom_changes[1], 150.0 / 100.0, 1e-10);
    assert_close(r.mom_changes[2], 120.0 / 150.0, 1e-10);
    assert_close(r.mom_changes[3], 180.0 / 120.0, 1e-10);
}

// ════════════════════════════════════════════════════
// TREND-INV-4: Constant sales → flat trend
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_4_constant_sales_flat() {
    let y = [2025; 6];
    let m = [1, 2, 3, 4, 5, 6];
    let s = [500.0; 6];
    let r = analyze_trend(&y, &m, &s);
    assert_eq!(r.overall_trend, TrendDirection::Flat);
    // All MoM should be 1.0
    for i in 1..6 {
        assert_close(r.mom_changes[i], 1.0, 1e-10);
    }
}

// ════════════════════════════════════════════════════
// TREND-INV-5: Sorted indices are a permutation
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_5_sorted_permutation() {
    let y = [2025, 2024, 2025, 2024];
    let m = [3, 1, 1, 12];
    let s = [300.0, 100.0, 200.0, 400.0];
    let r = analyze_trend(&y, &m, &s);
    let mut sorted = r.sorted_indices.clone();
    sorted.sort();
    assert_eq!(sorted, vec![0, 1, 2, 3]);
}

// ════════════════════════════════════════════════════
// TREND-INV-6: Finite guarantee
// ════════════════════════════════════════════════════

#[test]
fn trend_inv_6_finite_guarantee() {
    let y: Vec<i32> = (0..24).map(|i| 2024 + (i / 12) as i32).collect();
    let m: Vec<i32> = (0..24).map(|i| (i % 12 + 1) as i32).collect();
    let s: Vec<f64> = (0..24).map(|i| (i + 1) as f64 * 1e6).collect();
    let r = analyze_trend(&y, &m, &s);
    assert!(r.average_monthly_sales.is_finite());
    for &v in &r.seasonal_index { assert!(v.is_finite()); }
    for &v in &r.moving_avg_3 { assert!(v.is_finite() || v.is_nan()); }
    for &v in &r.moving_avg_6 { assert!(v.is_finite() || v.is_nan()); }
}
