/// Pearson product-moment correlation coefficient.
///
/// r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² × Σ(yi - ȳ)²)
///
/// # Mathematical properties
/// - r ∈ [-1, 1]
/// - r = 1 ↔ perfect positive linear relationship
/// - r = -1 ↔ perfect negative linear relationship
/// - r = 0 ↔ no linear correlation
///
/// # Edge cases
/// - n < 2 → r = 0 (insufficient data)
/// - constant series → r = 0 (zero variance)
pub fn pearson_correlation(xs: &[f64], ys: &[f64]) -> (f64, usize) {
    let n = xs.len().min(ys.len());
    if n < 2 {
        return (0.0, n);
    }

    let mut sum_x = 0.0;
    let mut sum_y = 0.0;
    for i in 0..n {
        sum_x += xs[i];
        sum_y += ys[i];
    }
    let mean_x = sum_x / n as f64;
    let mean_y = sum_y / n as f64;

    let mut cov_xy = 0.0;
    let mut var_x = 0.0;
    let mut var_y = 0.0;
    for i in 0..n {
        let dx = xs[i] - mean_x;
        let dy = ys[i] - mean_y;
        cov_xy += dx * dy;
        var_x += dx * dx;
        var_y += dy * dy;
    }

    let denominator = (var_x * var_y).sqrt();
    if denominator == 0.0 {
        return (0.0, n);
    }

    let r = (cov_xy / denominator).clamp(-1.0, 1.0);
    (r, n)
}

/// Cosine similarity between two vectors.
///
/// cos(θ) = (A·B) / (|A| × |B|)
///
/// # Mathematical properties
/// - Result ∈ [-1, 1] for general vectors, [0, 1] for non-negative vectors
/// - cos(θ) = 1 ↔ parallel vectors (same direction)
/// - cos(θ) = 0 ↔ orthogonal vectors
/// - cos(θ) = -1 ↔ anti-parallel vectors
///
/// # Edge cases
/// - Empty input → 0
/// - Zero vector → 0
pub fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let n = a.len().min(b.len());
    if n == 0 {
        return 0.0;
    }

    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for i in 0..n {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom == 0.0 {
        return 0.0;
    }
    dot / denom
}

/// Min-Max normalization to [0, 100] scale.
///
/// # Mathematical properties
/// - All output values ∈ [0, 100]
/// - Preserves relative ordering
/// - range = 0 → all values = 50 (midpoint)
pub fn normalize_min_max(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return vec![];
    }

    let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let range = max - min;

    if range == 0.0 {
        return values.iter().map(|_| 50.0).collect();
    }

    values.iter().map(|v| (v - min) / range * 100.0).collect()
}

