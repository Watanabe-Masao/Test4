// lib.rs — wasm_bindgen FFI adapter only.
// Pure authoritative logic lives in budget_analysis.rs / gross_profit_budget.rs.
// This file handles only: FFI boundary, Float64Array conversion.

pub mod budget_analysis;
pub mod gross_profit_budget;
pub mod types;
pub mod utils;

#[cfg(test)]
mod budget_analysis_tests;

use wasm_bindgen::prelude::*;

/// Calculate budget analysis for a single store.
///
/// budget_daily_arr and sales_daily_arr are flat Float64Array of length days_in_month,
/// where index i corresponds to day (i+1). The JS adapter fills missing days with 0.
///
/// Returns Float64Array of 10 scalar fields:
/// [0] budgetAchievementRate
/// [1] budgetProgressRate
/// [2] budgetElapsedRate
/// [3] budgetProgressGap
/// [4] budgetVariance
/// [5] averageDailySales
/// [6] projectedSales
/// [7] projectedAchievement
/// [8] requiredDailySales
/// [9] remainingBudget
#[wasm_bindgen]
pub fn calculate_budget_analysis(
    total_sales: f64,
    budget: f64,
    budget_daily_arr: &[f64],
    elapsed_days: u32,
    sales_days: f64,
    days_in_month: u32,
) -> js_sys::Float64Array {
    let r = budget_analysis::calculate_budget_analysis(
        total_sales,
        budget,
        budget_daily_arr,
        elapsed_days as usize,
        sales_days,
        days_in_month as usize,
    );

    let arr = js_sys::Float64Array::new_with_length(10);
    arr.set_index(0, r.budget_achievement_rate);
    arr.set_index(1, r.budget_progress_rate);
    arr.set_index(2, r.budget_elapsed_rate);
    arr.set_index(3, r.budget_progress_gap);
    arr.set_index(4, r.budget_variance);
    arr.set_index(5, r.average_daily_sales);
    arr.set_index(6, r.projected_sales);
    arr.set_index(7, r.projected_achievement);
    arr.set_index(8, r.required_daily_sales);
    arr.set_index(9, r.remaining_budget);
    arr
}

/// Calculate gross profit budget analysis.
///
/// Returns Float64Array of 5 scalar fields:
/// [0] grossProfitBudgetVariance
/// [1] grossProfitProgressGap
/// [2] requiredDailyGrossProfit
/// [3] projectedGrossProfit
/// [4] projectedGPAchievement
#[wasm_bindgen]
pub fn calculate_gross_profit_budget(
    gross_profit: f64,
    gross_profit_budget: f64,
    budget_elapsed_rate: f64,
    elapsed_days: f64,
    sales_days: f64,
    days_in_month: f64,
) -> js_sys::Float64Array {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        gross_profit,
        gross_profit_budget,
        budget_elapsed_rate,
        elapsed_days,
        sales_days,
        days_in_month,
    );

    let arr = js_sys::Float64Array::new_with_length(5);
    arr.set_index(0, r.gross_profit_budget_variance);
    arr.set_index(1, r.gross_profit_progress_gap);
    arr.set_index(2, r.required_daily_gross_profit);
    arr.set_index(3, r.projected_gross_profit);
    arr.set_index(4, r.projected_gp_achievement);
    arr
}
