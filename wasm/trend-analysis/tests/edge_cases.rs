//! Edge cases. @contractId ANA-004

use trend_analysis_wasm::trend_analysis::*;

#[test]
fn empty_data() {
    let r = analyze_trend(&[], &[], &[]);
    assert_eq!(r.overall_trend, TrendDirection::Flat);
    assert_eq!(r.seasonal_index.len(), 12);
    assert_eq!(r.average_monthly_sales, 0.0);
}

#[test]
fn single_month() {
    let r = analyze_trend(&[2025], &[1], &[100.0]);
    assert_eq!(r.overall_trend, TrendDirection::Flat);
    assert!(r.mom_changes[0].is_nan());
    assert!(r.yoy_changes[0].is_nan());
}

#[test]
fn unsorted_input_gets_sorted() {
    let y = [2025, 2025, 2025];
    let m = [3, 1, 2];
    let s = [300.0, 100.0, 200.0];
    let r = analyze_trend(&y, &m, &s);
    // Should be sorted: month 1(100), 2(200), 3(300)
    assert_eq!(r.sorted_indices, vec![1, 2, 0]);
}

#[test]
fn zero_sales_prev() {
    let y = [2025, 2025, 2025];
    let m = [1, 2, 3];
    let s = [0.0, 100.0, 200.0];
    let r = analyze_trend(&y, &m, &s);
    // MoM[1] = 100/0 → null
    assert!(r.mom_changes[1].is_nan());
}

#[test]
fn flat_trend() {
    let y = [2025, 2025, 2025, 2025, 2025, 2025];
    let m = [1, 2, 3, 4, 5, 6];
    let s = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0];
    let r = analyze_trend(&y, &m, &s);
    assert_eq!(r.overall_trend, TrendDirection::Flat);
}

#[test]
fn large_values_finite() {
    let y = [2025; 12];
    let m: Vec<i32> = (1..=12).collect();
    let s: Vec<f64> = (1..=12).map(|i| i as f64 * 1e10).collect();
    let r = analyze_trend(&y, &m, &s);
    assert!(r.average_monthly_sales.is_finite());
    for &v in &r.seasonal_index { assert!(v.is_finite()); }
}
