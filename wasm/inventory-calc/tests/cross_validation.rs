//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/inventoryCalc.ts (lines 90-157)
//!
//! @contractId BIZ-009
//! @see references/01-principles/purchase-cost-definition.md

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
// Golden fixtures: TS inventoryCalc.ts lines 90-157
// ════════════════════════════════════════════════════════════════

#[test]
fn golden_uniform_5days() {
    // Uniform: sales=1000, flowers=100, direct=50, costIncl=10, totalCost=800, deliveryCost=50
    // markup=0.3, discount=0.05, opening=10000, closing=9500
    let r = compute_estimated_inventory_details(
        &[1000.0; 5], &[100.0; 5], &[50.0; 5], &[10.0; 5], &[800.0; 5], &[50.0; 5],
        10000.0, 9500.0, 0.3, 0.05, 5,
    );
    assert_eq!(r.len(), 5 * FIELDS_PER_ROW);

    // Day 1: coreSales = 1000 - 100 - 50 = 850
    let row1 = get_row(&r, 0);
    assert_eq!(row1[0], 1.0); // day
    assert_eq!(row1[1], 1000.0); // sales
    assert_eq!(row1[2], 850.0); // coreSales

    // Day 5: actual = 9500 (closing inventory present)
    let row5 = get_row(&r, 4);
    assert_eq!(row5[10], 9500.0);
}

#[test]
fn golden_closing_null() {
    let r = compute_estimated_inventory_details(
        &[1000.0; 3], &[100.0; 3], &[50.0; 3], &[10.0; 3], &[800.0; 3], &[50.0; 3],
        5000.0, f64::NAN, 0.3, 0.05, 3,
    );
    // Last day actual should be NaN (null)
    assert!(get_row(&r, 2)[10].is_nan());
}

#[test]
fn golden_zero_discount_rate() {
    // discountRate=0 → grossSales = coreSales / 1.0 = coreSales
    let r = compute_estimated_inventory_details(
        &[500.0], &[0.0], &[0.0], &[0.0], &[400.0], &[0.0],
        1000.0, f64::NAN, 0.3, 0.0, 1,
    );
    let row = get_row(&r, 0);
    assert_eq!(row[2], 500.0); // coreSales = 500 - 0 - 0
    assert_eq!(row[3], 500.0); // grossSales = 500 / (1 - 0) = 500
    // estCogs = 500 * (1 - 0.3) + 0 = 350
    assert_close(row[5], 350.0, 1e-10);
}

#[test]
fn golden_no_daily_data() {
    // Empty arrays → all zeros, estimated = openingInventory
    let r = compute_estimated_inventory_details(
        &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5], &[0.0; 5],
        10000.0, f64::NAN, 0.3, 0.05, 5,
    );
    for d in 0..5 {
        assert_eq!(get_row(&r, d)[9], 10000.0, "day {} estimated should equal opening", d + 1);
    }
}

#[test]
fn golden_cumulative_progression() {
    // Verify cumulative values grow day by day
    let r = compute_estimated_inventory_details(
        &[100.0, 200.0, 300.0], &[0.0; 3], &[0.0; 3], &[0.0; 3],
        &[80.0, 160.0, 240.0], &[0.0; 3],
        5000.0, f64::NAN, 0.3, 0.0, 3,
    );
    let cum_inv1 = get_row(&r, 0)[7];
    let cum_inv2 = get_row(&r, 1)[7];
    let cum_inv3 = get_row(&r, 2)[7];
    assert_eq!(cum_inv1, 80.0);
    assert_eq!(cum_inv2, 240.0); // 80 + 160
    assert_eq!(cum_inv3, 480.0); // 80 + 160 + 240
}
