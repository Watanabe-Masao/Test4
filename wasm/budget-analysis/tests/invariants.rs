/// Invariant tests for budgetAnalysis Rust implementation.
/// Corresponds to B-INV-1 through B-INV-8 and GP-INV-1 through GP-INV-4.

use budget_analysis_wasm::budget_analysis;
use budget_analysis_wasm::gross_profit_budget;
use budget_analysis_wasm::utils::safe_divide;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a, b, (a - b).abs(), tol
    );
}

/// Uniform daily budget helper
fn uniform_daily(budget: f64, days: usize) -> Vec<f64> {
    let daily = budget / days as f64;
    vec![daily; days]
}

// ════════════════════════════════════════════════════
// B-INV-1: remainingBudget == budget - totalSales
// ════════════════════════════════════════════════════

#[test]
fn remaining_budget_identity() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(r.remaining_budget, 6_000_000.0 - 3_500_000.0, 1e-10);
}

#[test]
fn remaining_budget_overflow() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        7_000_000.0, 6_000_000.0, &budget_daily, 28, 28.0, 28,
    );
    assert_close(r.remaining_budget, 6_000_000.0 - 7_000_000.0, 1e-10);
    assert!(r.remaining_budget < 0.0);
}

// ════════════════════════════════════════════════════
// B-INV-2: budgetProgressGap == progressRate - elapsedRate
// ════════════════════════════════════════════════════

#[test]
fn progress_gap_identity() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(
        r.budget_progress_gap,
        r.budget_progress_rate - r.budget_elapsed_rate,
        1e-10,
    );
}

#[test]
fn progress_gap_zero_budget() {
    let budget_daily = vec![0.0; 28];
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 0.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(
        r.budget_progress_gap,
        r.budget_progress_rate - r.budget_elapsed_rate,
        1e-10,
    );
}

// ════════════════════════════════════════════════════
// B-INV-3: budgetVariance == totalSales - cumulativeBudget
// ════════════════════════════════════════════════════

#[test]
fn budget_variance_identity() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let cumulative: f64 = budget_daily.iter().take(14).sum();
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(r.budget_variance, 3_500_000.0 - cumulative, 1e-10);
}

// ════════════════════════════════════════════════════
// B-INV-5: zero divisor → safeDivide returns 0
// ════════════════════════════════════════════════════

#[test]
fn zero_budget_achievement_rate() {
    let budget_daily = vec![0.0; 28];
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 0.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
}

#[test]
fn zero_sales_days_average() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 0.0, 28,
    );
    assert_close(r.average_daily_sales, 0.0, 1e-10);
}

