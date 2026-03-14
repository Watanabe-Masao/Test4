/// Cross-validation tests: golden fixtures matching TS reference implementation.

use budget_analysis_wasm::budget_analysis;
use budget_analysis_wasm::gross_profit_budget;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a, b, (a - b).abs(), tol
    );
}

fn uniform_daily(budget: f64, days: usize) -> Vec<f64> {
    let daily = budget / days as f64;
    vec![daily; days]
}

// ════════════════════════════════════════════════════
// calculateBudgetAnalysis golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_basic_budget_analysis() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );

    // budgetAchievementRate = 3500000 / 6000000
    assert_close(r.budget_achievement_rate, 3_500_000.0 / 6_000_000.0, 1e-10);
    // cumulativeBudget = 14 * (6000000/28) = 3000000
    // budgetElapsedRate = 3000000 / 6000000 = 0.5
    assert_close(r.budget_elapsed_rate, 0.5, 1e-10);
    // averageDailySales = 3500000 / 14 = 250000
    assert_close(r.average_daily_sales, 250_000.0, 1e-10);
    // projectedSales = 3500000 + 250000 × 14 = 7000000
    assert_close(r.projected_sales, 7_000_000.0, 1e-10);
    // projectedAchievement = 7000000 / 6000000
    assert_close(r.projected_achievement, 7_000_000.0 / 6_000_000.0, 1e-10);
    // remainingBudget = 6000000 - 3500000 = 2500000
    assert_close(r.remaining_budget, 2_500_000.0, 1e-10);
}

#[test]
fn golden_zero_budget() {
    let budget_daily = vec![0.0; 28];
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 0.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
    assert_close(r.budget_elapsed_rate, 0.0, 1e-10);
    assert_close(r.projected_achievement, 0.0, 1e-10);
}

#[test]
fn golden_zero_sales() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        0.0, 6_000_000.0, &budget_daily, 14, 0.0, 28,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
    assert_close(r.average_daily_sales, 0.0, 1e-10);
    assert_close(r.projected_sales, 0.0, 1e-10);
    assert_close(r.remaining_budget, 6_000_000.0, 1e-10);
}

#[test]
fn golden_budget_progress_rate() {
    // budgetDaily: {1: 200000, 2: 200000, 3: 200000}
    let budget_daily = vec![200_000.0; 3];
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 2, 2.0, 3,
    );
    // cumulativeBudget = 200000 + 200000 = 400000
    // progressRate = 500000 / 400000 = 1.25
    assert_close(r.budget_progress_rate, 1.25, 1e-10);
    // elapsedRate = 400000 / 600000
    assert_close(r.budget_elapsed_rate, 400_000.0 / 600_000.0, 1e-10);
}

#[test]
fn golden_progress_gap_positive() {
    let budget_daily = vec![200_000.0; 3];
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 2, 2.0, 3,
    );
    // gap = 1.25 - 0.6667 ≈ 0.5833 > 0 (前倒し)
    assert!(r.budget_progress_gap > 0.0);
}

#[test]
fn golden_progress_gap_negative() {
    let budget_daily = vec![200_000.0; 3];
    let r = budget_analysis::calculate_budget_analysis(
        100_000.0, 600_000.0, &budget_daily, 2, 2.0, 3,
    );
    // progressRate = 100000 / 400000 = 0.25
    // elapsedRate = 400000 / 600000 ≈ 0.6667
    // gap = 0.25 - 0.6667 < 0 (遅れ)
    assert!(r.budget_progress_gap < 0.0);
}

#[test]
fn golden_budget_variance() {
    let budget_daily = vec![200_000.0; 3];
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 2, 2.0, 3,
    );
    // variance = 500000 - 400000 = 100000
    assert_close(r.budget_variance, 100_000.0, 1e-10);
}

