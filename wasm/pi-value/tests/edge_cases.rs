//! Edge cases: boundary conditions, extreme values, special IEEE 754 behavior.
//!
//! @contractId BIZ-012

use pi_value_wasm::pi_value::{calculate_amount_pi, calculate_pi_values, calculate_quantity_pi};

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a,
        b,
        (a - b).abs(),
        tol,
    );
}

// ════════════════════════════════════════════════════════════════
// Zero and boundary
// ════════════════════════════════════════════════════════════════

#[test]
fn zero_quantity_nonzero_customers() {
    assert_eq!(calculate_quantity_pi(0.0, 100.0), 0.0);
}

#[test]
fn zero_sales_nonzero_customers() {
    assert_eq!(calculate_amount_pi(0.0, 100.0), 0.0);
}

#[test]
fn zero_customers_returns_zero() {
    assert_eq!(calculate_quantity_pi(100.0, 0.0), 0.0);
    assert_eq!(calculate_amount_pi(100.0, 0.0), 0.0);
}

#[test]
fn negative_zero_customers() {
    // IEEE 754: -0.0 == 0.0, so safeDivide returns fallback
    assert_eq!(calculate_quantity_pi(100.0, -0.0), 0.0);
    assert_eq!(calculate_amount_pi(100.0, -0.0), 0.0);
}

#[test]
fn all_zero() {
    let (qty, amt) = calculate_pi_values(0.0, 0.0, 0.0);
    assert_eq!(qty, 0.0);
    assert_eq!(amt, 0.0);
}

// ════════════════════════════════════════════════════════════════
// Large values (1e10+ scale)
// ════════════════════════════════════════════════════════════════

#[test]
fn large_values_finite() {
    let qty = calculate_quantity_pi(1e10, 1e8);
    assert!(qty.is_finite(), "quantityPI must be finite for large inputs");
    assert_close(qty, 100_000.0, 1e-6);

    let amt = calculate_amount_pi(1e15, 1e8);
    assert!(amt.is_finite(), "amountPI must be finite for large inputs");
    assert_close(amt, 1e10, 1e-2); // tolerance scales with magnitude
}

#[test]
fn very_large_customers() {
    let qty = calculate_quantity_pi(100.0, 1e12);
    assert!(qty.is_finite());
    assert_close(qty, 1e-7, 1e-15);
}

// ════════════════════════════════════════════════════════════════
// Tiny values (precision edge cases)
// ════════════════════════════════════════════════════════════════

#[test]
fn tiny_quantity() {
    let qty = calculate_quantity_pi(1e-12, 1.0);
    assert_close(qty, 1e-9, 1e-18);
}

#[test]
fn tiny_customers() {
    let qty = calculate_quantity_pi(1.0, 1e-12);
    assert_close(qty, 1e15, 1e5); // tolerance scales with magnitude
}

// ════════════════════════════════════════════════════════════════
// Negative values
// ════════════════════════════════════════════════════════════════

#[test]
fn negative_quantity() {
    // Negative inputs are valid (returns/adjustments)
    let qty = calculate_quantity_pi(-100.0, 200.0);
    assert_eq!(qty, -500.0);
}

#[test]
fn negative_customers() {
    // Negative customers → division proceeds (not zero)
    let qty = calculate_quantity_pi(100.0, -200.0);
    assert_eq!(qty, -500.0);
}

// ════════════════════════════════════════════════════════════════
// NaN / Infinity (IEEE 754 matching TS behavior)
// ════════════════════════════════════════════════════════════════

#[test]
fn nan_customers_returns_nan() {
    // TS: safeDivide(100, NaN, 0) → NaN (NaN != 0 is true → proceeds to division)
    let qty = calculate_quantity_pi(100.0, f64::NAN);
    assert!(qty.is_nan(), "NaN customers should produce NaN (matching TS behavior)");
}

#[test]
fn nan_quantity_returns_nan() {
    let qty = calculate_quantity_pi(f64::NAN, 100.0);
    assert!(qty.is_nan(), "NaN quantity should produce NaN");
}

#[test]
fn infinity_customers() {
    // TS: safeDivide(100, Infinity, 0) → 0.0 → * 1000 = 0.0
    let qty = calculate_quantity_pi(100.0, f64::INFINITY);
    assert_eq!(qty, 0.0);
}

#[test]
fn infinity_quantity() {
    let qty = calculate_quantity_pi(f64::INFINITY, 100.0);
    assert_eq!(qty, f64::INFINITY);
}
