//! Cross-validation: TS reference golden fixtures.
//! @contractId ANA-005

use correlation_wasm::correlation::*;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() < tol, "expected {} ≈ {} (diff: {}, tol: {})", a, b, (a - b).abs(), tol);
}

#[test]
fn golden_pearson_positive() {
    let (r, n) = pearson_correlation(&[1.0, 2.0, 3.0, 4.0, 5.0], &[2.0, 4.0, 6.0, 8.0, 10.0]);
    assert_close(r, 1.0, 1e-10);
    assert_eq!(n, 5);
}

#[test]
fn golden_pearson_negative() {
    let (r, _) = pearson_correlation(&[1.0, 2.0, 3.0], &[6.0, 4.0, 2.0]);
    assert_close(r, -1.0, 1e-10);
}

#[test]
fn golden_cosine_orthogonal() {
    let sim = cosine_similarity(&[1.0, 0.0], &[0.0, 1.0]);
    assert_close(sim, 0.0, 1e-10);
}

#[test]
fn golden_normalize_0_to_100() {
    let (vals, min, max, range) = normalize_min_max(&[0.0, 50.0, 100.0]);
    assert_eq!(min, 0.0);
    assert_eq!(max, 100.0);
    assert_eq!(range, 100.0);
    assert_close(vals[0], 0.0, 1e-10);
    assert_close(vals[1], 50.0, 1e-10);
    assert_close(vals[2], 100.0, 1e-10);
}

#[test]
fn golden_moving_average_window3() {
    let result = moving_average(&[1.0, 2.0, 3.0, 4.0, 5.0], 3);
    assert_eq!(result[0], 1.0); // passthrough
    assert_eq!(result[1], 2.0); // passthrough
    assert_close(result[2], 2.0, 1e-10); // (1+2+3)/3
    assert_close(result[3], 3.0, 1e-10); // (2+3+4)/3
    assert_close(result[4], 4.0, 1e-10); // (3+4+5)/3
}

#[test]
fn golden_z_scores_symmetric() {
    let scores = calculate_z_scores(&[1.0, 3.0, 5.0]);
    // mean=3, stddev=sqrt(8/3)≈1.633
    assert_close(scores[0], -scores[2], 1e-10); // symmetric
    assert_close(scores[1], 0.0, 1e-10); // mean → 0
}
