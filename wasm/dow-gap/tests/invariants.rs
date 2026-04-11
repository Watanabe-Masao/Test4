//! Mathematical invariants for DOW gap analysis.
//! @contractId ANA-007
//! @methodFamily calendar_effect

use dow_gap_wasm::dow_gap::analyze_dow_gap;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {})", a, b, (a - b).abs());
}

// ════════════════════════════════════════════════════
// DG-INV-1: 同一曜日構成 → estimatedImpact = 0
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_1_same_structure_zero_impact() {
    let counts = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &counts, &counts, &[100.0; 7], 50.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    assert_close(out[0], 0.0, 1e-10); // estimatedImpact
    assert_eq!(out[16], 1.0); // isSameStructure = true
}

// ════════════════════════════════════════════════════
// DG-INV-2: estimatedImpact = Σ(diff × prevDowDailyAvg)
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_2_impact_definition() {
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let prev_sales = [400.0, 500.0, 400.0, 500.0, 400.0, 500.0, 400.0];
    let out = analyze_dow_gap(
        &cur, &prev, &prev_sales, 100.0,
        &[], &[], &[0; 7], 0.0, false,
    );

    // Verify: impact = Σ((cur[i]-prev[i]) × (prevSales[i]/prev[i]))
    let mut expected = 0.0;
    for i in 0..7 {
        let diff = cur[i] - prev[i];
        let avg = prev_sales[i] / prev[i]; // prev[i] > 0 for all
        expected += diff * avg;
    }
    assert_close(out[0], expected, 1e-6);
}

// ════════════════════════════════════════════════════
// DG-INV-3: prevDowDailyAvg 長さ = 7
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_3_avg_length_7() {
    let counts = [4.0; 7];
    let out = analyze_dow_gap(
        &counts, &counts, &[100.0; 7], 50.0,
        &[], &[], &[0; 7], 0.0, false,
    );
    // prevDowDailyAvg is at indices 1..8
    for i in 1..8 {
        assert!(out[i].is_finite(), "prevDowDailyAvg[{}] not finite", i - 1);
    }
}

// ════════════════════════════════════════════════════
// DG-INV-4: NaN prevDowSales → fallback to dailyAverageSales
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_4_nan_fallback() {
    let counts = [4.0; 7];
    let nan_sales = [f64::NAN; 7];
    let daily_avg = 123.0;
    let out = analyze_dow_gap(
        &counts, &counts, &nan_sales, daily_avg,
        &[], &[], &[0; 7], 0.0, false,
    );
    for i in 1..8 {
        assert_close(out[i], daily_avg, 1e-10);
    }
}

// ════════════════════════════════════════════════════
// DG-INV-5: 有限保証
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_5_finite_guarantee() {
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    let out = analyze_dow_gap(
        &cur, &prev, &[1e6; 7], 1e5,
        &[], &[], &[0; 7], 0.0, false,
    );
    for i in 0..17 { // fixed part
        assert!(out[i].is_finite(), "output[{}] not finite", i);
    }
}

// ════════════════════════════════════════════════════
// DG-INV-6: 手法別結果の合計制約
//   曜日合計 = Σ diff × methodAvg[dow] = methodSalesImpact
// ════════════════════════════════════════════════════

#[test]
fn dg_inv_6_method_impact_sum() {
    let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0];
    let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
    // Provide daily data: 4 values per DOW
    let n = 4;
    let sales_flat: Vec<f64> = (0..7*n).map(|i| ((i / n) + 1) as f64 * 100.0).collect();
    let cust_flat: Vec<f64> = (0..7*n).map(|i| ((i / n) + 1) as f64 * 10.0).collect();
    let lengths = [n as u32; 7];

    let out = analyze_dow_gap(
        &cur, &prev, &[f64::NAN; 7], 100.0,
        &sales_flat, &cust_flat, &lengths, 50.0, true,
    );

    // For each method (offset: 17, 17+16, 17+32)
    for m in 0..3 {
        let base = 17 + m * 16;
        let sales_impact = out[base];
        let dow_avg_sales_start = base + 2;
        let mut recomputed = 0.0;
        for dow in 0..7 {
            let diff = cur[dow] - prev[dow];
            recomputed += diff * out[dow_avg_sales_start + dow];
        }
        assert_close(sales_impact, recomputed, 1e-6);
    }
}