#[test]
fn golden_required_daily_sales() {
    let budget_daily = uniform_daily(6_000_000.0, 28);
    let r = budget_analysis::calculate_budget_analysis(
        3_500_000.0, 6_000_000.0, &budget_daily, 14, 14.0, 28,
    );
    // remainingBudget = 2500000, remainingDays = 14
    // requiredDailySales = 2500000 / 14 ≈ 178571.43
    assert_close(r.required_daily_sales, 2_500_000.0 / 14.0, 1e-10);
}

#[test]
fn golden_sparse_budget() {
    // Non-uniform budget: only some days have values
    let mut budget_daily = vec![0.0; 28];
    budget_daily[0] = 100_000.0; // day 1
    budget_daily[1] = 200_000.0; // day 2
    budget_daily[2] = 300_000.0; // day 3
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 3, 3.0, 28,
    );
    // cumulative = 100000 + 200000 + 300000 = 600000
    assert_close(r.budget_variance, 500_000.0 - 600_000.0, 1e-10);
}

#[test]
fn golden_month_key_order() {
    // Budget values at indices 0-4 (days 1-5), rest zero
    let mut budget_daily = vec![0.0; 30];
    budget_daily[0] = 300_000.0;
    budget_daily[1] = 350_000.0;
    budget_daily[2] = 320_000.0;
    budget_daily[3] = 280_000.0;
    budget_daily[4] = 310_000.0;
    let r = budget_analysis::calculate_budget_analysis(
        3_000_000.0, 10_000_000.0, &budget_daily, 5, 5.0, 30,
    );
    // cumulative = 300000 + 350000 + 320000 + 280000 + 310000 = 1560000
    assert_close(r.budget_variance, 3_000_000.0 - 1_560_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// calculateGrossProfitBudget golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_gp_budget_normal() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 3_000_000.0, 0.167, 5.0, 5.0, 30.0,
    );
    // elapsedGPBudget = 3000000 × 0.167 = 501000
    // variance = 900000 - 501000 = 399000
    assert_close(r.gross_profit_budget_variance, 900_000.0 - 3_000_000.0 * 0.167, 1e-10);

    // gpAchievement = 900000 / 3000000 = 0.3
    // progressGap = 0.3 - 0.167 = 0.133
    assert_close(r.gross_profit_progress_gap, 0.3 - 0.167, 1e-10);

    // requiredDailyGP = (3000000 - 900000) / 25 = 84000
    assert_close(r.required_daily_gross_profit, 2_100_000.0 / 25.0, 1e-10);

    // averageDailyGP = 900000 / 5 = 180000
    // projectedGP = 900000 + 180000 × 25 = 5400000
    assert_close(r.projected_gross_profit, 900_000.0 + 180_000.0 * 25.0, 1e-10);

    // projectedGPAchievement = 5400000 / 3000000 = 1.8
    assert_close(r.projected_gp_achievement, 5_400_000.0 / 3_000_000.0, 1e-10);
}

#[test]
fn golden_gp_budget_zero() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        900_000.0, 0.0, 0.167, 5.0, 5.0, 30.0,
    );
    assert_close(r.projected_gp_achievement, 0.0, 1e-10);
}

#[test]
fn golden_gp_budget_zero_sales_days() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        0.0, 3_000_000.0, 0.167, 5.0, 0.0, 30.0,
    );
    // averageDailyGP = 0 / 0 = safeDivide → 0
    // projectedGP = 0 + 0 × 25 = 0
    assert_close(r.projected_gross_profit, 0.0, 1e-10);
    assert_close(r.projected_gp_achievement, 0.0, 1e-10);
}

#[test]
fn golden_gp_budget_negative_gp() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        -500_000.0, 3_000_000.0, 0.167, 5.0, 5.0, 30.0,
    );
    // grossProfit is negative — all results should still be finite
    assert!(r.gross_profit_budget_variance.is_finite());
    assert!(r.projected_gross_profit.is_finite());
    assert!(r.projected_gp_achievement < 0.0);
}
