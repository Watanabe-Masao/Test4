//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/customerGap.ts (lines 38-65)
//! to validate candidate WASM produces identical results.
//!
//! @contractId BIZ-013
//! @see references/01-principles/customer-gap-definition.md

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
// Golden fixtures: TS customerGap.ts lines 38-65
// ════════════════════════════════════════════════════════════════

#[test]
fn golden_equal_growth() {
    // 全指標が同率(10%増) → GAP = 0
    let r = calculate_customer_gap(220.0, 200.0, 550.0, 500.0, 110_000.0, 100_000.0).unwrap();
    assert_eq!(r.customer_yoy, 1.1);
    assert_eq!(r.quantity_yoy, 1.1);
    assert_eq!(r.sales_yoy, 1.1);
    assert_eq!(r.quantity_customer_gap, 0.0);
    assert_eq!(r.amount_customer_gap, 0.0);
}

#[test]
fn golden_quantity_gap_positive() {
    // 客数変化なし、点数20%増、金額30%増 → GAP > 0
    let r = calculate_customer_gap(200.0, 200.0, 600.0, 500.0, 130_000.0, 100_000.0).unwrap();
    assert_eq!(r.customer_yoy, 1.0);
    assert_eq!(r.quantity_yoy, 1.2);
    assert_close(r.quantity_customer_gap, 0.2, 1e-10);
    assert_close(r.amount_customer_gap, 0.3, 1e-10);
}

#[test]
fn golden_declining_customers() {
    // 客数半減、点数維持 → customerYoY=0.5, gap=0.5
    let r = calculate_customer_gap(50.0, 100.0, 100.0, 100.0, 100_000.0, 100_000.0).unwrap();
    assert_eq!(r.customer_yoy, 0.5);
    assert_eq!(r.quantity_yoy, 1.0);
    assert_eq!(r.quantity_customer_gap, 0.5);
    assert_eq!(r.amount_customer_gap, 0.5);
}

#[test]
fn golden_null_on_zero_prev_customers() {
    // TS: prevCustomers <= 0 → return null
    assert!(calculate_customer_gap(100.0, 0.0, 100.0, 100.0, 100.0, 100.0).is_none());
}

#[test]
fn golden_null_on_zero_prev_quantity() {
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 0.0, 100.0, 100.0).is_none());
}

#[test]
fn golden_null_on_zero_prev_sales() {
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 100.0, 100.0, 0.0).is_none());
}

#[test]
fn golden_zero_current_values() {
    // 当期ゼロ → YoY=0, GAP=-customerYoY(前期がゼロでない場合は0)
    let r = calculate_customer_gap(0.0, 100.0, 0.0, 100.0, 0.0, 100_000.0).unwrap();
    assert_eq!(r.customer_yoy, 0.0);
    assert_eq!(r.quantity_yoy, 0.0);
    assert_eq!(r.sales_yoy, 0.0);
    assert_eq!(r.quantity_customer_gap, 0.0);
    assert_eq!(r.amount_customer_gap, 0.0);
}
