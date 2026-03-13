//! Cross-validation: TS reference implementation golden fixtures.
//!
//! This file ports the test cases from the TS authoritative reference
//! (app/src/domain/calculations/__tests__/factorDecomposition.test.ts)
//! as golden fixtures. The purpose is to verify that the Rust implementation
//! produces results matching the TS reference — not to prove mathematical
//! correctness (that is shapley_invariants.rs's job).
//!
//! Golden values are from the TS test suite at the time of initial Rust port.

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

// ════════════════════════════════════════════════════
// decompose2 golden (TS lines 14-53)
// ════════════════════════════════════════════════════

#[test]
fn golden_d2_customer_only() {
    let r = decompose2(100_000.0, 120_000.0, 100.0, 120.0);
    assert_eq!(r.cust_effect, 20_000.0);
    assert_eq!(r.ticket_effect, 0.0);
}

#[test]
fn golden_d2_ticket_only() {
    let r = decompose2(100_000.0, 120_000.0, 100.0, 100.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.ticket_effect, 20_000.0);
}

#[test]
fn golden_d2_both_change() {
    let ps = 100_000.0;
    let cs = 132_000.0;
    let r = decompose2(ps, cs, 100.0, 110.0);
    assert_close(r.cust_effect + r.ticket_effect, cs - ps, 0.01);
}

#[test]
fn golden_d2_interaction() {
    let r = decompose2(100_000.0, 132_000.0, 100.0, 110.0);
    assert_eq!(r.cust_effect, 11_000.0);
    assert_eq!(r.ticket_effect, 21_000.0);
    assert_eq!(r.cust_effect + r.ticket_effect, 32_000.0);
}

#[test]
fn golden_d2_zero_customers() {
    let r = decompose2(0.0, 50_000.0, 0.0, 50.0);
    assert!(r.cust_effect.is_finite());
    assert!(r.ticket_effect.is_finite());
    assert_close(r.cust_effect + r.ticket_effect, 50_000.0, 0.01);
}

// ════════════════════════════════════════════════════
// decompose3 golden (TS lines 58-103)
// ════════════════════════════════════════════════════

#[test]
fn golden_d3_shapley_identity() {
    let ps = 250_000.0;
    let cs = 396_000.0;
    let r = decompose3(ps, cs, 100.0, 110.0, 500.0, 660.0);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        cs - ps,
        0.01,
    );
}

#[test]
fn golden_d3_qty_only() {
    let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 600.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.price_per_item_effect, 0.0);
    assert_eq!(r.qty_effect, 50_000.0);
}

#[test]
fn golden_d3_price_only() {
    let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 500.0);
    assert_eq!(r.cust_effect, 0.0);
    assert_eq!(r.qty_effect, 0.0);
    assert_close(r.price_per_item_effect, 50_000.0, 0.01);
}

#[test]
fn golden_d3_cust_only() {
    let r = decompose3(250_000.0, 275_000.0, 100.0, 110.0, 500.0, 550.0);
    assert_close(r.qty_effect, 0.0, 0.01);
    assert_close(r.price_per_item_effect, 0.0, 0.01);
    assert_close(r.cust_effect, 25_000.0, 0.01);
}

#[test]
fn golden_d3_all_change() {
    let ps = 250_000.0;
    let cs = 432_000.0;
    let r = decompose3(ps, cs, 100.0, 120.0, 500.0, 720.0);
    assert_close(
        r.cust_effect + r.qty_effect + r.price_per_item_effect,
        cs - ps,
        0.01,
    );
    assert!(r.cust_effect > 0.0);
    assert!(r.qty_effect > 0.0);
    assert!(r.price_per_item_effect > 0.0);
}

// ════════════════════════════════════════════════════
// decomposePriceMix golden (TS lines 107-208)
// ════════════════════════════════════════════════════

#[test]
fn golden_pm_empty() {
    assert!(decompose_price_mix(&[], &[]).is_none());
}

#[test]
fn golden_pm_zero_prev_qty() {
    let cur = vec![cat("A", 10.0, 5000.0)];
    let prev = vec![cat("A", 0.0, 0.0)];
    assert!(decompose_price_mix(&cur, &prev).is_none());
}

#[test]
fn golden_pm_zero_cur_qty() {
    let prev = vec![cat("A", 10.0, 5000.0)];
    let cur = vec![cat("A", 0.0, 0.0)];
    assert!(decompose_price_mix(&cur, &prev).is_none());
}

