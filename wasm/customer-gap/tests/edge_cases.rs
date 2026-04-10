//! Edge cases: boundary conditions, extreme values, special IEEE 754 behavior.
//!
//! @contractId BIZ-013

use customer_gap_wasm::customer_gap::calculate_customer_gap;

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
// Null boundary (prev values)
// ════════════════════════════════════════════════════════════════

#[test]
fn null_on_negative_prev_customers() {
    assert!(calculate_customer_gap(100.0, -1.0, 100.0, 100.0, 100.0, 100.0).is_none());
}

#[test]
fn null_on_negative_prev_quantity() {
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, -1.0, 100.0, 100.0).is_none());
}

#[test]
fn null_on_negative_prev_sales() {
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 100.0, 100.0, -1.0).is_none());
}

#[test]
fn not_null_on_very_small_positive_prev() {
    // prev > 0 (tiny) → valid
    let r = calculate_customer_gap(100.0, 0.001, 100.0, 0.001, 100.0, 0.001).unwrap();
    assert!(r.customer_yoy.is_finite());
}

// ════════════════════════════════════════════════════════════════
// Large values (1e10+ scale)
// ════════════════════════════════════════════════════════════════

#[test]
fn large_values_finite() {
    let r = calculate_customer_gap(1e10, 1e10, 1e10, 1e10, 1e15, 1e15).unwrap();
    assert!(r.customer_yoy.is_finite());
    assert!(r.quantity_yoy.is_finite());
    assert!(r.sales_yoy.is_finite());
    assert_close(r.customer_yoy, 1.0, 1e-10);
    assert_eq!(r.quantity_customer_gap, 0.0);
}

#[test]
fn extreme_growth() {
    let r = calculate_customer_gap(1e10, 1.0, 1e10, 1.0, 1e15, 1.0).unwrap();
    assert!(r.customer_yoy.is_finite());
    assert_close(r.customer_yoy, 1e10, 1.0);
}

// ════════════════════════════════════════════════════════════════
// Tiny differences (precision)
// ════════════════════════════════════════════════════════════════

#[test]
fn tiny_difference_gap_near_zero() {
    let r = calculate_customer_gap(
        100.0, 100.0,
        100.0 + 1e-12, 100.0,
        100_000.0, 100_000.0,
    ).unwrap();
    assert_close(r.quantity_customer_gap, 1e-14, 1e-13);
}

// ════════════════════════════════════════════════════════════════
// Negative current values
// ════════════════════════════════════════════════════════════════

#[test]
fn negative_current_allowed() {
    // 返品等で当期がマイナスは valid
    let r = calculate_customer_gap(-10.0, 100.0, -5.0, 100.0, -1_000.0, 100_000.0).unwrap();
    assert_close(r.customer_yoy, -0.1, 1e-10);
}
