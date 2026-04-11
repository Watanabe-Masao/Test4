//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/remainingBudgetRate.ts (lines 40-53)
//!
//! @contractId BIZ-008

use remaining_budget_rate_wasm::remaining_budget_rate::calculate_remaining_budget_rate;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a,
        b,
        (a - b).abs(),
        tol,
    );
}

fn uniform_daily(per_day: f64, days: usize) -> Vec<f64> {
    vec![per_day; days]
}

// ════════════════════════════════════════════════════════════════
// Golden fixtures
// ════════════════════════════════════════════════════════════════

#[test]
fn golden_on_plan() {
    // budget=300, sales=100, 10/30 elapsed, daily=10
    // remaining_target = 200, remaining_budget = 20*10 = 200 → rate = 100%
    let daily = uniform_daily(10.0, 30);
    let rate = calculate_remaining_budget_rate(300.0, 100.0, &daily, 10, 30);
    assert_eq!(rate, 100.0);
}

#[test]
fn golden_catch_up_needed() {
    // sales=50 (behind), remaining_target=250, remaining_budget=200 → 125%
    let daily = uniform_daily(10.0, 30);
    let rate = calculate_remaining_budget_rate(300.0, 50.0, &daily, 10, 30);
    assert_eq!(rate, 125.0);
}

#[test]
fn golden_ahead_of_plan() {
    // sales=200 (ahead), remaining_target=100, remaining_budget=200 → 50%
    let daily = uniform_daily(10.0, 30);
    let rate = calculate_remaining_budget_rate(300.0, 200.0, &daily, 10, 30);
    assert_eq!(rate, 50.0);
}

#[test]
fn golden_exceeded_budget() {
    // sales=350 > budget=300, remaining_target=-50 → rate = -25%
    let daily = uniform_daily(10.0, 30);
    let rate = calculate_remaining_budget_rate(300.0, 350.0, &daily, 10, 30);
    assert_eq!(rate, -25.0);
}

#[test]
fn golden_uneven_daily() {
    // 不均等な日別予算: 前半5, 後半15
    let mut daily = vec![5.0; 15];
    daily.extend(vec![15.0; 15]);
    // elapsed=15, remaining budget = 15*15 = 225, target = 300-75 = 225 → 100%
    let rate = calculate_remaining_budget_rate(300.0, 75.0, &daily, 15, 30);
    assert_eq!(rate, 100.0);
}

#[test]
fn golden_fractional_daily() {
    // 日割り予算が割り切れない: budget=100, 31日
    let daily_val = 100.0 / 31.0;
    let daily = vec![daily_val; 31];
    let rate = calculate_remaining_budget_rate(100.0, 50.0, &daily, 15, 31);
    // remaining_target=50, remaining_budget = 16 * (100/31) ≈ 51.61 → rate ≈ 96.875
    assert_close(rate, 50.0 / (16.0 * daily_val) * 100.0, 1e-10);
}
