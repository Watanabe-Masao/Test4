//! Edge cases: boundary conditions, extreme values.
//!
//! @contractId BIZ-010

use observation_period_wasm::observation_period::{
    evaluate_observation_period, ObservationStatus, ObservationThresholds,
    worse_observation_status,
};

fn default_thresholds() -> ObservationThresholds {
    ObservationThresholds::default()
}

// ════════════════════════════════════════════════════════════════
// Empty / minimal
// ════════════════════════════════════════════════════════════════

#[test]
fn empty_sales_array() {
    let sales: Vec<f64> = vec![];
    let r = evaluate_observation_period(&sales, 0, 0, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Undefined);
    assert_eq!(r.days_in_month, 0);
}

#[test]
fn single_day_month_with_sales() {
    let sales = vec![100.0];
    // daysInMonth=1, elapsedDays=1 < 5 → invalid (minDaysForValid=5)
    let r = evaluate_observation_period(&sales, 1, 1, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Invalid);
    assert_eq!(r.last_recorded_sales_day, 1);
    assert_eq!(r.sales_days, 1);
}

#[test]
fn single_day_custom_thresholds() {
    // With thresholds lowered, single day can be ok
    let sales = vec![100.0];
    let thresholds = ObservationThresholds {
        min_days_for_valid: 1,
        min_days_for_ok: 1,
        stale_days_threshold: 7,
        min_sales_days: 1,
    };
    let r = evaluate_observation_period(&sales, 1, 1, &thresholds);
    assert_eq!(r.status, ObservationStatus::Ok);
}

// ════════════════════════════════════════════════════════════════
// Boundary: exact threshold values
// ════════════════════════════════════════════════════════════════

#[test]
fn exactly_min_days_for_valid() {
    // 5 sales days, last on day 5 → elapsedDays=5 >= 5 → not invalid by this rule
    // but salesDays=5 >= 3 → check minDaysForOk: 5 < 10 → partial
    let mut sales = vec![0.0; 30];
    for i in 0..5 { sales[i] = 100.0; }
    let r = evaluate_observation_period(&sales, 30, 5, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Partial);
}

#[test]
fn exactly_min_days_for_ok() {
    // 10 sales days → elapsedDays=10 >= 10 → ok
    let mut sales = vec![0.0; 30];
    for i in 0..10 { sales[i] = 100.0; }
    let r = evaluate_observation_period(&sales, 30, 10, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Ok);
}

#[test]
fn exactly_stale_threshold() {
    // gap = exactly 7 → stale
    let mut sales = vec![0.0; 30];
    for i in 0..10 { sales[i] = 100.0; } // last day = 10
    let r = evaluate_observation_period(&sales, 30, 17, &default_thresholds());
    assert_eq!(r.warning_flags & 8, 8); // WARN_STALE_SALES_DATA
}

#[test]
fn just_below_stale_threshold() {
    // gap = 6 < 7 → not stale
    let mut sales = vec![0.0; 30];
    for i in 0..10 { sales[i] = 100.0; }
    let r = evaluate_observation_period(&sales, 30, 16, &default_thresholds());
    assert_eq!(r.warning_flags & 8, 0);
}

// ════════════════════════════════════════════════════════════════
// Sparse sales (non-consecutive days)
// ════════════════════════════════════════════════════════════════

#[test]
fn sparse_sales_scattered() {
    // Sales on days 1, 10, 20, 30 → salesDays=4, lastDay=30
    let mut sales = vec![0.0; 30];
    for &d in &[0, 9, 19, 29] { sales[d] = 100.0; }
    let r = evaluate_observation_period(&sales, 30, 30, &default_thresholds());
    assert_eq!(r.status, ObservationStatus::Ok);
    assert_eq!(r.sales_days, 4);
    assert_eq!(r.last_recorded_sales_day, 30);
}

// ════════════════════════════════════════════════════════════════
// worse_observation_status
// ════════════════════════════════════════════════════════════════

#[test]
fn worse_status_all_combinations() {
    use ObservationStatus::*;
    let statuses = [Ok, Partial, Invalid, Undefined];
    for &a in &statuses {
        for &b in &statuses {
            let result = worse_observation_status(a, b);
            // The worse status has higher numeric value
            assert!((result as u8) >= (a as u8).min(b as u8));
            assert!((result as u8) >= (a as u8).max(b as u8) || result == a || result == b);
        }
    }
}

#[test]
fn worse_status_symmetry_of_max() {
    use ObservationStatus::*;
    assert_eq!(worse_observation_status(Ok, Invalid), Invalid);
    assert_eq!(worse_observation_status(Invalid, Ok), Invalid);
    assert_eq!(worse_observation_status(Partial, Undefined), Undefined);
    assert_eq!(worse_observation_status(Undefined, Partial), Undefined);
}
