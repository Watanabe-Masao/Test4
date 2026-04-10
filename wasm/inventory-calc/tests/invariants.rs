//! Mathematical invariants for estimated inventory calculation.
//!
//! estimated[d] = openingInventory + Σ inventoryCost[1..d] - Σ estCogs[1..d]
//!
//! @contractId BIZ-009
//! @see references/03-guides/invariant-catalog.md

use inventory_calc_wasm::inventory_calc::{compute_estimated_inventory_details, FIELDS_PER_ROW};

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

fn make_uniform(n: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>) {
    (
        vec![1000.0; n],  // sales
        vec![100.0; n],   // flowers_price
        vec![50.0; n],    // direct_produce_price
        vec![10.0; n],    // cost_inclusion_cost
        vec![800.0; n],   // total_cost
        vec![50.0; n],    // delivery_sales_cost
    )
}

fn get_row(result: &[f64], day_index: usize) -> &[f64] {
    &result[day_index * FIELDS_PER_ROW..(day_index + 1) * FIELDS_PER_ROW]
}

// ════════════════════════════════════════════════════════════════
// IC-INV-1: Estimated inventory identity
//   estimated[d] = openingInventory + cumInventoryCost[d] - cumEstCogs[d]
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_1_estimated_identity() {
    let (s, f, dp, ci, tc, dc) = make_uniform(30);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 10000.0, f64::NAN, 0.3, 0.05, 30);
    let opening = 10000.0;
    for d in 0..30 {
        let row = get_row(&r, d);
        let cum_inv = row[7]; // cumInventoryCost
        let cum_cogs = row[8]; // cumEstCogs
        let estimated = row[9];
        assert_close(estimated, opening + cum_inv - cum_cogs, 1e-6);
    }
}

// ════════════════════════════════════════════════════════════════
// IC-INV-2: Core sales identity (no clamp)
//   coreSales = sales - flowersPrice - directProducePrice
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_2_core_sales_identity() {
    let (s, f, dp, ci, tc, dc) = make_uniform(10);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, f64::NAN, 0.3, 0.05, 10);
    for d in 0..10 {
        let row = get_row(&r, d);
        assert_close(row[2], row[1] - 100.0 - 50.0, 1e-10); // coreSales = sales - flowers - direct
    }
}

// ════════════════════════════════════════════════════════════════
// IC-INV-3: Inventory cost identity
//   inventoryCost = totalCost - deliverySalesCost
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_3_inventory_cost_identity() {
    let (s, f, dp, ci, tc, dc) = make_uniform(10);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, f64::NAN, 0.3, 0.05, 10);
    for d in 0..10 {
        let row = get_row(&r, d);
        assert_close(row[4], 800.0 - 50.0, 1e-10); // inventoryCost = totalCost - deliveryCost
    }
}

// ════════════════════════════════════════════════════════════════
// IC-INV-4: Cumulative monotonicity (non-negative inputs)
//   cumInventoryCost と cumEstCogs は非減少（入力が全て非負の場合）
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_4_cumulative_monotonicity() {
    let (s, f, dp, ci, tc, dc) = make_uniform(15);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, f64::NAN, 0.3, 0.05, 15);
    for d in 1..15 {
        let prev = get_row(&r, d - 1);
        let curr = get_row(&r, d);
        assert!(curr[7] >= prev[7], "cumInventoryCost should be non-decreasing");
        assert!(curr[8] >= prev[8], "cumEstCogs should be non-decreasing");
    }
}

// ════════════════════════════════════════════════════════════════
// IC-INV-5: Actual only on last day
//   actual != NaN only when d == daysInMonth && closingInventory != NaN
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_5_actual_last_day_only() {
    let (s, f, dp, ci, tc, dc) = make_uniform(10);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, 4500.0, 0.3, 0.05, 10);
    for d in 0..9 {
        assert!(get_row(&r, d)[10].is_nan(), "day {} should have NaN actual", d + 1);
    }
    assert_eq!(get_row(&r, 9)[10], 4500.0, "last day should have actual");
}

#[test]
fn ic_inv_5_actual_nan_when_closing_nan() {
    let (s, f, dp, ci, tc, dc) = make_uniform(5);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, f64::NAN, 0.3, 0.05, 5);
    assert!(get_row(&r, 4)[10].is_nan(), "last day should have NaN actual when closing is NaN");
}

// ════════════════════════════════════════════════════════════════
// IC-INV-6: Finite guarantee
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_6_finite_guarantee() {
    let (s, f, dp, ci, tc, dc) = make_uniform(30);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 10000.0, f64::NAN, 0.3, 0.05, 30);
    for d in 0..30 {
        let row = get_row(&r, d);
        for i in 0..10 { // skip actual (index 10) which can be NaN
            assert!(row[i].is_finite(), "day {} field {} should be finite", d + 1, i);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// IC-INV-7: Day numbering
//   row[d].day === d + 1 (1-based)
// ════════════════════════════════════════════════════════════════

#[test]
fn ic_inv_7_day_numbering() {
    let (s, f, dp, ci, tc, dc) = make_uniform(31);
    let r = compute_estimated_inventory_details(&s, &f, &dp, &ci, &tc, &dc, 5000.0, f64::NAN, 0.3, 0.0, 31);
    for d in 0..31 {
        assert_eq!(get_row(&r, d)[0], (d + 1) as f64);
    }
}
