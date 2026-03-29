/// Sensitivity analysis — simulate parameter changes and their impact on profit.
///
/// # Mathematical model
/// - Sales = Customers × Transaction Value
/// - Gross Profit = Gross Sales - Cost - Discount - Cost Inclusion
/// - Each delta is applied independently (customer × txValue has multiplicative interaction)
///
/// # Invariants
/// - Zero deltas → simulatedGrossProfit == baseGrossProfit
/// - grossProfitDelta == simulatedGrossProfit - baseGrossProfit
/// - salesDelta == simulatedSales - totalSales

fn safe_divide(num: f64, den: f64, fallback: f64) -> f64 {
    if den != 0.0 { num / den } else { fallback }
}

pub struct SensitivityBase {
    pub total_sales: f64,
    pub total_cost: f64,
    pub total_discount: f64,
    pub gross_sales: f64,
    pub total_customers: f64,
    pub total_cost_inclusion: f64,
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

pub fn calculate_sensitivity(base: &SensitivityBase, deltas: &SensitivityDeltas) -> SensitivityResult {
    let base_tx_value = safe_divide(base.total_sales, base.total_customers, 0.0);
    let base_cost_rate = safe_divide(base.total_cost, base.gross_sales, 0.0);
    let base_discount_rate = safe_divide(base.total_discount, base.gross_sales, 0.0);

    let sim_customers = base.total_customers * (1.0 + deltas.customers_delta);
    let sim_tx_value = base_tx_value * (1.0 + deltas.transaction_value_delta);
    let sim_sales = sim_customers * sim_tx_value;

    let sim_discount_rate = base_discount_rate + deltas.discount_rate_delta;
    let sim_gross_sales = safe_divide(sim_sales, 1.0 - sim_discount_rate, sim_sales);

    let sim_cost_rate = base_cost_rate + deltas.cost_rate_delta;
    let sim_cost = sim_gross_sales * sim_cost_rate;
    let sim_discount = sim_gross_sales * sim_discount_rate.max(0.0);

    let cost_inclusion_rate = safe_divide(base.total_cost_inclusion, base.total_sales, 0.0);
    let sim_consumable = sim_sales * cost_inclusion_rate;

    let base_gp = base.gross_sales - base.total_cost - base.total_discount - base.total_cost_inclusion;
    let sim_gp = sim_gross_sales - sim_cost - sim_discount - sim_consumable;

    let base_gp_rate = safe_divide(base_gp, base.total_sales, 0.0);
    let sim_gp_rate = safe_divide(sim_gp, sim_sales, 0.0);

    let daily_avg_base = safe_divide(base.total_sales, base.elapsed_days, 0.0);
    let daily_avg_sim = safe_divide(sim_sales, base.elapsed_days, 0.0);
    let base_projected = daily_avg_base * base.sales_days;
    let sim_projected = daily_avg_sim * base.sales_days;

    let base_achievement = safe_divide(base_projected, base.budget, 0.0);
    let sim_achievement = safe_divide(sim_projected, base.budget, 0.0);

    SensitivityResult {
        base_gross_profit: base_gp,
        base_gross_profit_rate: base_gp_rate,
        simulated_gross_profit: sim_gp,
        simulated_gross_profit_rate: sim_gp_rate,
        gross_profit_delta: sim_gp - base_gp,
        simulated_sales: sim_sales,
        sales_delta: sim_sales - base.total_sales,
        simulated_projected_sales: sim_projected,
        projected_sales_delta: sim_projected - base_projected,
        budget_achievement_delta: sim_achievement - base_achievement,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_base() -> SensitivityBase {
        SensitivityBase {
            total_sales: 10_000_000.0,
            total_cost: 7_500_000.0,
            total_discount: 200_000.0,
            gross_sales: 10_200_000.0,
            total_customers: 5000.0,
            total_cost_inclusion: 50_000.0,
            budget: 12_000_000.0,
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
    fn invariant_zero_deltas_no_change() {
        let base = make_base();
        let result = calculate_sensitivity(&base, &zero_deltas());
        assert!(
            (result.gross_profit_delta).abs() < 1e-6,
            "Zero deltas should produce zero GP delta, got {}",
            result.gross_profit_delta
        );
        assert!(
            (result.sales_delta).abs() < 1e-6,
            "Zero deltas should produce zero sales delta"
        );
    }

    #[test]
    fn invariant_delta_identity() {
        let base = make_base();
        let deltas = SensitivityDeltas {
            discount_rate_delta: -0.01,
            customers_delta: 0.05,
            transaction_value_delta: 0.0,
            cost_rate_delta: 0.0,
        };
        let result = calculate_sensitivity(&base, &deltas);
        let expected_delta = result.simulated_gross_profit - result.base_gross_profit;
        assert!(
            (result.gross_profit_delta - expected_delta).abs() < 1e-6,
            "grossProfitDelta must equal simulated - base"
        );
    }

    #[test]
    fn customer_increase_raises_sales() {
        let base = make_base();
        let deltas = SensitivityDeltas {
            customers_delta: 0.10, // +10%
            ..zero_deltas()
        };
        let result = calculate_sensitivity(&base, &deltas);
        assert!(result.sales_delta > 0.0, "10% more customers should increase sales");
    }

    #[test]
    fn cost_rate_improvement_raises_profit() {
        let base = make_base();
        let deltas = SensitivityDeltas {
            cost_rate_delta: -0.01, // 1pt improvement
            ..zero_deltas()
        };
        let result = calculate_sensitivity(&base, &deltas);
        assert!(result.gross_profit_delta > 0.0, "Lower cost rate should improve GP");
    }
}
