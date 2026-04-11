//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/algorithms/sensitivity.ts (lines 75-179)
//!
//! @contractId ANA-003
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

fn zero_deltas() -> SensitivityDeltas {
    SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    }
}

#[test]
fn golden_zero_deltas() {
    let r = calculate_sensitivity(&make_base(), &zero_deltas());
    // TS: baseGrossProfit = grossSales - totalCost - totalDiscount - totalCostInclusion
    // = 1050000 - 600000 - 50000 - 20000 = 380000
    assert_close(r.base_gross_profit, 380_000.0, 1e-6);
    assert_close(r.gross_profit_delta, 0.0, 1e-6);
    assert_close(r.sales_delta, 0.0, 1e-6);
}

#[test]
fn golden_customer_increase_10pct() {
    let r = calculate_sensitivity(&make_base(), &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.1,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    });
    // simCustomers = 5000 * 1.1 = 5500
    // simTxValue = 1000000/5000 * 1.0 = 200
    // simSales = 5500 * 200 = 1100000
    assert_close(r.simulated_sales, 1_100_000.0, 1e-6);
    assert!(r.sales_delta > 0.0);
    assert!(r.gross_profit_delta > 0.0);
}

#[test]
fn golden_elasticity() {
    let e = calculate_elasticity(&make_base());
    // All elasticities should be nonzero for a realistic base
    assert!(e.discount_rate_elasticity.abs() > 0.0);
    assert!(e.customers_elasticity.abs() > 0.0);
    assert!(e.transaction_value_elasticity.abs() > 0.0);
    assert!(e.cost_rate_elasticity.abs() > 0.0);
}

#[test]
fn golden_discount_improvement() {
    let r = calculate_sensitivity(&make_base(), &SensitivityDeltas {
        discount_rate_delta: -0.01, // 1pt improvement
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    });
    // Discount improvement → GP should increase
    assert!(r.gross_profit_delta > 0.0);
    // Sales unchanged (discount doesn't affect top-line)
    assert_close(r.sales_delta, 0.0, 1e-6);
}

#[test]
fn golden_cost_reduction() {
    let r = calculate_sensitivity(&make_base(), &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: -0.01, // 1pt cost reduction
    });
    assert!(r.gross_profit_delta > 0.0);
}
