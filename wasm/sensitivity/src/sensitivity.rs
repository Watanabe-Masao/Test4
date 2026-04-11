/// Sensitivity analysis / elasticity calculation.
///
/// Simulates the effect of parameter changes on gross profit and sales.
/// Pure function: no side effects, no external state.
///
/// @contractId ANA-003
/// @semanticClass analytic
/// @methodFamily what_if
///
/// Invariant: sensitivity ∈ [0, ∞) for non-negative inputs
/// Invariant: zero deltas → zero changes (identity)

use crate::utils::safe_divide;

/// Elasticity unit: 1 percentage point = 0.01
const ONE_PT: f64 = 0.01;

/// Number of output fields for SensitivityResult.
pub const SENSITIVITY_RESULT_FIELDS: usize = 10;

/// Number of output fields for ElasticityResult.
pub const ELASTICITY_RESULT_FIELDS: usize = 4;

pub struct SensitivityBase {
    pub total_sales: f64,
    pub total_cost: f64,
    pub total_discount: f64,
    pub gross_sales: f64,
    pub total_customers: f64,
    pub total_cost_inclusion: f64,
    pub average_markup_rate: f64,
    pub budget: f64,
    pub elapsed_days: f64,
    pub sales_days: f64,
}

pub struct SensitivityDeltas {
    pub discount_rate_delta: f64,
    pub customers_delta: f64,
    pub transaction_value_delta: f64,
    pub cost_rate_delta: f64,
}

pub struct SensitivityResult {
    pub base_gross_profit: f64,
    pub base_gross_profit_rate: f64,
    pub simulated_gross_profit: f64,
    pub simulated_gross_profit_rate: f64,
    pub gross_profit_delta: f64,
    pub simulated_sales: f64,
    pub sales_delta: f64,
    pub simulated_projected_sales: f64,
    pub projected_sales_delta: f64,
    pub budget_achievement_delta: f64,
}

pub struct ElasticityResult {
    pub discount_rate_elasticity: f64,
    pub customers_elasticity: f64,
    pub transaction_value_elasticity: f64,
    pub cost_rate_elasticity: f64,
}

/// Calculate sensitivity analysis.
///
/// Matching TS: domain/calculations/algorithms/sensitivity.ts lines 75-135
pub fn calculate_sensitivity(base: &SensitivityBase, deltas: &SensitivityDeltas) -> SensitivityResult {
    let base_tx_value = safe_divide(base.total_sales, base.total_customers, 0.0);
    let base_cost_rate = safe_divide(base.total_cost, base.gross_sales, 0.0);
    let base_discount_rate = safe_divide(base.total_discount, base.gross_sales, 0.0);

    // Simulated values
    let sim_customers = base.total_customers * (1.0 + deltas.customers_delta);
    let sim_tx_value = base_tx_value * (1.0 + deltas.transaction_value_delta);
    let sim_sales = sim_customers * sim_tx_value;

    // Gross sales with discount rate change
    let sim_discount_rate = base_discount_rate + deltas.discount_rate_delta;
    let sim_gross_sales = safe_divide(sim_sales, 1.0 - sim_discount_rate, sim_sales);

    // Cost
    let sim_cost_rate = base_cost_rate + deltas.cost_rate_delta;
    let sim_cost = sim_gross_sales * sim_cost_rate;

    // Discount amount
    let sim_discount = sim_gross_sales * f64::max(0.0, sim_discount_rate);

    // Cost inclusion (proportional to sales)
    let cost_inclusion_rate = safe_divide(base.total_cost_inclusion, base.total_sales, 0.0);
    let sim_consumable = sim_sales * cost_inclusion_rate;

    // Gross profit
    let base_gross_profit =
        base.gross_sales - base.total_cost - base.total_discount - base.total_cost_inclusion;
    let sim_gross_profit = sim_gross_sales - sim_cost - sim_discount - sim_consumable;

    let base_gp_rate = safe_divide(base_gross_profit, base.total_sales, 0.0);
    let sim_gp_rate = safe_divide(sim_gross_profit, sim_sales, 0.0);

    // Projected sales
    let daily_avg_base = safe_divide(base.total_sales, base.elapsed_days, 0.0);
    let daily_avg_sim = safe_divide(sim_sales, base.elapsed_days, 0.0);
    let base_projected = daily_avg_base * base.sales_days;
    let sim_projected = daily_avg_sim * base.sales_days;

    // Budget achievement change
    let base_achievement = safe_divide(base_projected, base.budget, 0.0);
    let sim_achievement = safe_divide(sim_projected, base.budget, 0.0);

    SensitivityResult {
        base_gross_profit,
        base_gross_profit_rate: base_gp_rate,
        simulated_gross_profit: sim_gross_profit,
        simulated_gross_profit_rate: sim_gp_rate,
        gross_profit_delta: sim_gross_profit - base_gross_profit,
        simulated_sales: sim_sales,
        sales_delta: sim_sales - base.total_sales,
        simulated_projected_sales: sim_projected,
        projected_sales_delta: sim_projected - base_projected,
        budget_achievement_delta: sim_achievement - base_achievement,
    }
}

/// Calculate elasticity (1pt change per parameter).
///
/// Matching TS: domain/calculations/algorithms/sensitivity.ts lines 143-179
pub fn calculate_elasticity(base: &SensitivityBase) -> ElasticityResult {
    let discount_result = calculate_sensitivity(base, &SensitivityDeltas {
        discount_rate_delta: -ONE_PT,
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    });

    let customers_result = calculate_sensitivity(base, &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: ONE_PT,
        transaction_value_delta: 0.0,
        cost_rate_delta: 0.0,
    });

    let tx_value_result = calculate_sensitivity(base, &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.0,
        transaction_value_delta: ONE_PT,
        cost_rate_delta: 0.0,
    });

    let cost_result = calculate_sensitivity(base, &SensitivityDeltas {
        discount_rate_delta: 0.0,
        customers_delta: 0.0,
        transaction_value_delta: 0.0,
        cost_rate_delta: -ONE_PT,
    });

    ElasticityResult {
        discount_rate_elasticity: discount_result.gross_profit_delta,
        customers_elasticity: customers_result.gross_profit_delta,
        transaction_value_elasticity: tx_value_result.gross_profit_delta,
        cost_rate_elasticity: cost_result.gross_profit_delta,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn zero_deltas_no_change() {
        let base = make_base();
        let r = calculate_sensitivity(&base, &SensitivityDeltas {
            discount_rate_delta: 0.0,
            customers_delta: 0.0,
            transaction_value_delta: 0.0,
            cost_rate_delta: 0.0,
        });
        assert!((r.gross_profit_delta).abs() < 1e-6);
        assert!((r.sales_delta).abs() < 1e-6);
    }

    #[test]
    fn elasticity_all_finite() {
        let base = make_base();
        let e = calculate_elasticity(&base);
        assert!(e.discount_rate_elasticity.is_finite());
        assert!(e.customers_elasticity.is_finite());
        assert!(e.transaction_value_elasticity.is_finite());
        assert!(e.cost_rate_elasticity.is_finite());
    }

    #[test]
    fn positive_customer_delta_increases_sales() {
        let base = make_base();
        let r = calculate_sensitivity(&base, &SensitivityDeltas {
            discount_rate_delta: 0.0,
            customers_delta: 0.1,
            transaction_value_delta: 0.0,
            cost_rate_delta: 0.0,
        });
        assert!(r.sales_delta > 0.0);
    }
}
