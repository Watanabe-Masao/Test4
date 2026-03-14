/// Edge case tests: boundary conditions, zero inputs, empty data.

use budget_analysis_wasm::budget_analysis;
use budget_analysis_wasm::gross_profit_budget;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a, b, (a - b).abs(), tol
    );
}

// ════════════════════════════════════════════════════
// Empty / zero budget_daily
// ════════════════════════════════════════════════════

#[test]
fn empty_budget_daily() {
    // 0-length array
    let r = budget_analysis::calculate_budget_analysis(
        100_000.0, 500_000.0, &[], 0, 0.0, 0,
    );
    assert_close(r.budget_achievement_rate, 100_000.0 / 500_000.0, 1e-10);
    assert_close(r.remaining_budget, 400_000.0, 1e-10);
}

#[test]
fn all_zero_budget_daily() {
    let budget_daily = vec![0.0; 30];
    let r = budget_analysis::calculate_budget_analysis(
        0.0, 0.0, &budget_daily, 15, 0.0, 30,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
    assert_close(r.budget_progress_rate, 0.0, 1e-10);
    assert_close(r.budget_elapsed_rate, 0.0, 1e-10);
    assert_close(r.average_daily_sales, 0.0, 1e-10);
    assert_close(r.projected_sales, 0.0, 1e-10);
    assert_close(r.remaining_budget, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Partial month (some days missing)
// ════════════════════════════════════════════════════

#[test]
fn partial_month_budget() {
    // Only 3 days out of 30 have budget
    let mut budget_daily = vec![0.0; 30];
    budget_daily[0] = 1_000_000.0;
    budget_daily[14] = 2_000_000.0;
    budget_daily[29] = 3_000_000.0;
    let r = budget_analysis::calculate_budget_analysis(
        2_000_000.0, 6_000_000.0, &budget_daily, 15, 10.0, 30,
    );
    // cumulative for 15 days = 1000000 (day 1) + 2000000 (day 15) = 3000000
    assert_close(r.budget_variance, 2_000_000.0 - 3_000_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Zero budget
// ════════════════════════════════════════════════════

#[test]
fn zero_budget_nonzero_sales() {
    let budget_daily = vec![0.0; 28];
    let r = budget_analysis::calculate_budget_analysis(
        5_000_000.0, 0.0, &budget_daily, 14, 14.0, 28,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
    assert_close(r.budget_elapsed_rate, 0.0, 1e-10);
    assert_close(r.remaining_budget, -5_000_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Zero sales
// ════════════════════════════════════════════════════

#[test]
fn zero_sales_full_budget() {
    let budget_daily = vec![200_000.0; 30];
    let r = budget_analysis::calculate_budget_analysis(
        0.0, 6_000_000.0, &budget_daily, 15, 0.0, 30,
    );
    assert_close(r.budget_achievement_rate, 0.0, 1e-10);
    assert_close(r.average_daily_sales, 0.0, 1e-10);
    assert_close(r.projected_sales, 0.0, 1e-10);
    assert_close(r.projected_achievement, 0.0, 1e-10);
    assert_close(r.remaining_budget, 6_000_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Elapsed = daysInMonth (month complete)
// ════════════════════════════════════════════════════

#[test]
fn full_month_elapsed() {
    let budget_daily = vec![200_000.0; 30];
    let r = budget_analysis::calculate_budget_analysis(
        5_000_000.0, 6_000_000.0, &budget_daily, 30, 25.0, 30,
    );
    assert_close(r.required_daily_sales, 0.0, 1e-10);
    // projected = actual + avg * 0 remaining = actual
    assert_close(r.projected_sales, 5_000_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Large values (1e10+)
// ════════════════════════════════════════════════════

#[test]
fn budget_analysis_large_values() {
    let budget_daily = vec![1e9; 30];
    let r = budget_analysis::calculate_budget_analysis(
        1.5e10, 3e10, &budget_daily, 15, 15.0, 30,
    );
    assert!(r.budget_achievement_rate.is_finite());
    assert!(r.budget_progress_rate.is_finite());
    assert!(r.projected_sales.is_finite());
    assert!(r.required_daily_sales.is_finite());
}

#[test]
fn gp_budget_large_values() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        5e9, 1e10, 0.5, 15.0, 15.0, 30.0,
    );
    assert!(r.gross_profit_budget_variance.is_finite());
    assert!(r.projected_gross_profit.is_finite());
    assert!(r.projected_gp_achievement.is_finite());
}

// ════════════════════════════════════════════════════
// Negative gross profit
// ════════════════════════════════════════════════════

#[test]
fn negative_gross_profit() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        -1_000_000.0, 3_000_000.0, 0.5, 15.0, 15.0, 30.0,
    );
    assert!(r.gross_profit_budget_variance < 0.0);
    assert!(r.projected_gross_profit < 0.0);
    assert!(r.projected_gp_achievement < 0.0);
}

// ════════════════════════════════════════════════════
// Precision edge
// ════════════════════════════════════════════════════

#[test]
fn precision_small_differences() {
    let budget_daily = vec![100_000.01; 30];
    let r = budget_analysis::calculate_budget_analysis(
        1_500_000.15, 3_000_000.3, &budget_daily, 15, 15.0, 30,
    );
    assert!(r.budget_achievement_rate.is_finite());
    assert!(r.budget_variance.is_finite());
}

// ════════════════════════════════════════════════════
// GP: all zero inputs
// ════════════════════════════════════════════════════

#[test]
fn gp_all_zero() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    );
    assert_close(r.gross_profit_budget_variance, 0.0, 1e-10);
    assert_close(r.gross_profit_progress_gap, 0.0, 1e-10);
    assert_close(r.required_daily_gross_profit, 0.0, 1e-10);
    assert_close(r.projected_gross_profit, 0.0, 1e-10);
    assert_close(r.projected_gp_achievement, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Budget analysis: elapsed_days > array length
// ════════════════════════════════════════════════════

#[test]
fn elapsed_days_exceeds_array() {
    // budget_daily has only 5 elements but elapsed_days is 10
    // .iter().take(10) will stop at 5
    let budget_daily = vec![100_000.0; 5];
    let r = budget_analysis::calculate_budget_analysis(
        500_000.0, 600_000.0, &budget_daily, 10, 5.0, 30,
    );
    // cumulative = 5 * 100000 = 500000 (only 5 elements available)
    assert_close(r.budget_variance, 500_000.0 - 500_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP: elapsed_days == 0
// ════════════════════════════════════════════════════

#[test]
fn gp_zero_elapsed() {
    let r = gross_profit_budget::calculate_gross_profit_budget(
        0.0, 3_000_000.0, 0.0, 0.0, 0.0, 30.0,
    );
    // remaining = 30, required = (3000000 - 0) / 30 = 100000
    assert_close(r.required_daily_gross_profit, 100_000.0, 1e-10);
    assert_close(r.projected_gross_profit, 0.0, 1e-10);
}
