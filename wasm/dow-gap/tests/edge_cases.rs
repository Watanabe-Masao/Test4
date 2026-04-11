//! Edge cases. @contractId ANA-007

use dow_gap_wasm::dow_gap::analyze_dow_gap;

// Output layout constants (matching dow_gap.rs TOTAL_OUTPUT = 65)
const IDX_ESTIMATED_IMPACT: usize = 0;
const IDX_PREV_DOW_AVG_START: usize = 1;       // [1..8]
const IDX_PREV_DOW_CUST_START: usize = 8;       // [8..15]
const IDX_IS_VALID: usize = 15;
const IDX_IS_SAME_STRUCTURE: usize = 16;
const IDX_METHOD_BASE: usize = 17;
const METHOD_STRIDE: usize = 16; // salesImpact + customerImpact + dowAvgSales[7] + dowAvgCustomers[7]

#[test]
fn all_zero_counts() {
    let out = analyze_dow_gap(
        &[0.0; 7], &[0.0; 7], &[0.0; 7], 0.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert_eq!(out[IDX_ESTIMATED_IMPACT], 0.0);
    assert_eq!(out[IDX_IS_VALID], 0.0); // dailyAvgSales <= 0
}

#[test]
fn large_values_finite() {
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &cur, &prev, &[1e10; 7], 1e9,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert!(out[IDX_ESTIMATED_IMPACT].is_finite());
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
        let sales_impact_idx = IDX_METHOD_BASE + m * METHOD_STRIDE;
        assert!((out[sales_impact_idx]).abs() < 1e-6, "method {} salesImpact should be ~0", m);
    }
}

#[test]
fn prev_dow_daily_avg_length() {
    let out = analyze_dow_gap(
        &[4.0; 7], &[4.0; 7], &[f64::NAN; 7], 100.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    // All 7 prevDowDailyAvg should be dailyAverageSales (NaN fallback)
    for d in 0..7 {
        assert_eq!(out[IDX_PREV_DOW_AVG_START + d], 100.0);
    }
}

#[test]
fn same_structure_flag() {
    let counts = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &counts, &counts, &[700.0; 7], 100.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert_eq!(out[IDX_IS_SAME_STRUCTURE], 1.0);
    assert_eq!(out[IDX_ESTIMATED_IMPACT], 0.0);
}
