//! Mathematical / structural invariants for observation period.
//!
//! @contractId BIZ-010
//! @see references/01-principles/observation-period-definition.md
//! @see references/03-guides/invariant-catalog.md

use observation_period_wasm::observation_period::{
    evaluate_observation_period, ObservationStatus, ObservationThresholds,
    WARN_NO_SALES_DATA, WARN_STALE_SALES_DATA,
};

fn default_thresholds() -> ObservationThresholds {
    ObservationThresholds::default()
}

struct Scenario {
    label: &'static str,
    sales: Vec<f64>,
    days_in_month: u32,
    current_elapsed_days: u32,
}

fn make_scenarios() -> Vec<Scenario> {
    vec![
        Scenario {
            label: "full month",
            sales: vec![100.0; 30],
            days_in_month: 30,
            current_elapsed_days: 30,
        },
        Scenario {
            label: "half month",
            sales: {
                let mut v = vec![100.0; 15];
                v.resize(30, 0.0);
                v
            },
            days_in_month: 30,
            current_elapsed_days: 15,
        },
        Scenario {
            label: "no sales",
            sales: vec![0.0; 30],
            days_in_month: 30,
            current_elapsed_days: 15,
        },
        Scenario {
            label: "3 days",
            sales: {
                let mut v = vec![100.0; 3];
                v.resize(30, 0.0);
                v
            },
            days_in_month: 30,
            current_elapsed_days: 3,
        },
        Scenario {
            label: "sparse 4 days",
            sales: {
                let mut v = vec![0.0; 31];
                for &d in &[0, 9, 19, 29] { v[d] = 50.0; }
                v
            },
            days_in_month: 31,
            current_elapsed_days: 31,
        },
    ]
}

// ════════════════════════════════════════════════════════════════
// OP-INV-1: elapsedDays === lastRecordedSalesDay
//   仕様準拠: 経過日数は最終販売日と一致
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_1_elapsed_equals_last_sale_day() {
    for s in make_scenarios() {
        let r = evaluate_observation_period(&s.sales, s.days_in_month, s.current_elapsed_days, &default_thresholds());
        assert_eq!(r.elapsed_days, r.last_recorded_sales_day,
            "FAIL [{}]: elapsedDays should equal lastRecordedSalesDay", s.label);
    }
}

// ════════════════════════════════════════════════════════════════
// OP-INV-2: remainingDays === daysInMonth - elapsedDays
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_2_remaining_days_identity() {
    for s in make_scenarios() {
        let r = evaluate_observation_period(&s.sales, s.days_in_month, s.current_elapsed_days, &default_thresholds());
        assert_eq!(r.remaining_days, r.days_in_month - r.elapsed_days,
            "FAIL [{}]: remainingDays identity", s.label);
    }
}

// ════════════════════════════════════════════════════════════════
// OP-INV-3: salesDays ≤ lastRecordedSalesDay ≤ daysInMonth
//   営業日数 ≤ 最終販売日 ≤ 月日数
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_3_salesdays_bounds() {
    for s in make_scenarios() {
        let r = evaluate_observation_period(&s.sales, s.days_in_month, s.current_elapsed_days, &default_thresholds());
        assert!(r.sales_days <= r.last_recorded_sales_day,
            "FAIL [{}]: salesDays({}) > lastRecordedSalesDay({})", s.label, r.sales_days, r.last_recorded_sales_day);
        assert!(r.last_recorded_sales_day <= r.days_in_month,
            "FAIL [{}]: lastRecordedSalesDay({}) > daysInMonth({})", s.label, r.last_recorded_sales_day, r.days_in_month);
    }
}

// ════════════════════════════════════════════════════════════════
// OP-INV-4: salesDays === 0 ⟹ status === Undefined
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_4_no_sales_means_undefined() {
    for s in make_scenarios() {
        let r = evaluate_observation_period(&s.sales, s.days_in_month, s.current_elapsed_days, &default_thresholds());
        if r.sales_days == 0 {
            assert_eq!(r.status, ObservationStatus::Undefined,
                "FAIL [{}]: salesDays=0 must yield Undefined", s.label);
            assert_ne!(r.warning_flags & WARN_NO_SALES_DATA, 0,
                "FAIL [{}]: must have WARN_NO_SALES_DATA when undefined", s.label);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// OP-INV-5: Status monotonicity
//   より多くのデータ ⇒ ステータスは同じか改善
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_5_more_data_better_or_equal_status() {
    // Progressively add more sales days, status should not worsen
    let mut prev_severity = 3u8; // Undefined
    for n_days in [0, 1, 2, 3, 5, 8, 10, 15, 25, 30] {
        let mut sales = vec![0.0; 30];
        for i in 0..n_days { sales[i] = 100.0; }
        let r = evaluate_observation_period(&sales, 30, n_days as u32, &default_thresholds());
        let severity = r.status as u8;
        assert!(severity <= prev_severity,
            "Adding more data (n={}) should not worsen status: was {} now {}", n_days, prev_severity, severity);
        prev_severity = severity;
    }
}

// ════════════════════════════════════════════════════════════════
// OP-INV-6: Staleness is independent of status
//   stale warning は status とは独立に発火する
// ════════════════════════════════════════════════════════════════

#[test]
fn op_inv_6_stale_independent_of_status() {
    // ok status with stale warning
    let mut sales = vec![0.0; 30];
    for i in 0..10 { sales[i] = 100.0; } // last day 10, elapsedDays=10, ok status
    let r = evaluate_observation_period(&sales, 30, 20, &default_thresholds()); // currentElapsed=20
    assert_eq!(r.status, ObservationStatus::Ok);
    assert_ne!(r.warning_flags & WARN_STALE_SALES_DATA, 0, "should be stale");

    // ok status without stale warning
    let r2 = evaluate_observation_period(&sales, 30, 15, &default_thresholds()); // currentElapsed=15
    assert_eq!(r2.status, ObservationStatus::Ok);
    assert_eq!(r2.warning_flags & WARN_STALE_SALES_DATA, 0, "should not be stale");
}