/// Z-score calculation.
///
/// z_i = (x_i - μ) / σ
///
/// # Mathematical properties
/// - Mean of z-scores = 0
/// - StdDev of z-scores = 1 (when σ > 0)
/// - σ = 0 → all z-scores = 0
pub fn calculate_z_scores(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return vec![];
    }

    let n = values.len() as f64;
    let mean = values.iter().sum::<f64>() / n;
    let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n;
    let std_dev = variance.sqrt();

    if std_dev == 0.0 {
        return values.iter().map(|_| 0.0).collect();
    }

    values.iter().map(|v| (v - mean) / std_dev).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOLERANCE: f64 = 1e-10;

    // ── pearson_correlation ──

    #[test]
    fn pearson_perfect_positive() {
        let xs = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let ys = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        let (r, n) = pearson_correlation(&xs, &ys);
        assert!((r - 1.0).abs() < TOLERANCE);
        assert_eq!(n, 5);
    }

    #[test]
    fn pearson_perfect_negative() {
        let xs = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let ys = vec![10.0, 8.0, 6.0, 4.0, 2.0];
        let (r, _) = pearson_correlation(&xs, &ys);
        assert!((r - (-1.0)).abs() < TOLERANCE);
    }

    #[test]
    fn pearson_insufficient_data() {
        let (r, n) = pearson_correlation(&[1.0], &[2.0]);
        assert_eq!(r, 0.0);
        assert_eq!(n, 1);
    }

    #[test]
    fn pearson_constant_series() {
        let xs = vec![5.0, 5.0, 5.0, 5.0];
        let ys = vec![1.0, 2.0, 3.0, 4.0];
        let (r, _) = pearson_correlation(&xs, &ys);
        assert_eq!(r, 0.0);
    }

    #[test]
    fn pearson_result_bounded() {
        // r must be in [-1, 1]
        let xs = vec![1.0, 100.0, -50.0, 999.0, 0.1];
        let ys = vec![-3.0, 42.0, 88.0, -7.0, 15.0];
        let (r, _) = pearson_correlation(&xs, &ys);
        assert!(r >= -1.0 && r <= 1.0);
    }

    // ── cosine_similarity ──

    #[test]
    fn cosine_identical_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let r = cosine_similarity(&a, &a);
        assert!((r - 1.0).abs() < TOLERANCE);
    }

    #[test]
    fn cosine_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let r = cosine_similarity(&a, &b);
        assert!(r.abs() < TOLERANCE);
    }

    #[test]
    fn cosine_zero_vector() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![1.0, 2.0, 3.0];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn cosine_empty() {
        assert_eq!(cosine_similarity(&[], &[]), 0.0);
    }

    // ── normalize_min_max ──

    #[test]
    fn normalize_basic() {
        let result = normalize_min_max(&[0.0, 50.0, 100.0]);
        assert!((result[0] - 0.0).abs() < TOLERANCE);
        assert!((result[1] - 50.0).abs() < TOLERANCE);
        assert!((result[2] - 100.0).abs() < TOLERANCE);
    }

    #[test]
    fn normalize_constant() {
        let result = normalize_min_max(&[5.0, 5.0, 5.0]);
        for v in &result {
            assert!((v - 50.0).abs() < TOLERANCE);
        }
    }

    #[test]
    fn normalize_empty() {
        assert!(normalize_min_max(&[]).is_empty());
    }

    // ── calculate_z_scores ──

    #[test]
    fn z_scores_mean_zero() {
        let values = vec![10.0, 20.0, 30.0, 40.0, 50.0];
        let z = calculate_z_scores(&values);
        let sum: f64 = z.iter().sum();
        assert!(sum.abs() < 1e-8, "mean of z-scores should be ~0, got {sum}");
    }

    #[test]
    fn z_scores_constant_all_zero() {
        let z = calculate_z_scores(&[7.0, 7.0, 7.0]);
        for v in &z {
            assert_eq!(*v, 0.0);
        }
    }

    #[test]
    fn z_scores_empty() {
        assert!(calculate_z_scores(&[]).is_empty());
    }

    // ── Mathematical invariants ──

    #[test]
    fn invariant_pearson_symmetric() {
        let xs = vec![1.0, 3.0, 5.0, 7.0];
        let ys = vec![2.0, 4.0, 1.0, 8.0];
        let (r1, _) = pearson_correlation(&xs, &ys);
        let (r2, _) = pearson_correlation(&ys, &xs);
        assert!((r1 - r2).abs() < TOLERANCE, "Pearson must be symmetric");
    }

    #[test]
    fn invariant_cosine_symmetric() {
        let a = vec![1.0, 3.0, 5.0];
        let b = vec![2.0, 4.0, 1.0];
        let s1 = cosine_similarity(&a, &b);
        let s2 = cosine_similarity(&b, &a);
        assert!((s1 - s2).abs() < TOLERANCE, "Cosine must be symmetric");
    }

    #[test]
    fn invariant_normalize_range() {
        let values = vec![-100.0, 0.0, 50.0, 200.0, 1000.0];
        let result = normalize_min_max(&values);
        for v in &result {
            assert!(*v >= 0.0 && *v <= 100.0, "Normalized values must be in [0, 100]");
        }
    }
}
