use crate::types::BudgetAnalysisResult;
use crate::utils::safe_divide;

/// Calculate budget analysis for a single store.
///
/// `budget_daily` and `sales_daily` are flat arrays of length `days_in_month`,
/// where index i corresponds to day (i+1). Missing days should be 0.
///
/// Steps:
/// 1. budgetAchievementRate = totalSales / budget
/// 2. cumulativeBudget = Σ budgetDaily[0..elapsedDays-1]
/// 3. budgetProgressRate = totalSales / cumulativeBudget
/// 4. budgetElapsedRate = cumulativeBudget / budget
/// 5. averageDailySales = totalSales / salesDays
/// 6. projectedSales = totalSales + averageDailySales × remainingDays
/// 7. projectedAchievement = projectedSales / budget
/// 8. budgetProgressGap = progressRate - elapsedRate
/// 9. budgetVariance = totalSales - cumulativeBudget
/// 10. requiredDailySales = (budget - totalSales) / remainingDays
/// 11. remainingBudget = budget - totalSales
pub fn calculate_budget_analysis(
    total_sales: f64,
    budget: f64,
    budget_daily: &[f64],
    elapsed_days: usize,
    sales_days: f64,
    days_in_month: usize,
) -> BudgetAnalysisResult {
    // 予算達成率
    let budget_achievement_rate = safe_divide(total_sales, budget, 0.0);

    // 累計予算 = Σ budgetDaily[0..elapsedDays-1]
    let cumulative_budget: f64 = budget_daily.iter().take(elapsed_days).sum();

    // 予算消化率
    let budget_progress_rate = safe_divide(total_sales, cumulative_budget, 0.0);

    // 予算経過率
    let budget_elapsed_rate = safe_divide(cumulative_budget, budget, 0.0);

    // 日平均売上
    let average_daily_sales = safe_divide(total_sales, sales_days, 0.0);

    // 月末予測売上
    let remaining_days = if days_in_month > elapsed_days {
        (days_in_month - elapsed_days) as f64
    } else {
        0.0
    };
    let projected_sales = total_sales + average_daily_sales * remaining_days;

    // 予算達成率予測
    let projected_achievement = safe_divide(projected_sales, budget, 0.0);

    // 進捗ギャップ
    let budget_progress_gap = budget_progress_rate - budget_elapsed_rate;

    // 予算差異
    let budget_variance = total_sales - cumulative_budget;

    // 必要日次売上
    let required_daily_sales = if remaining_days > 0.0 {
        safe_divide(budget - total_sales, remaining_days, 0.0)
    } else {
        0.0
    };

    // 残余予算
    let remaining_budget = budget - total_sales;

    BudgetAnalysisResult {
        budget_achievement_rate,
        budget_progress_rate,
        budget_elapsed_rate,
        budget_progress_gap,
        budget_variance,
        average_daily_sales,
        projected_sales,
        projected_achievement,
        required_daily_sales,
        remaining_budget,
    }
}
