//! Edge cases. @contractId ANA-009

use moving_average_wasm::moving_average::compute_moving_average;

#[test]
fn empty_input() {
    let r = compute_moving_average(&[], &[], 3, 0);
    assert!(r.is_empty());
}

#[test]
fn all_missing_partial() {
    let values = [f64::NAN; 5];
    let statuses = [1u8; 5]; // all missing
    let r = compute_moving_average(&values, &statuses, 3, 1);
    for p in &r {
        assert!(p.value.is_nan());
        assert_eq!(p.status, 1);
    }
}

#[test]
fn single_element_window1() {
    let r = compute_moving_average(&[42.0], &[0], 1, 0);
    assert_eq!(r.len(), 1);
    assert!((r[0].value - 42.0).abs() < 1e-10);
    assert_eq!(r[0].status, 0);
}

#[test]
fn large_window_all_insufficient() {
    let values = [1.0, 2.0, 3.0];
    let statuses = [0, 0, 0];
    let r = compute_moving_average(&values, &statuses, 10, 0);
    for p in &r {
        assert!(p.value.is_nan());
        assert_eq!(p.status, 1);
    }
}

#[test]
fn alternating_ok_missing() {
    let values = [10.0, f64::NAN, 30.0, f64::NAN, 50.0];
    let statuses = [0, 1, 0, 1, 0];
    let r = compute_moving_average(&values, &statuses, 2, 1); // partial
    // index 1: window [10, NaN], ok=[10] → 10
    assert!((r[1].value - 10.0).abs() < 1e-10);
    // index 2: window [NaN, 30], ok=[30] → 30
    assert!((r[2].value - 30.0).abs() < 1e-10);
}
