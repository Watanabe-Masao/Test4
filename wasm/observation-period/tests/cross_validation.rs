//! Cross-validation: TS reference implementation golden fixtures.
//!
//! Ports test cases from domain/calculations/observationPeriod.ts (lines 68-109)
//!
//! @contractId BIZ-010
//! @see references/01-principles/observation-period-definition.md

use observation_period_wasm::observation_period::{
    evaluate_observation_period, ObservationStatus, ObservationThresholds,
    WARN_NO_SALES_DATA, WARN_INSUFFICIENT_SALES_DAYS, WARN_WINDOW_INCOMPLETE,
    WARN_STALE_SALES_DATA,
};

fn default_thresholds() -> ObservationThresholds {
    ObservationThresholds::default()
}

fn make_sales(days_with_sales: &[usize], total_days: usize) -> Vec<f64> {
    let mut v = vec![0.0; total_days];
    for &d in days_with_sales {
        if d > 0 && d <= total_days {
            v[d - 1] = 100.0; // arbitrary nonzero
        }
    }
    v
}

// ════════════════════════════════════════════════════════════════
// Golden fixtures: TS observationPeriod.ts
// ════════════════════════════════════════════════════════════════

#[test]
fn golden_full_month_ok() {
    // 30 days, all with sales → ok, no warnings
    let sales = vec![100.0; 30];
    let r = evaluate_observation_period(&sales, 30, 30, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Ok);
    assert_eq!(r.last_recorded_sales_day, 30);
    assert_eq!(r.sales_days, 30);
    assert_eq!(r.remaining_days, 0);
    assert_eq!(r.warning_flags, 0);
}

#[test]
fn golden_no_sales_undefined() {
    // No sales data → undefined
    let sales = vec![0.0; 30];
    let r = evaluate_observation_period(&sales, 30, 15, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Undefined);
    assert_eq!(r.last_recorded_sales_day, 0);
    assert_eq!(r.sales_days, 0);
    assert_eq!(r.warning_flags & WARN_NO_SALES_DATA, WARN_NO_SALES_DATA);
}

#[test]
fn golden_few_days_invalid() {
    // 3 sales days, last on day 4 → elapsedDays=4 < 5 (minDaysForValid) → invalid
    let sales = make_sales(&[1, 2, 4], 30);
    let r = evaluate_observation_period(&sales, 30, 4, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Invalid);
    assert_eq!(r.last_recorded_sales_day, 4);
    assert_eq!(r.sales_days, 3);
}

#[test]
fn golden_insufficient_sales_days_invalid() {
    // 2 sales days scattered across 8 days → salesDays=2 < 3 (minSalesDays) → invalid
    let sales = make_sales(&[1, 8], 30);
    let r = evaluate_observation_period(&sales, 30, 8, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Invalid);
    assert_eq!(r.warning_flags & WARN_INSUFFICIENT_SALES_DAYS, WARN_INSUFFICIENT_SALES_DAYS);
    assert_eq!(r.warning_flags & WARN_WINDOW_INCOMPLETE, WARN_WINDOW_INCOMPLETE);
}

#[test]
fn golden_partial() {
    // 5 sales days, last on day 7 → elapsedDays=7 >= 5 but < 10 → partial
    let sales = make_sales(&[1, 2, 3, 5, 7], 30);
    let r = evaluate_observation_period(&sales, 30, 7, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Partial);
    assert_eq!(r.warning_flags & WARN_WINDOW_INCOMPLETE, WARN_WINDOW_INCOMPLETE);
}

#[test]
fn golden_stale_data() {
    // Last sale day 10, currentElapsedDays=20, gap=10 >= 7 → stale warning
    let sales = make_sales(&(1..=10).collect::<Vec<_>>(), 30);
    let r = evaluate_observation_period(&sales, 30, 20, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Ok);
    assert_eq!(r.warning_flags & WARN_STALE_SALES_DATA, WARN_STALE_SALES_DATA);
}

#[test]
fn golden_not_stale_within_threshold() {
    // Last sale day 10, currentElapsedDays=16, gap=6 < 7 → no stale
    let sales = make_sales(&(1..=10).collect::<Vec<_>>(), 30);
    let r = evaluate_observation_period(&sales, 30, 16, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Ok);
    assert_eq!(r.warning_flags & WARN_STALE_SALES_DATA, 0);
}
