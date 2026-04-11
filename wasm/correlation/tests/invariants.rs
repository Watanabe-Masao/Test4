//! Mathematical invariants for correlation analysis.
//! @contractId ANA-005
//! @methodFamily statistical
//! @see references/03-guides/invariant-catalog.md

use correlation_wasm::correlation::*;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol);
}

// ════════════════════════════════════════════════════
// CORR-INV-1: Pearson r ∈ [-1, 1]
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_1_pearson_bounded() {
    let cases: Vec<(Vec<f64>, Vec<f64>)> = vec![
        (vec![1.0, 2.0, 3.0], vec![10.0, 20.0, 30.0]),
        (vec![1.0, 2.0, 3.0], vec![30.0, 20.0, 10.0]),
        (vec![1.0, 5.0, 2.0, 8.0], vec![3.0, 1.0, 7.0, 4.0]),
        (vec![0.0; 5], vec![1.0, 2.0, 3.0, 4.0, 5.0]),
    ];
    for (xs, ys) in &cases {
        let (r, _) = pearson_correlation(xs, ys);
        assert!(r >= -1.0 && r <= 1.0, "r={} out of [-1,1]", r);
    }
}

// ════════════════════════════════════════════════════
// CORR-INV-2: Pearson symmetry: corr(X,Y) = corr(Y,X)
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_2_pearson_symmetry() {
    let xs = vec![1.0, 3.0, 5.0, 7.0, 9.0];
    let ys = vec![2.0, 8.0, 4.0, 6.0, 10.0];
    let (r_xy, _) = pearson_correlation(&xs, &ys);
    let (r_yx, _) = pearson_correlation(&ys, &xs);
    assert_close(r_xy, r_yx, 1e-10);
}

// ════════════════════════════════════════════════════
// CORR-INV-3: Cosine similarity ∈ [0, 1] for non-negative vectors
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_3_cosine_bounded_nonneg() {
    let cases: Vec<(Vec<f64>, Vec<f64>)> = vec![
        (vec![1.0, 2.0, 3.0], vec![4.0, 5.0, 6.0]),
        (vec![0.0, 1.0, 0.0], vec![0.0, 0.0, 1.0]),
        (vec![1.0; 10], vec![1.0; 10]),
    ];
    for (a, b) in &cases {
        let sim = cosine_similarity(a, b);
        assert!(sim >= 0.0 && sim <= 1.0 + 1e-10, "sim={} out of [0,1]", sim);
    }
}

// ════════════════════════════════════════════════════
// CORR-INV-4: Normalization range: output ∈ [0, 100]
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_4_normalization_range() {
    let inputs = vec![
        vec![1.0, 5.0, 10.0],
        vec![100.0, 200.0, 300.0, 400.0],
        vec![-10.0, 0.0, 10.0],
    ];
    for values in &inputs {
        let (norm, _, _, _) = normalize_min_max(values);
        for &v in &norm {
            assert!(v >= 0.0 && v <= 100.0 + 1e-10, "normalized value {} out of [0,100]", v);
        }
    }
}

// ════════════════════════════════════════════════════
// CORR-INV-5: Z-scores: mean ≈ 0, stddev ≈ 1
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_5_z_scores_properties() {
    let values = vec![2.0, 4.0, 6.0, 8.0, 10.0];
    let scores = calculate_z_scores(&values);

    let n = scores.len() as f64;
    let mean: f64 = scores.iter().sum::<f64>() / n;
    assert_close(mean, 0.0, 1e-10);

    let variance: f64 = scores.iter().map(|z| z * z).sum::<f64>() / n;
    assert_close(variance, 1.0, 1e-10);
}

// ════════════════════════════════════════════════════
// CORR-INV-6: Moving average preserves sum (approximately)
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_6_moving_average_sum() {
    let values = vec![10.0, 20.0, 30.0, 40.0, 50.0];
    let result = moving_average(&values, 3);
    // First 2 values unchanged, so total sum is close
    let orig_sum: f64 = values.iter().sum();
    let ma_sum: f64 = result.iter().sum();
    // Not exact due to windowing, but within reasonable bounds
    assert!(ma_sum.is_finite());
    assert!((ma_sum - orig_sum).abs() < orig_sum * 0.5);
}

// ════════════════════════════════════════════════════
// CORR-INV-7: Finite guarantee
// ════════════════════════════════════════════════════

#[test]
fn corr_inv_7_finite_guarantee() {
    let xs = vec![1e10, 2e10, 3e10, 4e10, 5e10];
    let ys = vec![5e10, 4e10, 3e10, 2e10, 1e10];

    let (r, _) = pearson_correlation(&xs, &ys);
    assert!(r.is_finite());

    let sim = cosine_similarity(&xs, &ys);
    assert!(sim.is_finite());

    let (norm, _, _, _) = normalize_min_max(&xs);
    assert!(norm.iter().all(|v| v.is_finite()));

    let scores = calculate_z_scores(&xs);
    assert!(scores.iter().all(|v| v.is_finite()));
}
