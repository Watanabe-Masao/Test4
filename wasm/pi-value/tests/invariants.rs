//! Mathematical invariants for PI value calculations.
//!
//! PI値は来店客1,000人あたりの購買指標。以下の数学的性質を満たす。
//!
//! @contractId BIZ-012
//! @see references/01-principles/pi-value-definition.md
//! @see references/03-guides/invariant-catalog.md

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

const PI_MULTIPLIER: f64 = 1_000.0;

struct Scenario {
    total_quantity: f64,
    total_sales: f64,
    customers: f64,
}

const SCENARIOS: &[Scenario] = &[
    Scenario { total_quantity: 100.0, total_sales: 50_000.0, customers: 200.0 },
    Scenario { total_quantity: 10_000.0, total_sales: 15_000_000.0, customers: 5_000.0 },
    Scenario { total_quantity: 1.0, total_sales: 100.0, customers: 3.0 },
    Scenario { total_quantity: 500.0, total_sales: 750_000.0, customers: 1.0 },
    Scenario { total_quantity: 0.0, total_sales: 0.0, customers: 100.0 },
    Scenario { total_quantity: 1e8, total_sales: 1e12, customers: 1e6 },
];

// ════════════════════════════════════════════════════════════════
// PI-INV-1: Definition identity
//   quantityPI = (totalQuantity / customers) × PI_MULTIPLIER
//   amountPI   = (totalSales   / customers) × PI_MULTIPLIER
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_1_quantity_pi_definition() {
    for s in SCENARIOS {
        if s.customers == 0.0 {
            continue; // PI-INV-3 handles zero case
        }
        let expected = (s.total_quantity / s.customers) * PI_MULTIPLIER;
        let actual = calculate_quantity_pi(s.total_quantity, s.customers);
        assert_close(actual, expected, 1e-10);
    }
}

#[test]
fn pi_inv_1_amount_pi_definition() {
    for s in SCENARIOS {
        if s.customers == 0.0 {
            continue;
        }
        let expected = (s.total_sales / s.customers) * PI_MULTIPLIER;
        let actual = calculate_amount_pi(s.total_sales, s.customers);
        assert_close(actual, expected, 1e-6); // tolerance scales for large values
    }
}

// ════════════════════════════════════════════════════════════════
// PI-INV-2: Combined consistency
//   calculate_pi_values(q, s, c) = (calculateQuantityPI(q, c), calculateAmountPI(s, c))
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_2_combined_equals_individual() {
    for s in SCENARIOS {
        let (qty, amt) = calculate_pi_values(s.total_quantity, s.total_sales, s.customers);
        let qty_individual = calculate_quantity_pi(s.total_quantity, s.customers);
        let amt_individual = calculate_amount_pi(s.total_sales, s.customers);
        assert_eq!(qty, qty_individual, "combined quantityPI != individual");
        assert_eq!(amt, amt_individual, "combined amountPI != individual");
    }
}

// ════════════════════════════════════════════════════════════════
// PI-INV-3: Zero divisor → zero result
//   customers = 0 ⇒ PI = 0（safeDivide fallback）
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_3_zero_customers_zero_result() {
    assert_eq!(calculate_quantity_pi(100.0, 0.0), 0.0);
    assert_eq!(calculate_amount_pi(50_000.0, 0.0), 0.0);
    assert_eq!(calculate_quantity_pi(0.0, 0.0), 0.0);
    assert_eq!(calculate_amount_pi(0.0, 0.0), 0.0);
    let (qty, amt) = calculate_pi_values(100.0, 50_000.0, 0.0);
    assert_eq!(qty, 0.0);
    assert_eq!(amt, 0.0);
}

// ════════════════════════════════════════════════════════════════
// PI-INV-4: Reconstruction identity (客単価との関係)
//   客単価 = (点数PI / 1000) × 点単価
//   ⟹ amountPI = quantityPI × (totalSales / totalQuantity) （totalQuantity ≠ 0 の場合）
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_4_reconstruction_identity() {
    for s in SCENARIOS {
        if s.customers == 0.0 || s.total_quantity == 0.0 {
            continue;
        }
        let qty_pi = calculate_quantity_pi(s.total_quantity, s.customers);
        let amt_pi = calculate_amount_pi(s.total_sales, s.customers);
        let price_per_item = s.total_sales / s.total_quantity;
        // amountPI ≈ quantityPI × price_per_item
        assert_close(amt_pi, qty_pi * price_per_item, 1e-4);
    }
}

// ════════════════════════════════════════════════════════════════
// PI-INV-5: Finite guarantee
//   全ての有限入力に対して出力は有限（NaN/Infinity 入力を除く）
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_5_finite_guarantee() {
    for s in SCENARIOS {
        let qty = calculate_quantity_pi(s.total_quantity, s.customers);
        let amt = calculate_amount_pi(s.total_sales, s.customers);
        assert!(qty.is_finite(), "quantityPI must be finite: {:?}", qty);
        assert!(amt.is_finite(), "amountPI must be finite: {:?}", amt);
    }
}

#[test]
fn pi_inv_5_extreme_values_finite() {
    // 1e15 scale
    let qty = calculate_quantity_pi(1e15, 1e10);
    assert!(qty.is_finite());
    let amt = calculate_amount_pi(1e15, 1e10);
    assert!(amt.is_finite());
}

// ════════════════════════════════════════════════════════════════
// PI-INV-6: Proportionality
//   k × totalQuantity → k × quantityPI（customers 一定の場合）
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_6_proportionality() {
    let base = calculate_quantity_pi(100.0, 200.0);
    let doubled = calculate_quantity_pi(200.0, 200.0);
    assert_close(doubled, base * 2.0, 1e-10);

    let halved = calculate_quantity_pi(50.0, 200.0);
    assert_close(halved, base * 0.5, 1e-10);
}

// ════════════════════════════════════════════════════════════════
// PI-INV-7: Monotonicity
//   totalQuantity↑ (customers 一定) ⇒ quantityPI↑
//   customers↑ (totalQuantity 一定) ⇒ quantityPI↓
// ════════════════════════════════════════════════════════════════

#[test]
fn pi_inv_7_monotonicity() {
    // More quantity → higher PI
    let pi_low = calculate_quantity_pi(100.0, 200.0);
    let pi_high = calculate_quantity_pi(200.0, 200.0);
    assert!(pi_high > pi_low, "more quantity should increase PI");

    // More customers → lower PI (same quantity spread over more customers)
    let pi_few = calculate_quantity_pi(100.0, 100.0);
    let pi_many = calculate_quantity_pi(100.0, 200.0);
    assert!(pi_few > pi_many, "more customers should decrease PI");
}
