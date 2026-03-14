/// Budget analysis result: 10 scalar fields.
/// dailyCumulative is NOT included (computed by TS side only for compare exclusion).
pub struct BudgetAnalysisResult {
    pub budget_achievement_rate: f64,
    pub budget_progress_rate: f64,
    pub budget_elapsed_rate: f64,
    pub budget_progress_gap: f64,
    pub budget_variance: f64,
    pub average_daily_sales: f64,
    pub projected_sales: f64,
    pub projected_achievement: f64,
    pub required_daily_sales: f64,
    pub remaining_budget: f64,
}

/// Gross profit budget result: 5 scalar fields.
pub struct GrossProfitBudgetResult {
    pub gross_profit_budget_variance: f64,
    pub gross_profit_progress_gap: f64,
    pub required_daily_gross_profit: f64,
    pub projected_gross_profit: f64,
    pub projected_gp_achievement: f64,
}
