//! Mathematical invariants for moving average.
//! @contractId ANA-009
//! @methodFamily time_series

use moving_average_wasm::moving_average::compute_moving_average;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

// ════════════════════════════════════════════════════
// MA-INV-1: Output length = input length
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_1_output_length() {
    for n in [0, 1, 5, 10, 50] {
        let values: Vec<f64> = (0..n).map(|i| i as f64).collect();
        let statuses: Vec<u8> = vec![0; n];
        let r = compute_moving_average(&values, &statuses, 3, 0);
        assert_eq!(r.len(), n, "output length must equal input length");
    }
}

// ════════════════════════════════════════════════════
// MA-INV-2: Window < index+1 → missing status
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_2_insufficient_window_missing() {
    let values = [1.0; 10];
    let statuses = [0u8; 10];
    let r = compute_moving_average(&values, &statuses, 5, 0);
    for i in 0..4 {
        assert!(r[i].value.is_nan(), "index {} should be missing (window too short)", i);
        assert_eq!(r[i].status, 1);
    }
    // index 4 onward should be ok
    assert!(!r[4].value.is_nan());
    assert_eq!(r[4].status, 0);
}

// ════════════════════════════════════════════════════
// MA-INV-3: Constant series → MA = constant
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_3_constant_series() {
    let values = [42.0; 10];
    let statuses = [0u8; 10];
    let r = compute_moving_average(&values, &statuses, 3, 0);
    for i in 2..10 { // window starts producing at index 2
        assert_close(r[i].value, 42.0, 1e-10);
    }
}

// ════════════════════════════════════════════════════
// MA-INV-4: Strict is more conservative than partial
//   strict missing count ≥ partial missing count
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_4_strict_more_conservative() {
    let values = [10.0, f64::NAN, 30.0, f64::NAN, 50.0, 60.0, 70.0];
    let statuses = [0, 1, 0, 1, 0, 0, 0];
    let strict = compute_moving_average(&values, &statuses, 3, 0);
    let partial = compute_moving_average(&values, &statuses, 3, 1);

    let strict_missing: usize = strict.iter().filter(|p| p.status == 1).count();
    let partial_missing: usize = partial.iter().filter(|p| p.status == 1).count();
    assert!(
        strict_missing >= partial_missing,
        "strict ({}) should produce >= missing than partial ({})",
        strict_missing, partial_missing,
    );
}

// ════════════════════════════════════════════════════
// MA-INV-5: All ok, window=1 → identity
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_5_window1_identity() {
    let values: Vec<f64> = (1..=10).map(|i| i as f64 * 100.0).collect();
    let statuses = vec![0u8; 10];
    let r = compute_moving_average(&values, &statuses, 1, 0);
    for (i, p) in r.iter().enumerate() {
        assert_close(p.value, values[i], 1e-10);
        assert_eq!(p.status, 0);
    }
}

// ════════════════════════════════════════════════════
// MA-INV-6: Finite guarantee
// ════════════════════════════════════════════════════

#[test]
fn ma_inv_6_finite_or_nan() {
    let values: Vec<f64> = (0..20).map(|i| if i % 3 == 0 { f64::NAN } else { i as f64 * 1e8 }).collect();
    let statuses: Vec<u8> = (0..20).map(|i| if i % 3 == 0 { 1 } else { 0 }).collect();
    for policy in [0, 1] {
        let r = compute_moving_average(&values, &statuses, 5, policy);
        for p in &r {
            assert!(p.value.is_finite() || p.value.is_nan(), "value must be finite or NaN");
        }
    }
}
