//! Edge case tests for boundary conditions.
//!
//! Systematically tests: zeros, negatives, large values, empty arrays,
//! new/vanishing categories, order stability, single categories,
//! precision edges, duplicate key ordering, and safeDivide edges.

use factor_decomposition_wasm::decompose::{decompose2, decompose3, decompose5};
use factor_decomposition_wasm::price_mix::decompose_price_mix;
use factor_decomposition_wasm::utils::safe_divide;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff={}, tol={})",
        a,
        b,
        (a - b).abs(),
        tol,
    );
}

fn cat(key: &str, qty: f64, amt: f64) -> (String, f64, f64) {
    (key.to_string(), qty, amt)
}

// ────────────────────────────────────────────────────
// Zero inputs
// ────────────────────────────────────────────────────

#[test]
fn d2_all_zero() {
    let r = decompose2(0.0, 0.0, 0.0, 0.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.ticket_effect, 0.0);
}

#[test]
fn d3_all_zero() {
    let r = decompose3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_eq!(r.price_per_item_effect, 0.0);
}

#[test]
fn d2_prev_zero_customers() {
    let r = decompose2(0.0, 100_000.0, 0.0, 100.0);
    assert!(r.cust_effect.is_finite());
    assert!(r.ticket_effect.is_finite());
    assert_close(r.cust_effect + r.ticket_effect, 100_000.0, 1e-10);
}

#[test]
fn d2_cur_zero_customers() {
    let r = decompose2(100_000.0, 0.0, 100.0, 0.0);
    assert!(r.cust_effect.is_finite());
    assert!(r.ticket_effect.is_finite());
    assert_close(r.cust_effect + r.ticket_effect, -100_000.0, 1e-10);
}

#[test]
fn d3_zero_quantities() {
    let r = decompose3(0.0, 0.0, 100.0, 100.0, 0.0, 0.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_eq!(r.price_per_item_effect, 0.0);
}

#[test]
fn d3_prev_zero_cur_nonzero() {
    let r = decompose3(0.0, 120_000.0, 0.0, 100.0, 0.0, 600.0);
    assert!(r.cust_effect.is_finite());
    assert!(r.qty_effect.is_finite());
    assert!(r.price_per_item_effect.is_finite());
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        120_000.0,
        1e-10,
    );
}

// ────────────────────────────────────────────────────
// Negative values
// ────────────────────────────────────────────────────

#[test]
fn d2_negative_delta_decline() {
    let r = decompose2(200_000.0, 150_000.0, 150.0, 120.0);
    assert_close(r.cust_effect + r.ticket_effect, -50_000.0, 1e-10);
}

#[test]
fn d3_negative_delta() {
    let r = decompose3(500_000.0, 300_000.0, 200.0, 120.0, 1000.0, 600.0);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        -200_000.0,
        1.0,
    );
}

#[test]
fn d2_negative_customer_change_positive_ticket() {
    // Fewer customers but higher ticket → could be positive or negative total
    let r = decompose2(100_000.0, 110_000.0, 100.0, 90.0);
    assert_close(r.cust_effect + r.ticket_effect, 10_000.0, 1e-10);
    assert!(r.cust_effect < 0.0); // fewer customers → negative
    assert!(r.ticket_effect > 0.0); // higher ticket → positive
}

#[test]
fn d5_decline_with_categories() {
    let prev_cats = vec![cat("A", 500.0, 300_000.0), cat("B", 500.0, 200_000.0)];
    let cur_cats = vec![cat("A", 300.0, 150_000.0), cat("B", 300.0, 120_000.0)];
    let r = decompose5(500_000.0, 270_000.0, 200.0, 120.0, 1000.0, 600.0, &cur_cats, &prev_cats)
        .unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - (-230_000.0)).abs() < 1.0);
}

// ────────────────────────────────────────────────────
// Large values
// ────────────────────────────────────────────────────

#[test]
fn d2_very_large_values() {
    let r = decompose2(1e15, 2e15, 1e6, 1.5e6);
    assert_close(r.cust_effect + r.ticket_effect, 1e15, 1.0);
}

#[test]
fn d3_very_large_values() {
    let r = decompose3(1e15, 2e15, 1e6, 1.5e6, 5e6, 9e6);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        1e15,
        1e4, // tolerance scales with magnitude
    );
}

#[test]
fn pm_very_large_values() {
    let prev = vec![cat("A", 1e6, 1e12), cat("B", 5e5, 3e11)];
    let cur = vec![cat("A", 1.2e6, 1.3e12), cat("B", 8e5, 5e11)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.is_finite());
    assert!(r.mix_effect.is_finite());
}

