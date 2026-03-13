use crate::price_mix::decompose_price_mix;
use crate::types::{FiveFactorResult, ThreeFactorResult, TwoFactorResult};
use crate::utils::safe_divide;

/// S = C × T (customers × ticket price) Shapley decomposition
///
///   φ_C = (C₁−C₀) × ½(T₀+T₁)
///   φ_T = (T₁−T₀) × ½(C₀+C₁)
pub fn decompose2(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
) -> TwoFactorResult {
    let t0 = safe_divide(prev_sales, prev_cust, 0.0);
    let t1 = safe_divide(cur_sales, cur_cust, 0.0);
    TwoFactorResult {
        cust_effect: (cur_cust - prev_cust) * 0.5 * (t0 + t1),
        ticket_effect: (t1 - t0) * 0.5 * (prev_cust + cur_cust),
    }
}

/// S = C × Q × P̄ (customers × items-per-customer × price-per-item)
/// 3-variable Shapley decomposition
///
///   φ_C = ΔC/6 × (2Q₀P̄₀ + Q₁P̄₀ + Q₀P̄₁ + 2Q₁P̄₁)
///   φ_Q = ΔQ/6 × (2C₀P̄₀ + C₁P̄₀ + C₀P̄₁ + 2C₁P̄₁)
///   φ_P̄ = ΔP̄/6 × (2C₀Q₀ + C₁Q₀ + C₀Q₁ + 2C₁Q₁)
pub fn decompose3(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
    prev_total_qty: f64,
    cur_total_qty: f64,
) -> ThreeFactorResult {
    let c0 = prev_cust;
    let c1 = cur_cust;
    let q0 = safe_divide(prev_total_qty, prev_cust, 0.0);
    let q1 = safe_divide(cur_total_qty, cur_cust, 0.0);
    let p0 = safe_divide(prev_sales, prev_total_qty, 0.0);
    let p1 = safe_divide(cur_sales, cur_total_qty, 0.0);

    let sixth = 1.0 / 6.0;
    ThreeFactorResult {
        cust_effect: (c1 - c0) * sixth * (2.0 * q0 * p0 + q1 * p0 + q0 * p1 + 2.0 * q1 * p1),
        qty_effect: (q1 - q0) * sixth * (2.0 * c0 * p0 + c1 * p0 + c0 * p1 + 2.0 * c1 * p1),
        price_per_item_effect: (p1 - p0)
            * sixth
            * (2.0 * c0 * q0 + c1 * q0 + c0 * q1 + 2.0 * c1 * q1),
    }
}

