//! Edge cases. @contractId ANA-007

use dow_gap_wasm::dow_gap::analyze_dow_gap;

#[test]
fn all_zero_counts() {
    let out = analyze_dow_gap(
        &[0.0; 7], &[0.0; 7], &[0.0; 7], 0.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert_eq!(out[0], 0.0);
    assert_eq!(out[15], 0.0); // isValid = 0 (dailyAvgSales <= 0)
}

#[test]
fn large_values_finite() {
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &cur, &prev, &[1e10; 7], 1e9,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert!(out[0].is_finite());
}

#[test]
fn with_daily_data_methods() {
    let counts = [4.0; 7];
    let n = 4;
    let sales: Vec<f64> = vec![100.0; 7 * n];
    let cust: Vec<f64> = vec![50.0; 7 * n];
    let out = analyze_dow_gap(
        &counts, &counts, &[400.0; 7], 100.0,
        &sales, &cust, &[n as u32; 7], 50.0, true,
    );
    // With same structure, all method impacts should be 0
    for m in 0..3 {
        let base = 17 + m * 16;
        assert!((out[base]).abs() < 1e-6); // salesImpact ≈ 0
    }
}