#[test]
fn golden_pm_price_only() {
    let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
    let cur = vec![cat("A", 100.0, 110_000.0), cat("B", 100.0, 50_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.mix_effect.abs() < 1.0);
    assert_eq!(r.price_effect.round(), 10_000.0);
}

#[test]
fn golden_pm_mix_only() {
    let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
    let cur = vec![cat("A", 150.0, 150_000.0), cat("B", 50.0, 25_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
    assert!(r.mix_effect > 0.0);
}

#[test]
fn golden_pm_both_change() {
    let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
    let cur = vec![cat("A", 120.0, 132_000.0), cat("B", 80.0, 44_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    let cur_total_amt: f64 = 132_000.0 + 44_000.0; // 176,000
    let prev_total_amt: f64 = 100_000.0 + 50_000.0; // 150,000
    let cur_total_qty: f64 = 200.0;
    let expected_total: f64 = cur_total_amt - cur_total_qty * (prev_total_amt / 200.0);
    assert_eq!(
        (r.price_effect + r.mix_effect).round(),
        expected_total.round()
    );
}

#[test]
fn golden_pm_new_category() {
    let prev = vec![cat("A", 200.0, 100_000.0)];
    let cur = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
}

#[test]
fn golden_pm_vanishing_category() {
    let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
    let cur = vec![cat("A", 200.0, 100_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.price_effect.abs() < 1.0);
    assert!(r.mix_effect < 0.0);
}

#[test]
fn golden_pm_duplicate_keys() {
    let prev = vec![cat("A", 50.0, 25_000.0), cat("A", 50.0, 25_000.0)];
    let cur = vec![cat("A", 60.0, 36_000.0), cat("A", 40.0, 24_000.0)];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert_eq!(r.price_effect.round(), 10_000.0);
    assert!(r.mix_effect.abs() < 1.0);
}

#[test]
fn golden_pm_three_categories() {
    let prev = vec![
        cat("A", 100.0, 100_000.0),
        cat("B", 100.0, 50_000.0),
        cat("C", 100.0, 30_000.0),
    ];
    let cur = vec![
        cat("A", 100.0, 110_000.0),
        cat("B", 100.0, 50_000.0),
        cat("C", 100.0, 30_000.0),
    ];
    let r = decompose_price_mix(&cur, &prev).unwrap();
    assert!(r.mix_effect.abs() < 1.0);
    let expected: f64 = 300.0 * ((1100.0 - 1000.0) * (1.0 / 3.0));
    assert_eq!(r.price_effect.round(), expected.round());
}

// ════════════════════════════════════════════════════
// decompose5 golden (TS lines 212-315)
// ════════════════════════════════════════════════════

#[test]
fn golden_d5_identity() {
    let prev_cats = vec![cat("A", 300.0, 240_000.0), cat("B", 200.0, 80_000.0)];
    let cur_cats = vec![cat("A", 400.0, 360_000.0), cat("B", 260.0, 117_000.0)];
    let ps = 320_000.0;
    let cs = 477_000.0;

    let r = decompose5(ps, cs, 100.0, 110.0, 500.0, 660.0, &cur_cats, &prev_cats).unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - (cs - ps)).abs() < 1.0);
}

#[test]
fn golden_d5_empty_categories() {
    let r = decompose5(100_000.0, 120_000.0, 100.0, 110.0, 500.0, 600.0, &[], &[]);
    assert!(r.is_none());
}

#[test]
fn golden_d5_cust_only() {
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
fn golden_d5_price_only() {
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
fn golden_d5_all_change_interaction() {
    let prev_cats = vec![cat("A", 500.0, 250_000.0)];
    let cur_cats = vec![cat("A", 720.0, 432_000.0)];

    let r = decompose5(250_000.0, 432_000.0, 100.0, 120.0, 500.0, 720.0, &cur_cats, &prev_cats)
        .unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - 182_000.0).abs() < 1.0);
    assert!(r.cust_effect > 0.0);
    assert!(r.qty_effect > 0.0);
    assert!(r.price_effect > 0.0);
    assert!(r.mix_effect.abs() < 1.0); // 1 category → no mix
}

#[test]
fn golden_d5_mismatched_sales_totals() {
    let prev_cats = vec![cat("A", 300.0, 240_000.0), cat("B", 200.0, 80_000.0)];
    let cur_cats = vec![cat("A", 400.0, 360_000.0), cat("B", 260.0, 117_000.0)];
    let ps = 350_000.0;
    let cs = 500_000.0;

    let r = decompose5(ps, cs, 100.0, 110.0, 500.0, 660.0, &cur_cats, &prev_cats).unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - (cs - ps)).abs() < 1.0);
}

#[test]
fn golden_d5_consistency_with_d3() {
    let prev_cats = vec![cat("A", 300.0, 240_000.0), cat("B", 200.0, 80_000.0)];
    let cur_cats = vec![cat("A", 400.0, 360_000.0), cat("B", 260.0, 117_000.0)];
    let ps = 320_000.0;
    let cs = 477_000.0;

    let d3 = decompose3(ps, cs, 100.0, 110.0, 500.0, 660.0);
    let d5 = decompose5(ps, cs, 100.0, 110.0, 500.0, 660.0, &cur_cats, &prev_cats).unwrap();

    assert_close(d5.cust_effect, d3.cust_effect, 0.01);
    assert_close(d5.qty_effect, d3.qty_effect, 0.01);
    assert_close(d5.price_effect + d5.mix_effect, d3.price_per_item_effect, 0.01);
}

// ════════════════════════════════════════════════════
// Parametric invariants (TS lines 319-362)
// ════════════════════════════════════════════════════

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
fn golden_parametric_d2() {
    for s in SCENARIOS {
        let r = decompose2(s.ps, s.cs, s.pc, s.cc);
        assert_close(r.cust_effect + r.ticket_effect, s.cs - s.ps, 1.0);
    }
}

#[test]
fn golden_parametric_d3() {
    for s in SCENARIOS {
        let r = decompose3(s.ps, s.cs, s.pc, s.cc, s.ptq, s.ctq);
        assert_close(
            r.cust_effect + r.qty_effect + r.price_per_item_effect,
            s.cs - s.ps,
            1.0,
        );
    }
}

#[test]
fn golden_d5_large_variation() {
    let prev_cats = vec![
        cat("A", 1000.0, 500_000.0),
        cat("B", 500.0, 300_000.0),
        cat("C", 200.0, 200_000.0),
    ];
    let cur_cats = vec![
        cat("A", 800.0, 480_000.0),
        cat("B", 900.0, 630_000.0),
        cat("D", 300.0, 240_000.0),
    ];
    let r =
        decompose5(1_200_000.0, 1_500_000.0, 500.0, 600.0, 1700.0, 2000.0, &cur_cats, &prev_cats)
            .unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - 300_000.0).abs() < 1.0);
}