// ────────────────────────────────────────────────────
// Empty arrays
// ────────────────────────────────────────────────────

#[test]
fn pm_both_empty() {
    assert!(decompose_price_mix(&[], &[]).is_none());
}

#[test]
fn pm_one_empty_one_with_data() {
    let data = vec![cat("A", 100.0, 50_000.0)];
    // prev has data, cur empty → cur total qty = 0 → None
    assert!(decompose_price_mix(&[], &data).is_none());
    // cur has data, prev empty → prev total qty = 0 → None
    assert!(decompose_price_mix(&data, &[]).is_none());
}

// ────────────────────────────────────────────────────
// New/vanishing categories
// ────────────────────────────────────────────────────

#[test]
fn pm_new_category_only() {
    let prev = vec![cat("A", 100.0, 50_000.0)];
    let cur = vec![cat("A", 100.0, 50_000.0), cat("B", 50.0, 30_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.is_finite());
    assert!(r.mix_effect.is_finite());
}

#[test]
fn pm_vanishing_category_only() {
    let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 50.0, 30_000.0)];
    let cur = vec![cat("A", 100.0, 50_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.is_finite());
    assert!(r.mix_effect.is_finite());
}

#[test]
fn pm_simultaneous_new_and_vanishing() {
    let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 80_000.0)];
    let cur = vec![cat("A", 100.0, 50_000.0), cat("C", 100.0, 70_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.is_finite());
    assert!(r.mix_effect.is_finite());
}

#[test]
fn pm_complete_turnover() {
    // All prev categories vanish, all cur categories are new
    let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 80_000.0)];
    let cur = vec![cat("C", 150.0, 90_000.0), cat("D", 50.0, 40_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.is_finite());
    assert!(r.mix_effect.is_finite());
}

// ────────────────────────────────────────────────────
// Order stability (decomposePriceMix)
// ────────────────────────────────────────────────────

#[test]
fn pm_order_stability_reverse() {
    let prev = vec![
        cat("A", 100.0, 100_000.0),
        cat("B", 80.0, 48_000.0),
        cat("C", 120.0, 36_000.0),
    ];
    let cur = vec![
        cat("A", 110.0, 121_000.0),
        cat("B", 90.0, 58_500.0),
        cat("C", 100.0, 35_000.0),
    ];
    let r1 = decompose_price_mix(&cur, &prev).unwrap();

    let prev_rev: Vec<_> = prev.iter().rev().cloned().collect();
    let cur_rev: Vec<_> = cur.iter().rev().cloned().collect();
    let r2 = decompose_price_mix(&cur_rev, &prev_rev).unwrap();

    let tol = 1e-10;
    assert!((r1.price_effect - r2.price_effect).abs() < tol);
    assert!((r1.mix_effect - r2.mix_effect).abs() < tol);
}

#[test]
fn pm_order_stability_custom_shuffle() {
    let prev = vec![
        cat("A", 100.0, 100_000.0),
        cat("B", 80.0, 48_000.0),
        cat("C", 120.0, 36_000.0),
    ];
    let cur = vec![
        cat("A", 110.0, 121_000.0),
        cat("B", 90.0, 58_500.0),
        cat("C", 100.0, 35_000.0),
    ];
    let r1 = decompose_price_mix(&cur, &prev).unwrap();

    let prev_shuf = vec![prev[1].clone(), prev[2].clone(), prev[0].clone()];
    let cur_shuf = vec![cur[2].clone(), cur[0].clone(), cur[1].clone()];
    let r2 = decompose_price_mix(&cur_shuf, &prev_shuf).unwrap();

    let tol = 1e-10;
    assert!((r1.price_effect - r2.price_effect).abs() < tol);
    assert!((r1.mix_effect - r2.mix_effect).abs() < tol);
}

#[test]
fn pm_order_stability_with_new_vanishing() {
    let prev = vec![
        cat("A", 100.0, 100_000.0),
        cat("B", 80.0, 48_000.0), // vanishes
    ];
    let cur = vec![
        cat("A", 110.0, 121_000.0),
        cat("C", 90.0, 58_500.0), // new
    ];
    let r1 = decompose_price_mix(&cur, &prev).unwrap();

    // Reverse order
    let prev_rev: Vec<_> = prev.iter().rev().cloned().collect();
    let cur_rev: Vec<_> = cur.iter().rev().cloned().collect();
    let r2 = decompose_price_mix(&cur_rev, &prev_rev).unwrap();

    let tol = 1e-10;
    assert!((r1.price_effect - r2.price_effect).abs() < tol);
    assert!((r1.mix_effect - r2.mix_effect).abs() < tol);
}

