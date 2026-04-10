/// Remaining budget achievement rate calculation.
///
/// Formula: (monthly_budget - total_sales) / remaining_period_budget * 100
/// Where remaining_period_budget = Σ budget_daily[elapsed_days+1 .. days_in_month]
///
/// Returns 0 if remaining period budget is 0.
/// 100 = on plan, >100 = catch-up needed.
///
/// @contractId BIZ-008
/// @semanticClass business
/// @methodFamily budget

use crate::utils::safe_divide;

/// Percentage conversion multiplier (matches TS `* 100` in remainingBudgetRate.ts)
const PERCENT_MULTIPLIER: f64 = 100.0;

/// Calculate remaining budget rate.
///
/// `budget_daily` is a flat array where index i represents day (i+1)'s budget amount.
/// Array length should be >= days_in_month.
pub fn calculate_remaining_budget_rate(
    budget: f64,
    total_sales: f64,
    budget_daily: &[f64],
    elapsed_days: usize,
    days_in_month: usize,
) -> f64 {
    let remaining_target = budget - total_sales;

    let mut remaining_period_budget = 0.0;
    for d in elapsed_days..days_in_month {
        if d < budget_daily.len() {
            remaining_period_budget += budget_daily[d];
        }
    }

    safe_divide(remaining_target, remaining_period_budget, 0.0) * PERCENT_MULTIPLIER
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn on_plan() {
        // 30 days, 10 elapsed, budget 300, sales 100
        // Remaining target = 200, remaining budget = 20 * 10 = 200
        let daily: Vec<f64> = vec![10.0; 30];
        let result = calculate_remaining_budget_rate(300.0, 100.0, &daily, 10, 30);
        assert_eq!(result, 100.0);
    }

    #[test]
    fn catch_up_needed() {
        // Behind plan: sales only 50, need 250 out of remaining 200
        let daily: Vec<f64> = vec![10.0; 30];
        let result = calculate_remaining_budget_rate(300.0, 50.0, &daily, 10, 30);
        assert_eq!(result, 125.0);
    }

    #[test]
    fn ahead_of_plan() {
        // Ahead: sales 200, only need 100 out of remaining 200
        let daily: Vec<f64> = vec![10.0; 30];
        let result = calculate_remaining_budget_rate(300.0, 200.0, &daily, 10, 30);
        assert_eq!(result, 50.0);
    }

    #[test]
    fn zero_remaining_budget() {
        // All days elapsed → remaining budget = 0 → returns 0
        let daily: Vec<f64> = vec![10.0; 30];
        let result = calculate_remaining_budget_rate(300.0, 100.0, &daily, 30, 30);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn empty_daily() {
        let daily: Vec<f64> = vec![];
        let result = calculate_remaining_budget_rate(300.0, 100.0, &daily, 0, 30);
        assert_eq!(result, 0.0);
    }
}
