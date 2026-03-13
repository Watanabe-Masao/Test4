//! Shapley invariant tests for all decomposition functions.
//!
//! These tests verify mathematical correctness: the sum of Shapley effects
//! must equal the sales delta (ΔS = curSales - prevSales) for every input.
//! This is independent of whether the Rust implementation matches the TS reference —
//! if these fail, the math is wrong.

use factor_decomposition_wasm::decompose::{decompose2, decompose3, decompose5};
use factor_decomposition_wasm::price_mix::decompose_price_mix;

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
// decompose2: φ_C + φ_T = ΔS
// ────────────────────────────────────────────────────

#[test]
fn d2_customer_only_change() {
    let r = decompose2(100_000.0, 120_000.0, 100.0, 120.0);
    assert_eq!(r.cust_effect, 20_000.0);
    assert_eq!(r.ticket_effect, 0.0);
}

#[test]
fn d2_ticket_only_change() {
    let r = decompose2(100_000.0, 120_000.0, 100.0, 100.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.ticket_effect, 20_000.0);
}

#[test]
fn d2_both_change_sum_equals_delta() {
    let ps = 100_000.0;
    let cs = 132_000.0;
    let r = decompose2(ps, cs, 100.0, 110.0);
    assert_close(r.cust_effect + r.ticket_effect, cs - ps, 1e-10);
}

#[test]
fn d2_interaction_allocation_exact() {
    // C: 100→110, T: 1000→1200
    // Shapley: custEffect = 10 × ½(1000+1200) = 11,000
    let r = decompose2(100_000.0, 132_000.0, 100.0, 110.0);
    assert_eq!(r.cust_effect, 11_000.0);
    assert_eq!(r.ticket_effect, 21_000.0);
    assert_eq!(r.cust_effect + r.ticket_effect, 32_000.0);
}

#[test]
fn d2_zero_prev_customers() {
    let r = decompose2(0.0, 50_000.0, 0.0, 50.0);
    assert!(r.cust_effect.is_finite());
    assert!(r.ticket_effect.is_finite());
    assert_close(r.cust_effect + r.ticket_effect, 50_000.0, 1e-10);
}

#[test]
fn d2_all_zero() {
    let r = decompose2(0.0, 0.0, 0.0, 0.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.ticket_effect, 0.0);
}

#[test]
fn d2_negative_delta() {
    let r = decompose2(100_000.0, 80_000.0, 100.0, 90.0);
    assert_close(r.cust_effect + r.ticket_effect, -20_000.0, 1e-10);
}

#[test]
fn d2_very_large_numbers() {
    let r = decompose2(1e15, 2e15, 1e6, 1.5e6);
    assert_close(r.cust_effect + r.ticket_effect, 1e15, 1.0);
}

#[test]
fn d2_sign_reversal_symmetry() {
    // If we swap prev/cur, effects should negate
    let r1 = decompose2(100_000.0, 132_000.0, 100.0, 110.0);
    let r2 = decompose2(132_000.0, 100_000.0, 110.0, 100.0);
    assert_close(r1.cust_effect, -r2.cust_effect, 1e-10);
    assert_close(r1.ticket_effect, -r2.ticket_effect, 1e-10);
}

// ────────────────────────────────────────────────────
// decompose3: φ_C + φ_Q + φ_P̄ = ΔS
// ────────────────────────────────────────────────────

#[test]
fn d3_shapley_identity() {
    let ps = 250_000.0;
    let cs = 396_000.0;
    let r = decompose3(ps, cs, 100.0, 110.0, 500.0, 660.0);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        cs - ps,
        1e-10,
    );
}

#[test]
fn d3_qty_only() {
    let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 600.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.price_per_item_effect, 0.0);
    assert_eq!(r.qty_effect, 50_000.0);
}

#[test]
fn d3_price_only() {
    let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 500.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_close(r.price_per_item_effect, 50_000.0, 1e-10);
}

#[test]
fn d3_cust_only() {
    // QPC=5, PPI=500 fixed → same Q/P per customer
    let r = decompose3(250_000.0, 275_000.0, 100.0, 110.0, 500.0, 550.0);
    assert_close(r.qty_effect, 0.0, 1e-10);
    assert_close(r.price_per_item_effect, 0.0, 1e-10);
    assert_close(r.cust_effect, 25_000.0, 1e-10);
}