#[test]
fn elapsed_equals_month_required_zero() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 28, 28.0, 28,
    );
    assert_close(r.required_daily_sales, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// B-INV-6: missing budget keys treated as 0
// ════════════════════════════════════════════════════

#[test]
fn sparse_budget_daily() {
    // Only days 1,3,5 have values (indices 0,2,4)
    let mut budget_daily = vec![0.0; 28];
    budget_daily[0] = 100_000.0;
    budget_daily[2] = 200_000.0;
    budget_daily[4] = 300_000.0;
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 5, 5.0, 28,
    );
    // cumulative = 100000 + 0 + 200000 + 0 + 300000 = 600000
    assert_close(r.budget_variance, 500_000.0 - 600_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// B-INV-7: extreme values produce finite results
// ════════════════════════════════════════════════════

#[test]
fn extreme_large_values() {
    let budget_daily = uniform_daily(1e10, 30);
    let r = budget_analysis::calculate_budget_analysis(
        5e9, 1e10, &budget_daily, 15, 15.0, 30,
    );
    assert!(r.budget_achievement_rate.is_finite());
    assert!(r.budget_progress_rate.is_finite());
    assert!(r.budget_elapsed_rate.is_finite());
    assert!(r.projected_sales.is_finite());
    assert!(r.required_daily_sales.is_finite());
}

#[test]
fn extreme_tiny_values() {
    let budget_daily = uniform_daily(1.0, 30);
    let r = budget_analysis::calculate_budget_analysis(
        0.5, 1.0, &budget_daily, 15, 15.0, 30,
    );
    assert!(r.budget_achievement_rate.is_finite());
    assert!(r.projected_sales.is_finite());
}

// ════════════════════════════════════════════════════
// B-INV-8: achievement rate consistency
// ════════════════════════════════════════════════════

#[test]
fn achievement_rate_consistency() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(
        r.budget_achievement_rate,
        safe_divide(3_500_000.0, 6_000_000.0, 0.0),
        1e-10,
    );
    assert_close(
        r.projected_achievement,
        safe_divide(r.projected_sales, 6_000_000.0, 0.0),
        1e-10,
    );
}

// ════════════════════════════════════════════════════
// GP-INV-1: grossProfitBudget = 0 → projectedGPAchievement = 0
// ════════════════════════════════════════════════════

#[test]
fn gp_zero_budget_achievement() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 0.0, 0.167, 5.0, 5.0, 30.0,
    );
    assert_close(r.projected_gp_achievement, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-2: remainingDays == 0 → requiredDailyGrossProfit = 0
// ════════════════════════════════════════════════════

#[test]
fn gp_no_remaining_days() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 3_000_000.0, 1.0, 30.0, 30.0, 30.0,
    );
    assert_close(r.required_daily_gross_profit, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-3: all outputs finite
// ════════════════════════════════════════════════════

#[test]
fn gp_all_finite() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 3_000_000.0, 0.167, 5.0, 5.0, 30.0,
    );
    assert!(r.gross_profit_budget_variance.is_finite());
    assert!(r.gross_profit_progress_gap.is_finite());
    assert!(r.required_daily_gross_profit.is_finite());
    assert!(r.projected_gross_profit.is_finite());
    assert!(r.projected_gp_achievement.is_finite());
}

// ════════════════════════════════════════════════════
// GP-INV-4: extreme values finite
// ════════════════════════════════════════════════════

#[test]
fn gp_extreme_values() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        1e10, 1e10, 0.5, 15.0, 15.0, 30.0,
    );
    assert!(r.gross_profit_budget_variance.is_finite());
    assert!(r.projected_gross_profit.is_finite());
    assert!(r.projected_gp_achievement.is_finite());
}

// ════════════════════════════════════════════════════
// GP variance identity: variance = grossProfit - elapsedGPBudget
// ════════════════════════════════════════════════════

#[test]
fn gp_variance_identity() {
    let gp = 900_000.0;
    let gp_budget = 3_000_000.0;
    let elapsed_rate = 0.167;
    let r = gross_profit_budget::calculate_gross_profit_budget(
        gp, gp_budget, elapsed_rate, 5.0, 5.0, 30.0,
    );
    let elapsed_gp_budget = gp_budget * elapsed_rate;
    assert_close(r.gross_profit_budget_variance, gp - elapsed_gp_budget, 1e-10);
}

// ════════════════════════════════════════════════════
// GP progress gap identity
// ════════════════════════════════════════════════════

#[test]
fn gp_progress_gap_identity() {
    let gp = 900_000.0;
    let gp_budget = 3_000_000.0;
    let elapsed_rate = 0.167;
    let r = gross_profit_budget::calculate_gross_profit_budget(
        gp, gp_budget, elapsed_rate, 5.0, 5.0, 30.0,
    );
    let gp_achievement = safe_divide(gp, gp_budget, 0.0);
    assert_close(r.gross_profit_progress_gap, gp_achievement - elapsed_rate, 1e-10);
}

// ════════════════════════════════════════════════════
// GP projected achievement identity
// ════════════════════════════════════════════════════

#[test]
fn gp_projected_achievement_identity() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 3_000_000.0, 0.167, 5.0, 5.0, 30.0,
    );
    assert_close(
        r.projected_gp_achievement,
        safe_divide(r.projected_gross_profit, 3_000_000.0, 0.0),
        1e-10,
    );
}