/// S = C × Q × P̄ split into 4 factors: customer + qty + price + mix
///
/// Composes 3-variable Shapley (decompose3) with price/mix decomposition:
/// 1. decompose3 → cust_effect, qty_effect, price_per_item_effect
/// 2. decompose_price_mix → price_effect, mix_effect (ratio)
/// 3. Split price_per_item_effect by the price/mix ratio
///
/// Returns None when price/mix decomposition is not computable
/// (empty categories or zero total quantity in either period).
pub fn decompose5(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
    prev_total_qty: f64,
    cur_total_qty: f64,
    cur_categories: &[(String, f64, f64)],
    prev_categories: &[(String, f64, f64)],
) -> Option<FiveFactorResult> {
    let d3 = decompose3(prev_sales, cur_sales, prev_cust, cur_cust, prev_total_qty, cur_total_qty);

    let pm = decompose_price_mix(cur_categories, prev_categories)?;

    let pm_total = pm.price_effect + pm.mix_effect;
    let (price_effect, mix_effect) = if pm_total.abs() < 1.0 {
        // Near-zero price change: split equally
        (d3.price_per_item_effect * 0.5, d3.price_per_item_effect * 0.5)
    } else {
        let price_fraction = pm.price_effect / pm_total;
        (
            d3.price_per_item_effect * price_fraction,
            d3.price_per_item_effect * (1.0 - price_fraction),
        )
    };

    Some(FiveFactorResult {
        cust_effect: d3.cust_effect,
        qty_effect: d3.qty_effect,
        price_effect,
        mix_effect,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(a: f64, b: f64, tol: f64) {
        assert!(
            (a - b).abs() < tol,
            "expected {} ≈ {} (diff={})",
            a,
            b,
            (a - b).abs()
        );
    }

    #[test]
    fn decompose2_customer_only() {
        let r = decompose2(100_000.0, 120_000.0, 100.0, 120.0);
        assert_eq!(r.cust_effect, 20_000.0);
        assert_eq!(r.ticket_effect, 0.0);
    }

    #[test]
    fn decompose2_ticket_only() {
        let r = decompose2(100_000.0, 120_000.0, 100.0, 100.0);
        assert_eq!(r.cust_effect, 0.0);
        assert_eq!(r.ticket_effect, 20_000.0);
    }

    #[test]
    fn decompose2_both_change_shapley_identity() {
        let ps = 100_000.0;
        let cs = 132_000.0;
        let r = decompose2(ps, cs, 100.0, 110.0);
        assert_close(r.cust_effect + r.ticket_effect, cs - ps, 0.01);
    }

    #[test]
    fn decompose2_interaction_allocation() {
        let r = decompose2(100_000.0, 132_000.0, 100.0, 110.0);
        assert_eq!(r.cust_effect, 11_000.0);
        assert_eq!(r.ticket_effect, 21_000.0);
        assert_eq!(r.cust_effect + r.ticket_effect, 32_000.0);
    }

    #[test]
    fn decompose2_zero_customers() {
        let r = decompose2(0.0, 50_000.0, 0.0, 50.0);
        assert!(r.cust_effect.is_finite());
        assert!(r.ticket_effect.is_finite());
        assert_close(r.cust_effect + r.ticket_effect, 50_000.0, 0.01);
    }

    #[test]
    fn decompose3_shapley_identity() {
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
    fn decompose3_qty_only() {
        let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 600.0);
        assert_eq!(r.cust_effect, 0.0);
        assert_eq!(r.price_per_item_effect, 0.0);
        assert_eq!(r.qty_effect, 50_000.0);
    }

    #[test]
    fn decompose3_price_only() {
        let r = decompose3(250_000.0, 300_000.0, 100.0, 100.0, 500.0, 500.0);
        assert_eq!(r.cust_effect, 0.0);
        assert_eq!(r.qty_effect, 0.0);
        assert_close(r.price_per_item_effect, 50_000.0, 0.01);
    }

    #[test]
    fn decompose3_cust_only() {
        let r = decompose3(250_000.0, 275_000.0, 100.0, 110.0, 500.0, 550.0);
        assert_close(r.qty_effect, 0.0, 0.01);
        assert_close(r.price_per_item_effect, 0.0, 0.01);
        assert_close(r.cust_effect, 25_000.0, 0.01);
    }

    #[test]
    fn decompose3_all_change_interaction() {
        // C: 100→120, QPC: 5→6, PPI: 500→600
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

    // Parametric invariant tests matching TS scenarios
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
    fn decompose2_parametric_invariants() {
        for s in SCENARIOS {
            let r = decompose2(s.ps, s.cs, s.pc, s.cc);
            assert_close(r.cust_effect + r.ticket_effect, s.cs - s.ps, 1.0);
        }
    }

    #[test]
    fn decompose3_parametric_invariants() {
        for s in SCENARIOS {
            let r = decompose3(s.ps, s.cs, s.pc, s.cc, s.ptq, s.ctq);
            assert_close(
                r.cust_effect + r.qty_effect + r.price_per_item_effect,
                s.cs - s.ps,
                1.0,
            );
        }
    }

    // Edge cases
    #[test]
    fn decompose2_both_zero() {
        let r = decompose2(0.0, 0.0, 0.0, 0.0);
        assert_eq!(r.cust_effect, 0.0);
        assert_eq!(r.ticket_effect, 0.0);
    }

    #[test]
    fn decompose3_both_zero() {
        let r = decompose3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(r.cust_effect, 0.0);
        assert_eq!(r.qty_effect, 0.0);
        assert_eq!(r.price_per_item_effect, 0.0);
    }

    #[test]
    fn decompose2_negative_sales() {
        let r = decompose2(100_000.0, 80_000.0, 100.0, 90.0);
        assert_close(r.cust_effect + r.ticket_effect, -20_000.0, 0.01);
    }

    #[test]
    fn decompose2_very_large_numbers() {
        let r = decompose2(1e15, 2e15, 1e6, 1.5e6);
        assert_close(r.cust_effect + r.ticket_effect, 1e15, 1.0);
    }
}
