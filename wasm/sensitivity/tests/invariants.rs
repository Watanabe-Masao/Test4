//! Mathematical invariants for sensitivity analysis.
//!
//! @contractId ANA-003
//! @methodFamily what_if
//! @see references/03-guides/invariant-catalog.md

use sensitivity_wasm::sensitivity::{
    calculate_sensitivity, calculate_elasticity,
    SensitivityBase, SensitivityDeltas,
};

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol,
    );
}

fn make_base() -> SensitivityBase {
    SensitivityBase {
        total_sales: 1_000_000.0,
        total_cost: 600_000.0,
        total_discount: 50_000.0,
        gross_sales: 1_050_000.0,
        total_customers: 5_000.0,
        total_cost_inclusion: 20_000.0,
        average_markup_rate: 0.3,
        budget: 1_200_000.0,
        elapsed_days: 15.0,
        sales_days: 30.0,
    }
}

fn make_scenarios() -> Vec<SensitivityBase> {
    vec![
        make_base(),
        SensitivityBase {
            total_sales: 500_000.0, total_cost: 300_000.0, total_discount: 25_000.0,
            gross_sales: 525_000.0, total_customers: 2_500.0, total_cost_inclusion: 10_000.0,
            average_markup_rate: 0.25, budget: 600_000.0, elapsed_days: 10.0, sales_days: 28.0,
        },
        SensitivityBase {
            total_sales: 3_000_000.0, total_cost: 1_800_000.0, total_discount: 150_000.0,
            gross_sales: 3_150_000.0, total_customers: 15_000.0, total_cost_inclusion: 60_000.0,
            average_markup_rate: 0.35, budget: 3_600_000.0, elapsed_days: 20.0, sales_days: 31.0,
        },
    ]
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-1: Zero-delta identity
//   δ = 0 ⇒ grossProfitDelta = 0 ∧ salesDelta = 0
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_1_zero_delta_identity() {
    let zero = SensitivityDeltas {
        discount_rate_delta: 0.0, customers_delta: 0.0,
        transaction_value_delta: 0.0, cost_rate_delta: 0.0,
    };
    for base in make_scenarios() {
        let r = calculate_sensitivity(&base, &zero);
        assert_close(r.gross_profit_delta, 0.0, 1e-6);
        assert_close(r.sales_delta, 0.0, 1e-6);
        assert_close(r.projected_sales_delta, 0.0, 1e-6);
        assert_close(r.budget_achievement_delta, 0.0, 1e-6);
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-2: Base gross profit identity
//   baseGP = grossSales - totalCost - totalDiscount - totalCostInclusion
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_2_base_gp_identity() {
    let zero = SensitivityDeltas {
        discount_rate_delta: 0.0, customers_delta: 0.0,
        transaction_value_delta: 0.0, cost_rate_delta: 0.0,
    };
    for base in make_scenarios() {
        let r = calculate_sensitivity(&base, &zero);
        let expected = base.gross_sales - base.total_cost - base.total_discount - base.total_cost_inclusion;
        assert_close(r.base_gross_profit, expected, 1e-6);
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-3: Sales delta identity
//   salesDelta = simulatedSales - totalSales
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_3_sales_delta_identity() {
    let deltas = [
        SensitivityDeltas { discount_rate_delta: 0.0, customers_delta: 0.1, transaction_value_delta: 0.0, cost_rate_delta: 0.0 },
        SensitivityDeltas { discount_rate_delta: -0.02, customers_delta: 0.0, transaction_value_delta: 0.05, cost_rate_delta: -0.01 },
    ];
    for base in make_scenarios() {
        for d in &deltas {
            let r = calculate_sensitivity(&base, d);
            assert_close(r.sales_delta, r.simulated_sales - base.total_sales, 1e-6);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-4: GP delta identity
//   gpDelta = simulatedGP - baseGP
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_4_gp_delta_identity() {
    let deltas = SensitivityDeltas {
        discount_rate_delta: -0.01, customers_delta: 0.05,
        transaction_value_delta: 0.02, cost_rate_delta: -0.01,
    };
    for base in make_scenarios() {
        let r = calculate_sensitivity(&base, &deltas);
        assert_close(r.gross_profit_delta, r.simulated_gross_profit - r.base_gross_profit, 1e-6);
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-5: Customer monotonicity
//   customersDelta > 0 ⇒ salesDelta > 0 (other deltas = 0, base valid)
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_5_customer_monotonicity() {
    for base in make_scenarios() {
        if base.total_customers == 0.0 { continue; }
        let r = calculate_sensitivity(&base, &SensitivityDeltas {
            discount_rate_delta: 0.0, customers_delta: 0.1,
            transaction_value_delta: 0.0, cost_rate_delta: 0.0,
        });
        assert!(r.sales_delta > 0.0, "more customers should increase sales");
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-6: Finite guarantee
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_6_finite_guarantee() {
    let deltas = SensitivityDeltas {
        discount_rate_delta: -0.02, customers_delta: 0.1,
        transaction_value_delta: 0.05, cost_rate_delta: -0.01,
    };
    for base in make_scenarios() {
        let r = calculate_sensitivity(&base, &deltas);
        assert!(r.base_gross_profit.is_finite());
        assert!(r.simulated_gross_profit.is_finite());
        assert!(r.gross_profit_delta.is_finite());
        assert!(r.simulated_sales.is_finite());
        assert!(r.budget_achievement_delta.is_finite());
    }
}

// ════════════════════════════════════════════════════════════════
// SENS-INV-7: Elasticity sign consistency
//   discount improvement (negative delta) → positive GP delta
//   cost improvement (negative delta) → positive GP delta
//   customer increase → positive GP delta
// ════════════════════════════════════════════════════════════════

#[test]
fn sens_inv_7_elasticity_sign_consistency() {
    for base in make_scenarios() {
        if base.total_customers == 0.0 { continue; }
        let e = calculate_elasticity(&base);
        // Discount improvement (delta = -1pt) → GP should increase
        assert!(e.discount_rate_elasticity > 0.0,
            "discount improvement should increase GP");
        // Customer increase → GP should increase
        assert!(e.customers_elasticity > 0.0,
            "customer increase should increase GP");
        // Transaction value increase → GP should increase
        assert!(e.transaction_value_elasticity > 0.0,
            "tx value increase should increase GP");
        // Cost reduction → GP should increase
        assert!(e.cost_rate_elasticity > 0.0,
            "cost reduction should increase GP");
    }
}
