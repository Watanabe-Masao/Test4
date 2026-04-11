//! Cross-validation: TS reference implementation golden fixtures.
//!
//! This file ports the test cases from the TS authoritative reference
//! (domain/calculations/piValue.ts, lines 58-80) to validate that the
//! candidate WASM implementation produces identical results.
//!
//! @contractId BIZ-012
//! @semanticClass business

use pi_value_wasm::pi_value::{calculate_amount_pi, calculate_pi_values, calculate_quantity_pi};

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
// Golden fixtures: TS piValue.ts lines 58-80
// ════════════════════════════════════════════════════════════════

struct Scenario {
    label: &'static str,
    total_quantity: f64,
    total_sales: f64,
    customers: f64,
    expected_qty_pi: f64,
    expected_amt_pi: f64,
}

const SCENARIOS: &[Scenario] = &[
    // TS: calculateQuantityPI(100, 200) → safeDivide(100,200,0) * 1000 = 500
    Scenario {
        label: "通常値: 点数100, 売上50000, 客数200",
        total_quantity: 100.0,
        total_sales: 50_000.0,
        customers: 200.0,
        expected_qty_pi: 500.0,
        expected_amt_pi: 250_000.0,
    },
    // TS: safeDivide(0, 100, 0) * 1000 = 0
    Scenario {
        label: "販売ゼロ: 点数0, 売上0, 客数100",
        total_quantity: 0.0,
        total_sales: 0.0,
        customers: 100.0,
        expected_qty_pi: 0.0,
        expected_amt_pi: 0.0,
    },
    // TS: safeDivide(100, 0, 0) * 1000 = 0 (zero customers → fallback 0)
    Scenario {
        label: "客数ゼロ: 点数100, 売上50000, 客数0",
        total_quantity: 100.0,
        total_sales: 50_000.0,
        customers: 0.0,
        expected_qty_pi: 0.0,
        expected_amt_pi: 0.0,
    },
    // 大規模店舗
    Scenario {
        label: "大規模店舗: 点数10000, 売上1500万, 客数5000",
        total_quantity: 10_000.0,
        total_sales: 15_000_000.0,
        customers: 5_000.0,
        expected_qty_pi: 2_000.0,
        expected_amt_pi: 3_000_000.0,
    },
    // 1人だけの来店
    Scenario {
        label: "客数1: 点数3, 売上5000, 客数1",
        total_quantity: 3.0,
        total_sales: 5_000.0,
        customers: 1.0,
        expected_qty_pi: 3_000.0,
        expected_amt_pi: 5_000_000.0,
    },
    // 全ゼロ
    Scenario {
        label: "全ゼロ",
        total_quantity: 0.0,
        total_sales: 0.0,
        customers: 0.0,
        expected_qty_pi: 0.0,
        expected_amt_pi: 0.0,
    },
];

#[test]
fn golden_quantity_pi() {
    for s in SCENARIOS {
        assert_eq!(
            calculate_quantity_pi(s.total_quantity, s.customers),
            s.expected_qty_pi,
            "FAIL [{}]: quantityPI",
            s.label,
        );
    }
}

#[test]
fn golden_amount_pi() {
    for s in SCENARIOS {
        assert_eq!(
            calculate_amount_pi(s.total_sales, s.customers),
            s.expected_amt_pi,
            "FAIL [{}]: amountPI",
            s.label,
        );
    }
}

#[test]
fn golden_pi_values_combined() {
    for s in SCENARIOS {
        let (qty, amt) = calculate_pi_values(s.total_quantity, s.total_sales, s.customers);
        assert_eq!(qty, s.expected_qty_pi, "FAIL [{}]: combined quantityPI", s.label);
        assert_eq!(amt, s.expected_amt_pi, "FAIL [{}]: combined amountPI", s.label);
    }
}

#[test]
fn golden_fractional_result() {
    // TS: safeDivide(1, 3, 0) * 1000 = 333.333...
    let qty = calculate_quantity_pi(1.0, 3.0);
    assert_close(qty, 333.33333333333337, 1e-10);

    let amt = calculate_amount_pi(1.0, 3.0);
    assert_close(amt, 333.33333333333337, 1e-10);
}
