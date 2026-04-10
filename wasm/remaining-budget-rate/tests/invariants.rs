//! Mathematical invariants for remaining budget rate calculation.
//!
//! 式: rate = (budget - totalSales) / remainingPeriodBudget × 100
//!
//! @contractId BIZ-008
//! @see references/03-guides/invariant-catalog.md

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

const PERCENT_MULTIPLIER: f64 = 100.0;

struct Scenario {
    budget: f64,
    total_sales: f64,
    daily: Vec<f64>,
    elapsed_days: usize,
    days_in_month: usize,
}

fn make_scenarios() -> Vec<Scenario> {
    vec![
        Scenario {
            budget: 300.0, total_sales: 100.0,
            daily: uniform_daily(10.0, 30), elapsed_days: 10, days_in_month: 30,
        },
        Scenario {
            budget: 300.0, total_sales: 50.0,
            daily: uniform_daily(10.0, 30), elapsed_days: 10, days_in_month: 30,
        },
        Scenario {
            budget: 1_000_000.0, total_sales: 500_000.0,
            daily: uniform_daily(1_000_000.0 / 31.0, 31), elapsed_days: 15, days_in_month: 31,
        },
        Scenario {
            budget: 100.0, total_sales: 0.0,
            daily: uniform_daily(100.0 / 28.0, 28), elapsed_days: 0, days_in_month: 28,
        },
    ]
}

// ════════════════════════════════════════════════════════════════
// RBR-INV-1: Definition identity
//   rate = (budget - totalSales) / Σ dailyBudget[elapsed+1..daysInMonth] × 100
// ════════════════════════════════════════════════════════════════

#[test]
fn rbr_inv_1_definition_identity() {
    for s in make_scenarios() {
        let remaining_target = s.budget - s.total_sales;
        let remaining_budget: f64 = s.daily[s.elapsed_days..s.days_in_month].iter().sum();

        if remaining_budget == 0.0 {
            continue; // RBR-INV-3 handles this
        }

        let expected = (remaining_target / remaining_budget) * PERCENT_MULTIPLIER;
        let actual = calculate_remaining_budget_rate(
            s.budget, s.total_sales, &s.daily, s.elapsed_days, s.days_in_month,
        );
        assert_close(actual, expected, 1e-10);
    }
}

// ════════════════════════════════════════════════════════════════
// RBR-INV-2: On-plan identity
//   totalSales = Σ dailyBudget[0..elapsed] ⇒ rate = 100%
// ════════════════════════════════════════════════════════════════

#[test]
fn rbr_inv_2_on_plan_identity() {
    let daily = uniform_daily(10.0, 30);
    let elapsed = 10;
    let cumulative_sales: f64 = daily[0..elapsed].iter().sum();
    let rate = calculate_remaining_budget_rate(300.0, cumulative_sales, &daily, elapsed, 30);
    assert_eq!(rate, 100.0);
}

#[test]
fn rbr_inv_2_on_plan_various_periods() {
    for elapsed in [1, 5, 10, 15, 20, 25, 29] {
        let daily = uniform_daily(10.0, 30);
        let cumulative: f64 = daily[0..elapsed].iter().sum();
        let rate = calculate_remaining_budget_rate(300.0, cumulative, &daily, elapsed, 30);
        assert_close(rate, 100.0, 1e-10);
    }
}

// ════════════════════════════════════════════════════════════════
// RBR-INV-3: Zero remaining budget → rate = 0
//   Σ dailyBudget[elapsed+1..end] = 0 ⇒ rate = 0 (safeDivide fallback)
// ════════════════════════════════════════════════════════════════

#[test]
fn rbr_inv_3_zero_remaining_budget() {
    let daily = uniform_daily(10.0, 30);
    assert_eq!(calculate_remaining_budget_rate(300.0, 100.0, &daily, 30, 30), 0.0);

    let zero_daily = vec![0.0; 30];
    assert_eq!(calculate_remaining_budget_rate(300.0, 100.0, &zero_daily, 0, 30), 0.0);
}

// ════════════════════════════════════════════════════════════════
// RBR-INV-4: Finite guarantee
//   全ての有限入力に対して出力は有限
// ════════════════════════════════════════════════════════════════

#[test]
fn rbr_inv_4_finite_guarantee() {
    for s in make_scenarios() {
        let rate = calculate_remaining_budget_rate(
            s.budget, s.total_sales, &s.daily, s.elapsed_days, s.days_in_month,
        );
        assert!(rate.is_finite(), "rate must be finite: {:?}", rate);
    }
}

#[test]
fn rbr_inv_4_extreme_values_finite() {
    let daily = uniform_daily(1e10, 30);
    let rate = calculate_remaining_budget_rate(3e11, 1e11, &daily, 10, 30);
    assert!(rate.is_finite());
}

// ════════════════════════════════════════════════════════════════
// RBR-INV-5: Monotonicity
//   totalSales↑ (他一定) ⇒ rate↓
// ════════════════════════════════════════════════════════════════

#[test]
fn rbr_inv_5_monotonicity_sales() {
    let daily = uniform_daily(10.0, 30);
    let rate_low = calculate_remaining_budget_rate(300.0, 50.0, &daily, 10, 30);
    let rate_high = calculate_remaining_budget_rate(300.0, 150.0, &daily, 10, 30);
    assert!(rate_low > rate_high, "more sales should decrease required rate");
}

#[test]
fn rbr_inv_5_monotonicity_elapsed() {
    let daily = uniform_daily(10.0, 30);
    // Same sales, more days elapsed → less remaining budget → higher rate
    let rate_early = calculate_remaining_budget_rate(300.0, 100.0, &daily, 5, 30);
    let rate_late = calculate_remaining_budget_rate(300.0, 100.0, &daily, 25, 30);
    assert!(rate_late > rate_early, "more elapsed days with same sales should increase rate");
}
