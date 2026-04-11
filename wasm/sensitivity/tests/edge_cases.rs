//! Edge cases: boundary conditions, extreme values.
//!
//! @contractId ANA-003

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

fn zero_base() -> SensitivityBase {
    SensitivityBase {
        total_sales: 0.0, total_cost: 0.0, total_discount: 0.0,
        gross_sales: 0.0, total_customers: 0.0, total_cost_inclusion: 0.0,
        average_markup_rate: 0.0, budget: 0.0, elapsed_days: 0.0, sales_days: 0.0,
    }
}

#[test]
fn all_zero_base() {
    let r = calculate_sensitivity(&zero_base(), &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    });
    assert_eq!(r.base_gross_profit, 0.0);
    assert_eq!(r.simulated_gross_profit, 0.0);
    assert_eq!(r.gross_profit_delta, 0.0);
}

#[test]
fn zero_customers_base() {
    let base = SensitivityBase {
        total_sales: 1_000_000.0, total_cost: 600_000.0, total_discount: 50_000.0,
        gross_sales: 1_050_000.0, total_customers: 0.0, total_cost_inclusion: 20_000.0,
        average_markup_rate: 0.3, budget: 1_200_000.0, elapsed_days: 15.0, sales_days: 30.0,
    };
    let r = calculate_sensitivity(&base, &SensitivityDeltas {
        discount_rate_delta: 0.0, customers_delta: 0.1,
        transaction_value_delta: 0.0, cost_rate_delta: 0.0,
    });
    // safeDivide(sales, 0, 0) → txValue=0, sim=0
    assert_eq!(r.simulated_sales, 0.0);
}

#[test]
fn large_values_finite() {
    let base = SensitivityBase {
        total_sales: 1e12, total_cost: 6e11, total_discount: 5e10,
        gross_sales: 1.05e12, total_customers: 5e6, total_cost_inclusion: 2e10,
        average_markup_rate: 0.3, budget: 1.2e12, elapsed_days: 15.0, sales_days: 30.0,
    };
    let r = calculate_sensitivity(&base, &SensitivityDeltas {
        discount_rate_delta: -0.01, customers_delta: 0.05,
        transaction_value_delta: 0.02, cost_rate_delta: -0.01,
    });
    assert!(r.simulated_gross_profit.is_finite());
    assert!(r.budget_achievement_delta.is_finite());
}

#[test]
fn elasticity_zero_base_all_finite() {
    let e = calculate_elasticity(&zero_base());
    assert!(e.discount_rate_elasticity.is_finite());
    assert!(e.customers_elasticity.is_finite());
    assert!(e.transaction_value_elasticity.is_finite());
    assert!(e.cost_rate_elasticity.is_finite());
}

#[test]
fn extreme_deltas() {
    let base = SensitivityBase {
        total_sales: 1_000_000.0, total_cost: 600_000.0, total_discount: 50_000.0,
        gross_sales: 1_050_000.0, total_customers: 5_000.0, total_cost_inclusion: 20_000.0,
        average_markup_rate: 0.3, budget: 1_200_000.0, elapsed_days: 15.0, sales_days: 30.0,
    };
    let r = calculate_sensitivity(&base, &SensitivityDeltas {
        discount_rate_delta: 0.5, customers_delta: 1.0,
        transaction_value_delta: 1.0, cost_rate_delta: 0.5,
    });
    assert!(r.simulated_sales.is_finite());
    assert!(r.simulated_gross_profit.is_finite());
}

#[test]
fn zero_budget_no_panic() {
    let base = SensitivityBase {
        total_sales: 1_000_000.0, total_cost: 600_000.0, total_discount: 50_000.0,
        gross_sales: 1_050_000.0, total_customers: 5_000.0, total_cost_inclusion: 20_000.0,
        average_markup_rate: 0.3, budget: 0.0, elapsed_days: 15.0, sales_days: 30.0,
    };
    let r = calculate_sensitivity(&base, &SensitivityDeltas {
        discount_rate_delta: 0.0, customers_delta: 0.1,
        transaction_value_delta: 0.0, cost_rate_delta: 0.0,
    });
    // budget=0 → safeDivide fallback
    assert_eq!(r.budget_achievement_delta, 0.0);
}
