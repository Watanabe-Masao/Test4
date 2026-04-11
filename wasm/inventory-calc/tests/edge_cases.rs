//! Edge cases: boundary conditions, extreme values.
//!
//! @contractId BIZ-009

use inventory_calc_wasm::inventory_calc::{compute_estimated_inventory_details, FIELDS_PER_ROW};

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

fn get_row(result: &[f64], day_index: usize) -> &[f64] {
    &result[day_index * FIELDS_PER_ROW..(day_index + 1) * FIELDS_PER_ROW]
}

// ════════════════════════════════════════════════════════════════
// Single day
// ════════════════════════════════════════════════════════════════

#[test]
fn single_day_with_closing() {
    let r = compute_estimated_inventory_details(
        &[1000.0], &[100.0], &[50.0], &[10.0], &[800.0], &[50.0],
        5000.0, 4800.0, 0.3, 0.05, 1,
    );
    assert_eq!(r.len(), FIELDS_PER_ROW);
    assert_eq!(get_row(&r, 0)[10], 4800.0); // actual = closing
}

#[test]
fn single_day_without_closing() {
    let r = compute_estimated_inventory_details(
        &[1000.0], &[0.0], &[0.0], &[0.0], &[800.0], &[0.0],
        5000.0, f64::NAN, 0.3, 0.0, 1,
    );
    assert!(get_row(&r, 0)[10].is_nan()); // actual = null
}

// ════════════════════════════════════════════════════════════════
// Zero values
// ════════════════════════════════════════════════════════════════

#[test]
fn all_zero_inputs() {
    let r = compute_estimated_inventory_details(
        &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5],
        0.0, f64::NAN, 0.0, 0.0, 5,
    );
    for d in 0..5 {
        let row = get_row(&r, d);
        assert_eq!(row[9], 0.0, "estimated should be 0 with all zero inputs");
    }
}

// ════════════════════════════════════════════════════════════════
// Large values
// ════════════════════════════════════════════════════════════════

#[test]
fn large_values_finite() {
    let r = compute_estimated_inventory_details(
        &[1e8; 30], &[1e7; 30], &[5e6; 30], &[1e5; 30],
        &[8e7; 30], &[5e6; 30],
        1e10, f64::NAN, 0.3, 0.05, 30,
    );
    for d in 0..30 {
        let row = get_row(&r, d);
        for i in 0..10 {
            assert!(row[i].is_finite(), "day {} field {} not finite", d + 1, i);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// Negative core sales (flowers + directProduce > sales)
// ════════════════════════════════════════════════════════════════

#[test]
fn negative_core_sales_no_clamp() {
    // sales=100, flowers=80, direct=50 → coreSales = 100 - 80 - 50 = -30 (no clamp)
    let r = compute_estimated_inventory_details(
        &[100.0], &[80.0], &[50.0], &[0.0], &[0.0], &[0.0],
        1000.0, f64::NAN, 0.3, 0.0, 1,
    );
    assert_close(get_row(&r, 0)[2], -30.0, 1e-10); // coreSales = -30 (no clamp)
}

// ════════════════════════════════════════════════════════════════
// Discount rate edge cases
// ════════════════════════════════════════════════════════════════

#[test]
fn discount_rate_one_uses_fallback() {
    // discountRate=1.0 → divisor = 0 → safeDivide fallback to coreSales
    let r = compute_estimated_inventory_details(
        &[1000.0], &[0.0], &[0.0], &[0.0], &[800.0], &[0.0],
        5000.0, f64::NAN, 0.3, 1.0, 1,
    );
    let row = get_row(&r, 0);
    assert_eq!(row[3], row[2], "grossSales should fallback to coreSales when discountRate=1.0");
}

// ════════════════════════════════════════════════════════════════
// 31-day month
// ════════════════════════════════════════════════════════════════

#[test]
fn full_31_day_month() {
    let r = compute_estimated_inventory_details(
        &[100.0; 31], &[10.0; 31], &[5.0; 31], &[1.0; 31],
        &[80.0; 31], &[5.0; 31],
        10000.0, 9000.0, 0.3, 0.05, 31,
    );
    assert_eq!(r.len(), 31 * FIELDS_PER_ROW);
    assert_eq!(get_row(&r, 30)[0], 31.0); // last day = 31
    assert_eq!(get_row(&r, 30)[10], 9000.0); // actual = closing
}
