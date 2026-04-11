//! Edge cases: boundary conditions, extreme values.
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

// ════════════════════════════════════════════════════════════════
// Zero and boundary
// ════════════════════════════════════════════════════════════════

#[test]
fn all_days_elapsed() {
    // elapsed = daysInMonth → remaining budget = 0 → rate = 0
    let daily = vec![10.0; 30];
    assert_eq!(calculate_remaining_budget_rate(300.0, 100.0, &daily, 30, 30), 0.0);
}

#[test]
fn no_days_elapsed() {
    // elapsed = 0 → remaining budget = full budget
    let daily = vec![10.0; 30];
    let rate = calculate_remaining_budget_rate(300.0, 0.0, &daily, 0, 30);
    assert_eq!(rate, 100.0);
}

#[test]
fn empty_daily_array() {
    let daily: Vec<f64> = vec![];
    assert_eq!(calculate_remaining_budget_rate(300.0, 100.0, &daily, 0, 30), 0.0);
}

#[test]
fn zero_budget() {
    let daily = vec![0.0; 30];
    // remaining budget = 0 → rate = 0 (safeDivide fallback)
    assert_eq!(calculate_remaining_budget_rate(0.0, 0.0, &daily, 10, 30), 0.0);
}

#[test]
fn zero_sales_full_budget() {
    let daily = vec![10.0; 30];
    // sales = 0, remaining_target = 300, remaining_budget = 300 → 100%
    assert_eq!(calculate_remaining_budget_rate(300.0, 0.0, &daily, 0, 30), 100.0);
}

// ════════════════════════════════════════════════════════════════
// Large values
// ════════════════════════════════════════════════════════════════

#[test]
fn large_values_finite() {
    let daily = vec![1e8; 30];
    let rate = calculate_remaining_budget_rate(3e9, 1e9, &daily, 10, 30);
    assert!(rate.is_finite());
    assert_close(rate, 100.0, 1e-6);
}

// ════════════════════════════════════════════════════════════════
// Sparse daily (some days zero)
// ════════════════════════════════════════════════════════════════

#[test]
fn sparse_daily_budget() {
    // Days 1-10 have budget, days 11-30 are zero
    let mut daily = vec![30.0; 10];
    daily.extend(vec![0.0; 20]);
    // elapsed = 5, remaining_budget = 5*30 + 0 = 150, target = 300-50 = 250
    let rate = calculate_remaining_budget_rate(300.0, 50.0, &daily, 5, 30);
    assert_close(rate, 250.0 / 150.0 * 100.0, 1e-10);
}

// ════════════════════════════════════════════════════════════════
// Negative scenarios
// ════════════════════════════════════════════════════════════════

#[test]
fn negative_remaining_target() {
    // Over-performing: sales > budget → negative rate
    let daily = vec![10.0; 30];
    let rate = calculate_remaining_budget_rate(300.0, 400.0, &daily, 10, 30);
    assert!(rate < 0.0, "over-performing should yield negative rate");
}

#[test]
fn single_day_month() {
    let daily = vec![100.0];
    // daysInMonth=1, elapsed=0, remaining budget=100, target=100-50=50 → 50%
    assert_eq!(calculate_remaining_budget_rate(100.0, 50.0, &daily, 0, 1), 50.0);
}
