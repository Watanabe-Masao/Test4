/// Correlation analysis, normalization, similarity, divergence detection.
///
/// @contractId ANA-005
/// @semanticClass analytic
/// @methodFamily statistical

use crate::utils::safe_divide;

/// Normalization midpoint (default when all values equal).
const NORMALIZATION_MIDPOINT: f64 = 50.0;
/// Normalization scale upper bound (0-100).
const NORMALIZATION_SCALE: f64 = 100.0;

// ── Pearson correlation ──────────────────────────────

/// Pearson product-moment correlation coefficient.
/// Returns (r, n). r ∈ [-1, 1], r=0 when n < 2.
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
    let mean_x = safe_divide(sum_x, n as f64, 0.0);
    let mean_y = safe_divide(sum_y, n as f64, 0.0);

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

    let denom = (var_x * var_y).sqrt();
    let r = safe_divide(cov_xy, denom, 0.0);
    (r.clamp(-1.0, 1.0), n)
}

// ── Cosine similarity ────────────────────────────────

/// Cosine similarity: cos(θ) = (A·B) / (|A| × |B|).
/// Returns 0 for zero vectors.
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

    safe_divide(dot, norm_a.sqrt() * norm_b.sqrt(), 0.0)
}

// ── Min-Max normalization ────────────────────────────

/// Normalize values to 0-100 scale. Constant series → all 50.
pub fn normalize_min_max(values: &[f64]) -> (Vec<f64>, f64, f64, f64) {
    if values.is_empty() {
        return (vec![], 0.0, 0.0, 0.0);
    }

    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    for &v in values {
        if v < min { min = v; }
        if v > max { max = v; }
    }

    let range = max - min;
    if range == 0.0 {
        return (vec![NORMALIZATION_MIDPOINT; values.len()], min, max, 0.0);
    }

    let normalized: Vec<f64> = values
        .iter()
        .map(|v| safe_divide(v - min, range, 0.0) * NORMALIZATION_SCALE)
        .collect();

    (normalized, min, max, range)
}

// ── Divergence detection ─────────────────────────────

/// Detect divergence between two normalized series.
/// Returns flat array: [index, seriesAValue, seriesBValue, divergence, isSignificant (0/1)]
/// per point.
pub fn detect_divergence(
    series_a: &[f64],
    series_b: &[f64],
    threshold: f64,
) -> Vec<f64> {
    let (norm_a, _, _, _) = normalize_min_max(series_a);
    let (norm_b, _, _, _) = normalize_min_max(series_b);
    let n = norm_a.len().min(norm_b.len());

    let mut result = Vec::with_capacity(n * 5);
    for i in 0..n {
        let divergence = (norm_a[i] - norm_b[i]).abs();
        result.push(i as f64);
        result.push(series_a[i]);
        result.push(series_b[i]);
        result.push(divergence);
        result.push(if divergence > threshold { 1.0 } else { 0.0 });
    }
    result
}

// ── Moving average ───────────────────────────────────

/// Moving average with window. First (window-1) values use original value.
pub fn moving_average(values: &[f64], window: usize) -> Vec<f64> {
    if window <= 1 || values.is_empty() {
        return values.to_vec();
    }

    let mut result = Vec::with_capacity(values.len());
    for i in 0..values.len() {
        if i < window - 1 {
            result.push(values[i]);
        } else {
            let mut sum = 0.0;
            for j in (i + 1 - window)..=i {
                sum += values[j];
            }
            result.push(safe_divide(sum, window as f64, 0.0));
        }
    }
    result
}

// ── Z-scores ─────────────────────────────────────────

/// Calculate Z-scores. Returns all 0 when stdDev = 0.
pub fn calculate_z_scores(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return vec![];
    }

    let n = values.len() as f64;
    let sum: f64 = values.iter().sum();
    let mean = safe_divide(sum, n, 0.0);

    let variance: f64 = values.iter().map(|v| (v - mean).powi(2)).sum();
    let std_dev = safe_divide(variance, n, 0.0).sqrt();

    if std_dev == 0.0 {
        return vec![0.0; values.len()];
    }

    values.iter().map(|v| safe_divide(v - mean, std_dev, 0.0)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pearson_perfect_positive() {
        let (r, n) = pearson_correlation(&[1.0, 2.0, 3.0], &[2.0, 4.0, 6.0]);
        assert!((r - 1.0).abs() < 1e-10);
        assert_eq!(n, 3);
    }

    #[test]
    fn pearson_perfect_negative() {
        let (r, _) = pearson_correlation(&[1.0, 2.0, 3.0], &[6.0, 4.0, 2.0]);
        assert!((r - (-1.0)).abs() < 1e-10);
    }

    #[test]
    fn pearson_insufficient_data() {
        let (r, n) = pearson_correlation(&[1.0], &[2.0]);
        assert_eq!(r, 0.0);
        assert_eq!(n, 1);
    }

    #[test]
    fn cosine_identical_vectors() {
        let sim = cosine_similarity(&[1.0, 2.0, 3.0], &[1.0, 2.0, 3.0]);
        assert!((sim - 1.0).abs() < 1e-10);
    }

    #[test]
    fn normalize_constant_series() {
        let (vals, _, _, range) = normalize_min_max(&[5.0, 5.0, 5.0]);
        assert_eq!(range, 0.0);
        assert!(vals.iter().all(|&v| v == 50.0));
    }

    #[test]
    fn z_scores_constant() {
        let scores = calculate_z_scores(&[3.0, 3.0, 3.0]);
        assert!(scores.iter().all(|&v| v == 0.0));
    }
}
