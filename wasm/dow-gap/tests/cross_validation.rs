//! Cross-validation: TS reference golden fixtures.
//! @contractId ANA-007

use dow_gap_wasm::dow_gap::analyze_dow_gap;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

#[test]
fn golden_same_structure() {
    let counts = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &counts, &counts, &[700.0; 7], 100.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert_close(out[0], 0.0, 1e-10);
}

#[test]
fn golden_with_diff() {
    // 31-day months with different DOW distribution
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    // Different daily avg per DOW: 日=100, 月=120, 火=80, 水=140, 木=90, 金=130, 土=110
    let prev_sales = [400.0, 600.0, 320.0, 700.0, 360.0, 650.0, 440.0];
    let out = analyze_dow_gap(
        &cur, &prev, &prev_sales, 100.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert!(out[0].abs() > 0.0); // nonzero impact
    assert_eq!(out[16], 0.0); // isSameStructure = false
}

#[test]
fn golden_no_prev_data_uses_avg() {
    let cur = [5.0; 7];
    let prev = [4.0; 7];
    let daily_avg = 200.0;
    let out = analyze_dow_gap(
        &cur, &prev, &[f64::NAN; 7], daily_avg,
        &[], &[], &[0; 7], 0.0, false,
    );
    // All prevDowDailyAvg should be dailyAverageSales
    for i in 1..8 {
        assert_close(out[i], daily_avg, 1e-10);
    }
    // Impact = Σ(1 * 200) = 7 * 200 = 1400
    assert_close(out[0], 1400.0, 1e-6);
}
