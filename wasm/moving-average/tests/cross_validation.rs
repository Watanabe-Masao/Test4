//! Cross-validation: TS reference golden fixtures.
//! @contractId ANA-009

use moving_average_wasm::moving_average::compute_moving_average;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

#[test]
fn golden_strict_all_ok() {
    let values = [100.0, 200.0, 300.0, 400.0, 500.0];
    let statuses = [0u8; 5]; // all ok
    let r = compute_moving_average(&values, &statuses, 3, 0); // strict
    assert!(r[0].value.is_nan()); // insufficient window
    assert!(r[1].value.is_nan());
    assert_close(r[2].value, 200.0, 1e-10);
    assert_close(r[3].value, 300.0, 1e-10);
    assert_close(r[4].value, 400.0, 1e-10);
}

#[test]
fn golden_partial_with_gap() {
    let values = [100.0, f64::NAN, 300.0, 400.0, 500.0];
    let statuses = [0, 1, 0, 0, 0];
    let r = compute_moving_average(&values, &statuses, 3, 1); // partial
    // index 2: ok values = [100, 300], avg = 200
    assert_close(r[2].value, 200.0, 1e-10);
    assert_eq!(r[2].status, 0); // ok
}

#[test]
fn golden_strict_rejects_gap() {
    let values = [100.0, f64::NAN, 300.0];
    let statuses = [0, 1, 0];
    let r = compute_moving_average(&values, &statuses, 3, 0); // strict
    assert!(r[2].value.is_nan());
    assert_eq!(r[2].status, 1); // missing
}

#[test]
fn golden_window1_passthrough() {
    let values = [10.0, 20.0, 30.0];
    let statuses = [0, 0, 0];
    let r = compute_moving_average(&values, &statuses, 1, 0);
    assert_close(r[0].value, 10.0, 1e-10);
    assert_close(r[1].value, 20.0, 1e-10);
    assert_close(r[2].value, 30.0, 1e-10);
}