// ────────────────────────────────────────────────────
// Duplicate key ordering
// ────────────────────────────────────────────────────

#[test]
fn pm_duplicate_key_order_aab() {
    let prev = vec![cat("A", 50.0, 25_000.0), cat("A", 50.0, 25_000.0), cat("B", 100.0, 60_000.0)];
    let r1 = decompose_price_mix(
        &[cat("A", 60.0, 36_000.0), cat("A", 40.0, 24_000.0), cat("B", 100.0, 60_000.0)],
        &prev,
    )
    .unwrap();

    // Reorder: A, B, A
    let prev_aba = vec![cat("A", 50.0, 25_000.0), cat("B", 100.0, 60_000.0), cat("A", 50.0, 25_000.0)];
    let r2 = decompose_price_mix(
        &[cat("A", 40.0, 24_000.0), cat("B", 100.0, 60_000.0), cat("A", 60.0, 36_000.0)],
        &prev_aba,
    )
    .unwrap();

    // Reorder: B, A, A
    let prev_baa = vec![cat("B", 100.0, 60_000.0), cat("A", 50.0, 25_000.0), cat("A", 50.0, 25_000.0)];
    let r3 = decompose_price_mix(
        &[cat("B", 100.0, 60_000.0), cat("A", 60.0, 36_000.0), cat("A", 40.0, 24_000.0)],
        &prev_baa,
    )
    .unwrap();

    let tol = 1e-10;
    assert!((r1.price_effect - r2.price_effect).abs() < tol);
    assert!((r1.mix_effect - r2.mix_effect).abs() < tol);
    assert!((r1.price_effect - r3.price_effect).abs() < tol);
    assert!((r1.mix_effect - r3.mix_effect).abs() < tol);
}

// ────────────────────────────────────────────────────
// Single category
// ────────────────────────────────────────────────────

#[test]
fn pm_single_category_mix_zero() {
    let prev = vec![cat("A", 100.0, 50_000.0)];
    let cur = vec![cat("A", 100.0, 60_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.mix_effect.abs() < 1e-10);
    assert_close(r.price_effect, 10_000.0, 1e-10);
}

#[test]
fn pm_single_category_qty_change() {
    let prev = vec![cat("A", 100.0, 50_000.0)];
    let cur = vec![cat("A", 200.0, 100_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    // Same unit price (500), just more qty → no price effect, only mix from share change
    // But single category → share always 100% → mix ≈ 0
    assert!(r.price_effect.abs() < 1e-10);
    assert!(r.mix_effect.abs() < 1e-10);
}

// ────────────────────────────────────────────────────
// Precision edge cases
// ────────────────────────────────────────────────────

#[test]
fn d2_tiny_difference() {
    let r = decompose2(100_000.0, 100_001.0, 100.0, 100.0);
    assert_close(r.cust_effect + r.ticket_effect, 1.0, 1e-10);
    assert_eq!(r.cust_effect, 0.0);
    assert_close(r.ticket_effect, 1.0, 1e-10);
}

#[test]
fn d5_near_equal_price_mix_split() {
    // When price/mix total is near zero, 50/50 split applies
    let prev_cats = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 50_000.0)];
    let cur_cats = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 50_000.0)];
    // No change at all → all effects should be zero
    let r = decompose5(100_000.0, 100_000.0, 100.0, 100.0, 200.0, 200.0, &cur_cats, &prev_cats)
        .unwrap();
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_close(r.price_effect, 0.0, 1e-10);
    assert_close(r.mix_effect, 0.0, 1e-10);
}

// ────────────────────────────────────────────────────
// safeDivide edge cases
// ────────────────────────────────────────────────────

#[test]
fn safe_divide_zero_denominator() {
    assert_eq!(safe_divide(10.0, 0.0, 0.0), 0.0);
    assert_eq!(safe_divide(10.0, 0.0, 99.0), 99.0);
}

#[test]
fn safe_divide_negative_zero() {
    assert_eq!(safe_divide(10.0, -0.0, 42.0), 42.0);
}

#[test]
fn safe_divide_nan_denominator() {
    assert!(safe_divide(10.0, f64::NAN, 0.0).is_nan());
}

#[test]
fn safe_divide_nan_numerator() {
    assert!(safe_divide(f64::NAN, 5.0, 0.0).is_nan());
    assert_eq!(safe_divide(f64::NAN, 0.0, 99.0), 99.0);
}

#[test]
fn safe_divide_infinity() {
    assert_eq!(safe_divide(10.0, f64::INFINITY, 0.0), 0.0);
    assert_eq!(safe_divide(f64::INFINITY, 2.0, 0.0), f64::INFINITY);
}
