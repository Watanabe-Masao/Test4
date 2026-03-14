use crate::types::GrossProfitBudgetResult;
use crate::utils::safe_divide;

/// Calculate gross profit budget analysis.
///
/// Steps:
/// 1. elapsedGPBudget = grossProfitBudget × budgetElapsedRate
/// 2. variance = grossProfit - elapsedGPBudget
/// 3. gpAchievement = grossProfit / grossProfitBudget
/// 4. progressGap = gpAchievement - budgetElapsedRate
/// 5. requiredDailyGP = (grossProfitBudget - grossProfit) / remainingDays
/// 6. projectedGP = grossProfit + averageDailyGP × remainingDays
/// 7. projectedGPAchievement = projectedGP / grossProfitBudget
pub fn calculate_gross_profit_budget(
    gross_profit: f64,
    gross_profit_budget: f64,
    budget_elapsed_rate: f64,
    elapsed_days: f64,
    sales_days: f64,
    days_in_month: f64,
) -> GrossProfitBudgetResult {
    let elapsed_gp_budget = gross_profit_budget * budget_elapsed_rate;
    let gross_profit_budget_variance = gross_profit - elapsed_gp_budget;

    let gp_achievement = safe_divide(gross_profit, gross_profit_budget, 0.0);
    let gross_profit_progress_gap = gp_achievement - budget_elapsed_rate;

    let remaining_days = days_in_month - elapsed_days;
    let required_daily_gross_profit = if remaining_days > 0.0 {
        safe_divide(gross_profit_budget - gross_profit, remaining_days, 0.0)
    } else {
        0.0
    };

    let average_daily_gp = safe_divide(gross_profit, sales_days, 0.0);
    let projected_gross_profit = gross_profit + average_daily_gp * remaining_days;
    let projected_gp_achievement = safe_divide(projected_gross_profit, gross_profit_budget, 0.0);

    GrossProfitBudgetResult {
        gross_profit_budget_variance,
        gross_profit_progress_gap,
        required_daily_gross_profit,
        projected_gross_profit,
        projected_gp_achievement,
    }
}
