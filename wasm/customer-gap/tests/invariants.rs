//! Mathematical invariants for customer gap calculations.
//!
//! 客数GAP = 前年同期比で説明できない、1人あたり購買行動の変化。
//!
//! @contractId BIZ-013
//! @see references/01-principles/customer-gap-definition.md
//! @see references/03-guides/invariant-catalog.md

use customer_gap_wasm::customer_gap::calculate_customer_gap;

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

struct Scenario {
    cc: f64, pc: f64,  // customers
    cq: f64, pq: f64,  // quantity
    cs: f64, ps: f64,  // sales
}

const SCENARIOS: &[Scenario] = &[
    Scenario { cc: 220.0, pc: 200.0, cq: 550.0, pq: 500.0, cs: 110_000.0, ps: 100_000.0 },
    Scenario { cc: 200.0, pc: 200.0, cq: 600.0, pq: 500.0, cs: 130_000.0, ps: 100_000.0 },
    Scenario { cc: 50.0, pc: 100.0, cq: 80.0, pq: 100.0, cs: 60_000.0, ps: 100_000.0 },
    Scenario { cc: 1e6, pc: 1e5, cq: 5e6, pq: 5e5, cs: 1e10, ps: 1e9 },
    Scenario { cc: 1.0, pc: 1.0, cq: 1.0, pq: 1.0, cs: 1.0, ps: 1.0 },
    Scenario { cc: 0.0, pc: 100.0, cq: 0.0, pq: 100.0, cs: 0.0, ps: 100_000.0 },
];

// ════════════════════════════════════════════════════════════════
// CG-INV-1: GAP definition identity
//   quantityCustomerGap = quantityYoY - customerYoY
//   amountCustomerGap   = salesYoY    - customerYoY
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_1_gap_definition() {
    for s in SCENARIOS {
        let r = calculate_customer_gap(s.cc, s.pc, s.cq, s.pq, s.cs, s.ps).unwrap();
        assert_close(r.quantity_customer_gap, r.quantity_yoy - r.customer_yoy, 1e-10);
        assert_close(r.amount_customer_gap, r.sales_yoy - r.customer_yoy, 1e-10);
    }
}

// ════════════════════════════════════════════════════════════════
// CG-INV-2: YoY definition identity
//   customerYoY = curCustomers / prevCustomers
//   quantityYoY = curQuantity / prevQuantity
//   salesYoY    = curSales / prevSales
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_2_yoy_definition() {
    for s in SCENARIOS {
        let r = calculate_customer_gap(s.cc, s.pc, s.cq, s.pq, s.cs, s.ps).unwrap();
        assert_close(r.customer_yoy, s.cc / s.pc, 1e-10);
        assert_close(r.quantity_yoy, s.cq / s.pq, 1e-10);
        assert_close(r.sales_yoy, s.cs / s.ps, 1e-10);
    }
}

// ════════════════════════════════════════════════════════════════
// CG-INV-3: Equal growth → zero gap
//   全指標が同率で変化 ⇒ gap = 0
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_3_equal_growth_zero_gap() {
    let rates = [0.5, 1.0, 1.5, 2.0, 10.0];
    for &rate in &rates {
        let r = calculate_customer_gap(
            100.0 * rate, 100.0,
            200.0 * rate, 200.0,
            50_000.0 * rate, 50_000.0,
        ).unwrap();
        assert_close(r.quantity_customer_gap, 0.0, 1e-10);
        assert_close(r.amount_customer_gap, 0.0, 1e-10);
    }
}

// ════════════════════════════════════════════════════════════════
// CG-INV-4: Null condition (前期無効)
//   prevCustomers ≤ 0 ∨ prevQuantity ≤ 0 ∨ prevSales ≤ 0 ⇒ null
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_4_null_on_invalid_prev() {
    // Zero
    assert!(calculate_customer_gap(100.0, 0.0, 100.0, 100.0, 100.0, 100.0).is_none());
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 0.0, 100.0, 100.0).is_none());
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 100.0, 100.0, 0.0).is_none());
    // Negative
    assert!(calculate_customer_gap(100.0, -1.0, 100.0, 100.0, 100.0, 100.0).is_none());
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, -1.0, 100.0, 100.0).is_none());
    assert!(calculate_customer_gap(100.0, 100.0, 100.0, 100.0, 100.0, -1.0).is_none());
}

// ════════════════════════════════════════════════════════════════
// CG-INV-5: Finite guarantee
//   全ての有限入力に対して有効な結果は有限
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_5_finite_guarantee() {
    for s in SCENARIOS {
        let r = calculate_customer_gap(s.cc, s.pc, s.cq, s.pq, s.cs, s.ps).unwrap();
        assert!(r.customer_yoy.is_finite());
        assert!(r.quantity_yoy.is_finite());
        assert!(r.sales_yoy.is_finite());
        assert!(r.quantity_customer_gap.is_finite());
        assert!(r.amount_customer_gap.is_finite());
    }
}

// ════════════════════════════════════════════════════════════════
// CG-INV-6: Sign consistency
//   GAP > 0 ⇔ その指標のYoY > customerYoY（客数以上に伸びている）
// ════════════════════════════════════════════════════════════════

#[test]
fn cg_inv_6_sign_consistency() {
    // 客数横ばい、点数増 → quantityGap > 0
    let r = calculate_customer_gap(100.0, 100.0, 150.0, 100.0, 100_000.0, 100_000.0).unwrap();
    assert!(r.quantity_customer_gap > 0.0);
    assert_eq!(r.amount_customer_gap, 0.0);

    // 客数増、点数横ばい → quantityGap < 0
    let r = calculate_customer_gap(150.0, 100.0, 100.0, 100.0, 100_000.0, 100_000.0).unwrap();
    assert!(r.quantity_customer_gap < 0.0);
}