#[test]
fn golden_d5_mismatched_cat_totals() {
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
    let r =
        decompose5(300_000.0, 450_000.0, 100.0, 130.0, 350.0, 500.0, &cur_cats, &prev_cats)
            .unwrap();
    let total = r.cust_effect + r.qty_effect + r.price_effect + r.mix_effect;
    assert!((total - 150_000.0).abs() < 1.0);
}

// ════════════════════════════════════════════════════
// PI/PPI consistency (TS lines 366-415)
// C × Q × P̄ = S
// ════════════════════════════════════════════════════

#[test]
fn golden_pi_ppi_identity() {
    let ps = 250_000.0;
    let cs = 396_000.0;
    let pc = 100.0;
    let cc = 110.0;
    let ptq = 500.0;
    let ctq = 660.0;

    let prev_pi = safe_divide(ptq, pc, 0.0); // 5
    let cur_pi = safe_divide(ctq, cc, 0.0); // 6
    let prev_ppi = safe_divide(ps, ptq, 0.0); // 500
    let cur_ppi = safe_divide(cs, ctq, 0.0); // 600

    assert_close(prev_pi, 5.0, 1e-10);
    assert_close(cur_pi, 6.0, 1e-10);
    assert_close(prev_ppi, 500.0, 1e-10);
    assert_close(cur_ppi, 600.0, 1e-10);

    assert_close(pc * prev_pi * prev_ppi, ps, 0.01);
    assert_close(cc * cur_pi * cur_ppi, cs, 0.01);
}

#[test]
fn golden_pi_ppi_parametric() {
    let scenarios = [
        (200_000.0, 350_000.0, 80.0, 120.0, 400.0, 720.0),
        (500_000.0, 300_000.0, 200.0, 120.0, 1000.0, 600.0),
        (100_000.0, 150_000.0, 50.0, 50.0, 200.0, 200.0),
        (1_000_000.0, 1_200_000.0, 500.0, 600.0, 5000.0, 7200.0),
    ];

    for (ps, cs, pc, cc, ptq, ctq) in scenarios {
        let prev_pi = safe_divide(ptq, pc, 0.0);
        let cur_pi = safe_divide(ctq, cc, 0.0);
        let prev_ppi = safe_divide(ps, ptq, 0.0);
        let cur_ppi = safe_divide(cs, ctq, 0.0);

        assert_close(pc * prev_pi * prev_ppi, ps, 0.01);
        assert_close(cc * cur_pi * cur_ppi, cs, 0.01);
    }
}

// ════════════════════════════════════════════════════
// 2↔3↔5 cross-level consistency (TS lines 418-452)
// ════════════════════════════════════════════════════

#[test]
fn golden_d2_d3_total_consistent() {
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
fn golden_d3_d5_components_consistent() {
    let prev_cats = vec![cat("A", 250.0, 125_000.0), cat("B", 150.0, 75_000.0)];
    let cur_cats = vec![cat("A", 420.0, 252_000.0), cat("B", 300.0, 168_000.0)];
    let (ps, cs, pc, cc, ptq, ctq) = (200_000.0, 350_000.0, 80.0, 120.0, 400.0, 720.0);

    let d3 = decompose3(ps, cs, pc, cc, ptq, ctq);
    let d5 = decompose5(ps, cs, pc, cc, ptq, ctq, &cur_cats, &prev_cats).unwrap();

    assert_close(d5.price_effect + d5.mix_effect, d3.price_per_item_effect, 1.0);
    assert_close(d5.cust_effect, d3.cust_effect, 1.0);
    assert_close(d5.qty_effect, d3.qty_effect, 1.0);
}
