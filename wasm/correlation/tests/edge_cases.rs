//! Edge cases. @contractId ANA-005

use correlation_wasm::correlation::*;

#[test]
fn pearson_single_element() {
    let (r, n) = pearson_correlation(&[1.0], &[2.0]);
    assert_eq!(r, 0.0);
    assert_eq!(n, 1);
}

#[test]
fn pearson_empty() {
    let (r, n) = pearson_correlation(&[], &[]);
    assert_eq!(r, 0.0);
    assert_eq!(n, 0);
}

#[test]
fn pearson_constant_series() {
    let (r, _) = pearson_correlation(&[5.0; 10], &[3.0; 10]);
    assert_eq!(r, 0.0); // no variance
}

#[test]
fn cosine_empty() {
    assert_eq!(cosine_similarity(&[], &[]), 0.0);
}

#[test]
fn cosine_zero_vector() {
    assert_eq!(cosine_similarity(&[0.0, 0.0], &[1.0, 2.0]), 0.0);
}

#[test]
fn normalize_empty() {
    let (vals, _, _, _) = normalize_min_max(&[]);
    assert!(vals.is_empty());
}

#[test]
fn normalize_single() {
    let (vals, _, _, _) = normalize_min_max(&[42.0]);
    assert_eq!(vals[0], 50.0); // midpoint
}

#[test]
fn moving_average_window1() {
    let result = moving_average(&[1.0, 2.0, 3.0], 1);
    assert_eq!(result, vec![1.0, 2.0, 3.0]);
}

#[test]
fn z_scores_empty() {
    assert!(calculate_z_scores(&[]).is_empty());
}

#[test]
fn large_values_finite() {
    let xs: Vec<f64> = (0..100).map(|i| i as f64 * 1e8).collect();
    let ys: Vec<f64> = (0..100).map(|i| i as f64 * 1e8 + 1e6).collect();
    let (r, _) = pearson_correlation(&xs, &ys);
    assert!(r.is_finite());
    assert!(r > 0.99);
}
