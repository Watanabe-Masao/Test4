//! Cross-validation: TS reference golden fixtures.
//! @contractId ANA-004

use trend_analysis_wasm::trend_analysis::*;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

#[test]
fn golden_upward_6months() {
    let y = [2025, 2025, 2025, 2025, 2025, 2025];
    let m = [1, 2, 3, 4, 5, 6];
    let s = [100.0, 110.0, 120.0, 130.0, 140.0, 150.0];
    let r = analyze_trend(&y, &m, &s);
    assert_eq!(r.overall_trend, TrendDirection::Up);
    assert_close(r.average_monthly_sales, 125.0, 1e-10);
    assert_eq!(r.mom_changes.len(), 6);
    assert!(r.mom_changes[0].is_nan()); // first has no prev
    assert_close(r.mom_changes[1], 1.1, 1e-10); // 110/100
}

#[test]
fn golden_yoy() {
    let y = [2024, 2024, 2025, 2025];
    let m = [1, 2, 1, 2];
    let s = [100.0, 200.0, 120.0, 240.0];
    let r = analyze_trend(&y, &m, &s);
    // YoY for 2025-01: 120/100 = 1.2
    assert_close(r.yoy_changes[2], 1.2, 1e-10);
    // YoY for 2025-02: 240/200 = 1.2
    assert_close(r.yoy_changes[3], 1.2, 1e-10);
}

#[test]
fn golden_seasonal_index() {
    // Same month data only → single month bucket
    let y = [2024, 2025];
    let m = [6, 6];
    let s = [100.0, 200.0];
    let r = analyze_trend(&y, &m, &s);
    // Only month 6 has data, avg = 150, grand avg = 150 → index = 1.0
    assert_close(r.seasonal_index[5], 1.0, 1e-10); // month 6 (0-indexed = 5)
    // Other months have no data → index = 1.0
    assert_close(r.seasonal_index[0], 1.0, 1e-10);
}
