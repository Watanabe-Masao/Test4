//! Mathematical invariants for time slot calculations.
//!
//! @contractId ANA-001
//! @semanticClass analytic
//! @methodFamily time_pattern
//! @see references/03-guides/invariant-catalog.md

use time_slot_wasm::core_time::find_core_time;
use time_slot_wasm::turnaround::find_turnaround_hour;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

// ════════════════════════════════════════════════════
// TS-INV-1: コアタイム ⊂ 営業時間
//   startHour >= minHour ∧ endHour <= maxHour
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_1_core_time_within_range() {
    let cases: Vec<(Vec<f64>, Vec<f64>)> = vec![
        (vec![9.0, 10.0, 11.0, 12.0, 13.0, 14.0], vec![100.0, 200.0, 500.0, 600.0, 400.0, 150.0]),
        (vec![8.0, 9.0, 10.0, 11.0, 12.0], vec![50.0, 100.0, 200.0, 300.0, 150.0]),
        (vec![6.0, 7.0, 8.0, 18.0, 19.0, 20.0], vec![10.0, 20.0, 30.0, 500.0, 600.0, 400.0]),
    ];
    for (hours, amounts) in &cases {
        let r = find_core_time(hours, amounts).unwrap();
        let min_h = hours.iter().cloned().reduce(f64::min).unwrap();
        let max_h = hours.iter().cloned().reduce(f64::max).unwrap();
        assert!(r.start_hour >= min_h, "startHour {} < minHour {}", r.start_hour, min_h);
        assert!(r.end_hour <= max_h, "endHour {} > maxHour {}", r.end_hour, max_h);
    }
}

// ════════════════════════════════════════════════════
// TS-INV-2: コアタイム合計 ≤ 全体合計
//   coreTime.total ≤ Σ amounts
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_2_core_total_leq_grand() {
    let hours = [8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0];
    let amounts = [50.0, 100.0, 200.0, 300.0, 250.0, 150.0, 100.0, 50.0];
    let r = find_core_time(&hours, &amounts).unwrap();
    let grand: f64 = amounts.iter().sum();
    assert!(r.total <= grand + 1e-10);
}

// ════════════════════════════════════════════════════
// TS-INV-3: endHour = startHour + 2（3時間以上ある場合）
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_3_window_width() {
    let hours = [9.0, 10.0, 11.0, 12.0, 13.0];
    let amounts = [100.0, 200.0, 300.0, 250.0, 150.0];
    let r = find_core_time(&hours, &amounts).unwrap();
    assert_close(r.end_hour, r.start_hour + 2.0, 1e-10);
}

// ════════════════════════════════════════════════════
// TS-INV-4: 折り返し時間は営業時間内
//   turnaroundHour ∈ [minHour, maxHour]
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_4_turnaround_within_range() {
    let cases: Vec<(Vec<f64>, Vec<f64>)> = vec![
        (vec![9.0, 10.0, 11.0, 12.0, 13.0], vec![100.0, 200.0, 300.0, 250.0, 150.0]),
        (vec![6.0, 12.0, 18.0], vec![100.0, 500.0, 400.0]),
    ];
    for (hours, amounts) in &cases {
        let r = find_turnaround_hour(hours, amounts);
        if !r.is_nan() {
            let min_h = hours.iter().cloned().reduce(f64::min).unwrap();
            let max_h = hours.iter().cloned().reduce(f64::max).unwrap();
            assert!(r >= min_h && r <= max_h, "turnaround {} outside [{}, {}]", r, min_h, max_h);
        }
    }
}

// ════════════════════════════════════════════════════
// TS-INV-5: 累積50%の意味
//   turnaroundHour の累積売上 ≥ 全体の50%
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_5_turnaround_50pct() {
    let hours = [9.0, 10.0, 11.0, 12.0, 13.0, 14.0];
    let amounts = [100.0, 200.0, 300.0, 250.0, 100.0, 50.0];
    let turnaround = find_turnaround_hour(&hours, &amounts);
    assert!(!turnaround.is_nan());

    // Verify cumulative at turnaround >= 50% of total
    let total: f64 = amounts.iter().sum();
    let mut cum = 0.0;
    let mut reached = false;
    for (&h, &a) in hours.iter().zip(amounts.iter()) {
        cum += a;
        if (h - turnaround).abs() < 0.01 {
            assert!(cum >= total * 0.5 - 1e-10, "cumulative {} < 50% of {}", cum, total);
            reached = true;
            break;
        }
    }
    assert!(reached, "turnaround hour not found in input");
}

// ════════════════════════════════════════════════════
// TS-INV-6: 空入力 → null
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_6_empty_returns_null() {
    assert!(find_core_time(&[], &[]).is_none());
    assert!(find_turnaround_hour(&[], &[]).is_nan());
}

// ════════════════════════════════════════════════════
// TS-INV-7: 有限保証
// ════════════════════════════════════════════════════

#[test]
fn ts_inv_7_finite_guarantee() {
    let hours: Vec<f64> = (0..24).map(|h| h as f64).collect();
    let amounts: Vec<f64> = (0..24).map(|h| (h + 1) as f64 * 1000.0).collect();
    let core = find_core_time(&hours, &amounts).unwrap();
    assert!(core.start_hour.is_finite());
    assert!(core.end_hour.is_finite());
    assert!(core.total.is_finite());

    let turn = find_turnaround_hour(&hours, &amounts);
    assert!(turn.is_finite());
}