#[test]
fn d3_all_change_all_positive() {
    // C: 100→120, QPC: 5→6, PPI: 500→600
    let ps = 250_000.0;
    let cs = 432_000.0;
    let r = decompose3(ps, cs, 100.0, 120.0, 500.0, 720.0);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        cs - ps,
        1e-10,
    );
    assert!(r.cust_effect > 0.0);
    assert!(r.qty_effect > 0.0);
    assert!(r.price_per_item_effect > 0.0);
}

#[test]
fn d3_all_zero() {
    let r = decompose3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_eq!(r.price_per_item_effect, 0.0);
}

// ────────────────────────────────────────────────────
// decompose_price_mix: φ_price + φ_mix = ΔAvgPrice × TQ₁
// ────────────────────────────────────────────────────

#[test]
fn pm_price_only_mix_near_zero() {
    let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
    let cur = vec![cat("A", 100.0, 110_000.0), cat("B", 100.0, 50_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.mix_effect.abs() < 1.0);
    assert_eq!(r.price_effect.round(), 10_000.0);
}

#[test]
fn pm_mix_only_price_near_zero() {
    let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
    let cur = vec![cat("A", 150.0, 150_000.0), cat("B", 50.0, 25_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
    assert!(r.mix_effect > 0.0);
}

#[test]
fn pm_new_category_price_near_zero() {
    let prev = vec![cat("A", 200.0, 100_000.0)];
    let cur = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
}

#[test]
fn pm_vanishing_category() {
    let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
    let cur = vec![cat("A", 200.0, 100_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
    assert!(r.mix_effect < 0.0); // Lost high-price B
}

// ────────────────────────────────────────────────────
// decompose5: φ_C + φ_Q + φ_price + φ_mix = ΔS
// ────────────────────────────────────────────────────

#[test]
fn d5_four_effects_sum_equals_delta() {
    let prev_cats = vec![cat("A", 300.0, 240_000.0), cat("B", 200.0, 80_000.0)];
    let cur_cats = vec![cat("A", 400.0, 360_000.0), cat("B", 260.0, 117_000.0)];
    let ps = 320_000.0;
    let cs = 477_000.0;

    let r = decompose5(ps, cs, 100.0, 110.0, 500.0, 660.0, &cur_cats, &prev_cats).unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - (cs - ps)).abs() < 1.0);
}

#[test]
fn d5_cust_only_others_near_zero() {
    let prev_cats = vec![cat("A", 500.0, 250_000.0)];
    let cur_cats = vec![cat("A", 550.0, 275_000.0)];

    let r = decompose5(250_000.0, 275_000.0, 100.0, 110.0, 500.0, 550.0, &cur_cats, &prev_cats)
        .unwrap();
    assert_close(r.cust_effect, 25_000.0, 1.0);
    assert!(r.qty_effect.abs() < 1.0);
    assert!(r.price_effect.abs() < 1.0);
    assert!(r.mix_effect.abs() < 1.0);
}

#[test]
fn d5_price_only_single_cat() {
    let prev_cats = vec![cat("A", 500.0, 250_000.0)];
    let cur_cats = vec![cat("A", 500.0, 300_000.0)];

    let r = decompose5(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 500.0, &cur_cats, &prev_cats)
        .unwrap();
    assert_eq!(r.cust_effect, 0.0);
    assert!(r.qty_effect.abs() < 1.0);
    assert!(r.mix_effect.abs() < 1.0);
    assert_eq!(r.price_effect.round(), 50_000.0);
}

#[test]
fn d5_empty_categories_returns_none() {
    let r = decompose5(100_000.0, 120_000.0, 100.0, 110.0, 500.0, 600.0, &[], &[]);
    assert!(r.is_none());
}

#[test]
fn d5_consistency_with_d3() {
    // d5.cust == d3.cust, d5.qty == d3.qty, d5.price + d5.mix == d3.ppi
    let prev_cats = vec![cat("A", 300.0, 240_000.0), cat("B", 200.0, 80_000.0)];
    let cur_cats = vec![cat("A", 400.0, 360_000.0), cat("B", 260.0, 117_000.0)];
    let ps = 320_000.0;
    let cs = 477_000.0;

    let d3 = decompose3(ps, cs, 100.0, 110.0, 500.0, 660.0);
    let d5 = decompose5(ps, cs, 100.0, 110.0, 500.0, 660.0, &cur_cats, &prev_cats).unwrap();

    assert_close(d5.cust_effect, d3.cust_effect, 1e-10);
    assert_close(d5.qty_effect, d3.qty_effect, 1e-10);
    assert_close(d5.price_effect + d5.mix_effect, d3.price_per_item_effect, 1e-10);
}

#[test]
fn d5_mismatched_sales_category_totals() {
    // Sales totals != category totals — must still sum to sales delta
    let prev_cats = vec![
        cat("X", 200.0, 160_000.0),
        cat("Y", 100.0, 80_000.0),
        cat("Z", 50.0, 40_000.0),
    ];
    let cur_cats = vec![
        cat("X", 300.0, 270_000.0),
        cat("Y", 80.0, 60_000.0),
        cat("Z", 120.0, 90_000.0),
    ];
    let ps = 300_000.0;
    let cs = 450_000.0;

    let r = decompose5(ps, cs, 100.0, 130.0, 350.0, 500.0, &cur_cats, &prev_cats).unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - (cs - ps)).abs() < 1.0);
}

// ────────────────────────────────────────────────────
// Parametric sweep: 6 scenarios × decompose2 + decompose3
// ────────────────────────────────────────────────────

struct Scenario {
    ps: f64,
    cs: f64,
    pc: f64,
    cc: f64,
    ptq: f64,
    ctq: f64,
}

const SCENARIOS: &[Scenario] = &[
    Scenario { ps: 200_000.0, cs: 350_000.0, pc: 80.0, cc: 120.0, ptq: 400.0, ctq: 720.0 },
    Scenario { ps: 500_000.0, cs: 300_000.0, pc: 200.0, cc: 120.0, ptq: 1000.0, ctq: 600.0 },
    Scenario { ps: 100_000.0, cs: 150_000.0, pc: 50.0, cc: 50.0, ptq: 200.0, ctq: 200.0 },
    Scenario { ps: 300_000.0, cs: 360_000.0, pc: 100.0, cc: 120.0, ptq: 500.0, ctq: 600.0 },
    Scenario { ps: 100_000.0, cs: 1_000_000.0, pc: 50.0, cc: 500.0, ptq: 200.0, ctq: 5000.0 },
    Scenario { ps: 100_000.0, cs: 100_100.0, pc: 100.0, cc: 101.0, ptq: 500.0, ctq: 505.0 },
];

#[test]
fn parametric_d2_invariants() {
    for s in SCENARIOS {
        let r = decompose2(s.ps, s.cs, s.pc, s.cc);
        assert_close(r.cust_effect + r.ticket_effect, s.cs - s.ps, 1.0);
    }
}

#[test]
fn parametric_d3_invariants() {
    for s in SCENARIOS {
        let r = decompose3(s.ps, s.cs, s.pc, s.cc, s.ptq, s.ctq);
        assert_close(
            r.cust_effect + r.qty_effect + r.price_per_item_effect,
            s.cs - s.ps,
            1.0,
        );
    }
}

// ────────────────────────────────────────────────────
// Cross-level consistency: 2↔3 total, 3↔5 components
// ────────────────────────────────────────────────────

#[test]
fn d2_d3_total_equality() {
    let (ps, cs, pc, cc, ptq, ctq) = (200_000.0, 350_000.0, 80.0, 120.0, 400.0, 720.0);
    let d2 = decompose2(ps, cs, pc, cc);
    let d3 = decompose3(ps, cs, pc, cc, ptq, ctq);
    assert_close(
        d2.cust_effect + d2.ticket_effect,
        d3.cust_effect + d3.qty_effect + d3.price_per_item_effect,
        1.0,
    );
}

#[test]
fn d3_d5_component_consistency() {
    let prev_cats = vec![cat("A", 250.0, 125_000.0), cat("B", 150.0, 75_000.0)];
    let cur_cats = vec![cat("A", 420.0, 252_000.0), cat("B", 300.0, 168_000.0)];
    let (ps, cs, pc, cc, ptq, ctq) = (200_000.0, 350_000.0, 80.0, 120.0, 400.0, 720.0);

    let d3 = decompose3(ps, cs, pc, cc, ptq, ctq);
    let d5 = decompose5(ps, cs, pc, cc, ptq, ctq, &cur_cats, &prev_cats).unwrap();

    assert_close(d5.cust_effect, d3.cust_effect, 1.0);
    assert_close(d5.qty_effect, d3.qty_effect, 1.0);
    assert_close(d5.price_effect + d5.mix_effect, d3.price_per_item_effect, 1.0);
}
